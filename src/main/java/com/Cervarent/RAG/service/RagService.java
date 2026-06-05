package com.Cervarent.RAG.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Service;

import com.Cervarent.RAG.dto.QuestionRequest;
import com.Cervarent.RAG.dto.RagResponse;
import com.Cervarent.RAG.dto.RagLogEntry;
import com.Cervarent.RAG.entity.DocumentChunk;
import com.Cervarent.RAG.repository.DocumentRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {
    
    private final DocumentRepository documentRepository;
    private final EmbeddingService embeddingService;
    private final ChatModel chatModel;
    
    /**
     * Répond à une question en utilisant le RAG.
     * 
     * @param request La question de l'utilisateur
     * @return RagResponse allégée pour le client
     */
    public RagResponse answerQuestion(QuestionRequest request) {
        long startTime = System.currentTimeMillis();
        
        log.info("Traitement de la question: {}", request.getQuestion());
        
        // ÉTAPE 1 : Créer l'embedding de la question
        List<Float> questionEmbedding = embeddingService.embed(request.getQuestion());
        
        // CONVERTIR en String format PostgreSQL vector
        String embeddingString = questionEmbedding.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(",", "[", "]"));
        
        // ÉTAPE 2 : Rechercher les documents similaires
        List<DocumentChunk> relevantChunks = documentRepository.findSimilarDocuments(
            embeddingString, 
            request.getTopK()
        );
        
        log.info("{} documents pertinents trouvés", relevantChunks.size());
        
        if (relevantChunks.isEmpty()) {
            return RagResponse.builder()
                .answer("Je n'ai trouvé aucun document pertinent pour répondre à cette question.")
                .sources(List.of())
                .processingTimeMs(System.currentTimeMillis() - startTime)
                .build();
        }
        
        // ÉTAPE 3 : Construire le contexte (pour le prompt)
        String context = buildContext(relevantChunks);
        
        // ÉTAPE 4 : Générer la réponse
        String systemPrompt = """
            Tu es un assistant intelligent qui répond aux questions en te basant UNIQUEMENT 
            sur les documents fournis dans le contexte ci-dessous.
            
            Règles :
            - Réponds uniquement avec les informations du contexte
            - Si tu ne trouves pas la réponse, dis-le honnêtement
            - Sois concis mais complet
            - Ne mentionne PAS les numéros de chunks ou de documents internes
            - Cite les sources de manière générale (ex: "selon le document sur les SVM")
            
            Contexte des documents :
            %s
            """.formatted(context);
        
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));
        messages.add(new UserMessage(request.getQuestion()));
        
        String answer = chatModel.call(new Prompt(messages))
                .getResult()
                .getOutput()
                .getContent();
        
        long processingTime = System.currentTimeMillis() - startTime;
        
        // ============================================
        // CONSTRUCTION DE LA RÉPONSE CLIENT (allégée)
        // ============================================
        List<RagResponse.SimpleSource> simpleSources = relevantChunks.stream()
            .map(chunk -> RagResponse.SimpleSource.builder()
                .documentTitle(chunk.getDocumentTitle())  // Juste le nom du fichier
                .source(chunk.getSource())                 // Juste le nom du fichier
                .build())
            .distinct()  // Éviter les doublons si plusieurs chunks du même fichier
            .collect(Collectors.toList());
        
        // ============================================
        // LOG DÉTAILLÉ (côté serveur uniquement)
        // ============================================
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
        
        // Écrire dans le log (fichier)
        writeToLogFile(logEntry);
        
        // Log dans la console aussi
        log.debug("Détails RAG - Question: {}, Chunks utilisés: {}, Temps: {}ms", 
            request.getQuestion(), relevantChunks.size(), processingTime);
        
        return RagResponse.builder()
            .answer(answer)
            .sources(simpleSources)
            .processingTimeMs(processingTime)
            .build();
    }
    
    /**
     * Construit le contexte à partir des chunks pour le prompt.
     */
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
    
    /**
     * Écrit les détails dans un fichier log.
     * Le client ne voit JAMAIS ce fichier.
     */
    private void writeToLogFile(RagLogEntry entry) {
        // Format du log : JSON pour faciliter l'analyse
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
        
        // Écrire dans le fichier (append)
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
}