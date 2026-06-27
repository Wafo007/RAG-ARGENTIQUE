package com.Cervarent.RAG.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.StreamingChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import com.Cervarent.RAG.dto.ChatTurn;
import com.Cervarent.RAG.dto.QuestionRequest;
import com.Cervarent.RAG.dto.RagResponse;
import com.Cervarent.RAG.dto.RagLogEntry;
import com.Cervarent.RAG.entity.DocumentChunk;
import com.Cervarent.RAG.repository.DocumentRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {

    private final DocumentRepository documentRepository;
    private final EmbeddingService embeddingService;

    // Les deux champs ci-dessous pointent vers LA MÊME instance Spring (le bean
    // MistralAiChatModel défini dans AiConfig), qui implémente les deux
    // interfaces. ChatModel sert à la version classique (answerQuestion),
    // StreamingChatModel sert à la version streamée (streamAnswer).
    private final ChatModel chatModel;
    private final StreamingChatModel streamingChatModel;

    /** Nombre maximum de tours d'historique envoyés au modèle (3 questions + 3 réponses).
     *  Limite volontaire : plus l'historique est long, plus le prompt est gros,
     *  ce qui augmente le coût et la latence de chaque appel à l'IA. */
    private static final int MAX_HISTORY_TURNS = 6;

    // ============================================================
    // VERSION CLASSIQUE (réponse complète d'un seul bloc)
    // ============================================================

    /**
     * Répond à une question en utilisant le RAG (réponse complète, non streamée).
     */
    public RagResponse answerQuestion(QuestionRequest request) {
        long startTime = System.currentTimeMillis();
        log.info("Traitement de la question: {}", request.getQuestion());

        List<DocumentChunk> relevantChunks = searchRelevantChunks(request);
        log.info("{} documents pertinents trouvés", relevantChunks.size());

        if (relevantChunks.isEmpty()) {
            return RagResponse.builder()
                .answer("Je n'ai trouvé aucun document pertinent pour répondre à cette question.")
                .sources(List.of())
                .processingTimeMs(System.currentTimeMillis() - startTime)
                .build();
        }

        String context = buildContext(relevantChunks);
        List<Message> messages = buildMessages(request, context);

        String answer = chatModel.call(new Prompt(messages))
                .getResult()
                .getOutput()
                .getContent();

        long processingTime = System.currentTimeMillis() - startTime;
        List<RagResponse.SimpleSource> simpleSources = toSimpleSources(relevantChunks);

        logQuery(request, answer, processingTime, relevantChunks);

        return RagResponse.builder()
            .answer(answer)
            .sources(simpleSources)
            .processingTimeMs(processingTime)
            .build();
    }

    // ============================================================
    // VERSION STREAMING (phase 3) — Server-Sent Events
    // ============================================================

    /**
     * Répond à une question en streaming : la réponse est envoyée fragment par
     * fragment au fur et à mesure de sa génération par l'IA, via 4 types
     * d'évènements SSE :
     * - "sources" : la liste des documents utilisés (envoyée en premier, en un seul évènement)
     * - "chunk"   : un fragment de texte de la réponse (envoyé plusieurs fois)
     * - "done"    : signale la fin du flux, avec le temps de traitement total
     * - "error"   : en cas de problème pendant la recherche ou la génération
     *
     * Important : la recherche de documents pertinents (embedding + requête
     * pgvector) reste un appel BLOQUANT classique, exécuté avant de construire
     * le Flux — seule la génération de texte par l'IA est réellement streamée.
     * Cela évite de mélanger du code bloquant à l'intérieur d'un pipeline
     * réactif, ce qui est une mauvaise pratique en programmation reactive.
     */
    public Flux<ServerSentEvent<Object>> streamAnswer(QuestionRequest request) {
        long startTime = System.currentTimeMillis();
        log.info("Traitement (streaming) de la question: {}", request.getQuestion());

        final List<DocumentChunk> relevantChunks;
        try {
            relevantChunks = searchRelevantChunks(request);
        } catch (Exception e) {
            log.error("Erreur lors de la recherche de documents pertinents", e);
            return Flux.just(errorEvent("Impossible de rechercher les documents pertinents."));
        }

        log.info("{} documents pertinents trouvés (streaming)", relevantChunks.size());

        if (relevantChunks.isEmpty()) {
            long processingTime = System.currentTimeMillis() - startTime;
            return Flux.just(
                sourcesEvent(List.of()),
                chunkEvent("Je n'ai trouvé aucun document pertinent pour répondre à cette question."),
                doneEvent(processingTime)
            );
        }

        String context = buildContext(relevantChunks);
        List<Message> messages = buildMessages(request, context);
        List<RagResponse.SimpleSource> simpleSources = toSimpleSources(relevantChunks);

        // Accumulateur du texte complet de la réponse, rempli au fil du streaming,
        // pour pouvoir logguer la réponse ENTIÈRE une fois le flux terminé (comme
        // le fait déjà la version classique via logQuery()).
        StringBuilder fullAnswer = new StringBuilder();

        Flux<ServerSentEvent<Object>> sourceEvent = Flux.just(sourcesEvent(simpleSources));

        Flux<ServerSentEvent<Object>> answerChunks = streamingChatModel.stream(new Prompt(messages))
            // Chaque ChatResponse représente UN fragment de la réponse (pas la
            // réponse cumulée) pour la plupart des providers Spring AI, dont
            // Mistral. Si jamais ce n'était pas le cas avec ta version exacte
            // (réponse qui se répète/se duplique côté frontend), il suffirait
            // de calculer le delta soi-même en gardant le texte précédent.
            .map(chatResponse -> chatResponse.getResult() == null || chatResponse.getResult().getOutput() == null
                ? ""
                : chatResponse.getResult().getOutput().getContent())
            .filter(delta -> delta != null && !delta.isEmpty())
            .doOnNext(fullAnswer::append)
            .map(this::chunkEvent);

        // Flux.defer() : le contenu n'est calculé qu'au moment où ce Flux est
        // réellement consommé (donc APRÈS que answerChunks soit terminé et que
        // fullAnswer contienne le texte complet) — indispensable pour logguer
        // la bonne valeur de processingTime et de la réponse complète.
        Flux<ServerSentEvent<Object>> finalEvent = Flux.defer(() -> {
            long processingTime = System.currentTimeMillis() - startTime;
            logQuery(request, fullAnswer.toString(), processingTime, relevantChunks);
            return Flux.just(doneEvent(processingTime));
        });

        return Flux.concat(sourceEvent, answerChunks, finalEvent)
            .onErrorResume(ex -> {
                log.error("Erreur pendant le streaming de la réponse IA", ex);
                return Flux.just(errorEvent("Une erreur est survenue pendant la génération de la réponse."));
            });
    }

    // ============================================================
    // LOGIQUE PARTAGÉE entre les deux versions (DRY)
    // ============================================================

    /** Étapes 1 et 2 communes : vectoriser la question puis chercher les chunks similaires */
    private List<DocumentChunk> searchRelevantChunks(QuestionRequest request) {
        List<Float> questionEmbedding = embeddingService.embed(request.getQuestion());
        String embeddingString = embeddingService.embeddingToString(questionEmbedding);
        return documentRepository.findSimilarDocuments(embeddingString, request.getTopK());
    }

    /**
     * Construit la liste de messages envoyée au modèle : le prompt système
     * (avec le contexte documentaire), puis l'historique de la conversation
     * (limité à MAX_HISTORY_TURNS), puis la question actuelle.
     *
     * C'est ICI que la mémoire conversationnelle de la phase 3 est branchée :
     * avant, seul un SystemMessage + la question actuelle étaient envoyés.
     */
    private List<Message> buildMessages(QuestionRequest request, String context) {
        String systemPrompt = """
            Tu es un assistant intelligent qui répond aux questions en te basant UNIQUEMENT
            sur les documents fournis dans le contexte ci-dessous, et sur l'historique de la
            conversation pour comprendre le fil des échanges (ex: une question de relance
            comme "et pour les autres axes ?" qui se réfère à un message précédent).

            Règles :
            - Réponds uniquement avec les informations du contexte documentaire
            - Si tu ne trouves pas la réponse, dis-le honnêtement
            - Sois concis mais complet
            - Ne mentionne PAS les numéros de chunks ou de documents internes
            - Cite les sources de manière générale (ex: "selon le document sur les SVM")

            Contexte des documents :
            %s
            """.formatted(context);

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));

        List<ChatTurn> history = request.getHistory() == null ? List.of() : request.getHistory();
        int fromIndex = Math.max(0, history.size() - MAX_HISTORY_TURNS);
        for (ChatTurn turn : history.subList(fromIndex, history.size())) {
            if ("assistant".equalsIgnoreCase(turn.getRole())) {
                messages.add(new AssistantMessage(turn.getContent()));
            } else {
                messages.add(new UserMessage(turn.getContent()));
            }
        }

        messages.add(new UserMessage(request.getQuestion()));
        return messages;
    }

    /** Construit le contexte à partir des chunks pour le prompt. */
    private String buildContext(List<DocumentChunk> chunks) {
        StringBuilder context = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            DocumentChunk chunk = chunks.get(i);
            context.append("--- Extrait ").append(i + 1).append(" ---\n");
            context.append("Source: ").append(chunk.getSource()).append("\n");
            context.append("Contenu: ").append(chunk.getContent()).append("\n\n");
        }
        return context.toString();
    }

    /** Transforme les chunks bruts en sources allégées pour le client (sans doublons) */
    private List<RagResponse.SimpleSource> toSimpleSources(List<DocumentChunk> chunks) {
        return chunks.stream()
            .map(chunk -> RagResponse.SimpleSource.builder()
                .documentTitle(chunk.getDocumentTitle())
                .source(chunk.getSource())
                .build())
            .distinct()
            .collect(Collectors.toList());
    }

    /** Construit l'entrée de log détaillée et l'écrit dans le fichier (côté serveur uniquement) */
    private void logQuery(QuestionRequest request, String answer, long processingTime, List<DocumentChunk> relevantChunks) {
        RagLogEntry logEntry = RagLogEntry.builder()
            .timestamp(LocalDateTime.now())
            .question(request.getQuestion())
            .answer(answer)
            .processingTimeMs(processingTime)
            .topK(request.getTopK())
            .chunksUsed(relevantChunks.stream()
                .map(chunk -> RagLogEntry.ChunkDetail.builder()
                    .chunkIndex(chunk.getChunkIndex())
                    .documentTitle(chunk.getDocumentTitle())
                    .content(chunk.getContent())
                    .source(chunk.getSource())
                    .build())
                .collect(Collectors.toList()))
            .build();

        writeToLogFile(logEntry);
        log.debug("Détails RAG - Question: {}, Chunks utilisés: {}, Temps: {}ms",
            request.getQuestion(), relevantChunks.size(), processingTime);
    }

    /** Écrit les détails dans un fichier log. Le client ne voit JAMAIS ce fichier. */
    private void writeToLogFile(RagLogEntry entry) {
        String logLine = String.format(
            "[%s] QUESTION: \"%s\" | CHUNKS: %d | TEMPS: %dms | TOPK: %d%n" +
            "CHUNKS_DETAILS: %s%n" +
            "REPONSE: \"%s\"%n" +
            "---%n",
            entry.getTimestamp(),
            entry.getQuestion().replace("\"", "\\\""),
            entry.getChunksUsed().size(),
            entry.getProcessingTimeMs(),
            entry.getTopK(),
            entry.getChunksUsed().stream()
                .map(c -> String.format("[Chunk#%d] %s: %.100s...",
                    c.getChunkIndex(), c.getSource(), c.getContent()))
                .collect(Collectors.joining(" | ")),
            entry.getAnswer().replace("\n", " ").substring(0, Math.min(200, entry.getAnswer().length()))
        );

        try {
            java.nio.file.Files.writeString(
                java.nio.file.Path.of("rag-queries.log"),
                logLine,
                java.nio.file.StandardOpenOption.CREATE,
                java.nio.file.StandardOpenOption.APPEND
            );
        } catch (Exception e) {
            log.error("Impossible d'écrire dans le fichier log", e);
        }
    }

    // ============================================================
    // Constructeurs d'évènements SSE (évite de répéter
    // ServerSentEvent.builder(...).event(...).build() partout)
    // ============================================================

    private ServerSentEvent<Object> sourcesEvent(List<RagResponse.SimpleSource> sources) {
        return ServerSentEvent.<Object>builder(sources).event("sources").build();
    }

    private ServerSentEvent<Object> chunkEvent(String textDelta) {
        return ServerSentEvent.<Object>builder(textDelta).event("chunk").build();
    }

    private ServerSentEvent<Object> doneEvent(long processingTimeMs) {
        return ServerSentEvent.<Object>builder(Map.of("processingTimeMs", processingTimeMs)).event("done").build();
    }

    private ServerSentEvent<Object> errorEvent(String message) {
        return ServerSentEvent.<Object>builder(message).event("error").build();
    }
}