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
import com.Cervarent.RAG.entity.DocumentChunk;
import com.Cervarent.RAG.repository.DocumentRepository;

import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {
    
    private final DocumentRepository documentRepository;
    private final EmbeddingService embeddingService;
    private final ChatModel chatModel;
    
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
        
        // ÉTAPE 3 : Construire le contexte
        String context = buildContext(relevantChunks);
        
        // ÉTAPE 4 : Générer la réponse
        String systemPrompt = """
            Tu es un assistant intelligent qui répond aux questions en te basant UNIQUEMENT 
            sur les documents fournis dans le contexte ci-dessous.
            
            Règles :
            - Réponds uniquement avec les informations du contexte
            - Si tu ne trouves pas la réponse, dis-le honnêtement
            - Cite toujours les sources de tes informations
            - Sois concis mais complet
            
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
        
        List<RagResponse.Source> sources = relevantChunks.stream()
            .map(chunk -> RagResponse.Source.builder()
                .documentTitle(chunk.getDocumentTitle())
                .content(chunk.getContent())
                .source(chunk.getSource())
                .relevanceScore(0.0)
                .build())
            .collect(Collectors.toList());
        
        return RagResponse.builder()
            .answer(answer)
            .sources(sources)
            .processingTimeMs(processingTime)
            .build();
    }
    
    private String buildContext(List<DocumentChunk> chunks) {
        StringBuilder context = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            DocumentChunk chunk = chunks.get(i);
            context.append("--- Document ").append(i + 1).append(" ---\n");
            context.append("Titre: ").append(chunk.getDocumentTitle()).append("\n");
            context.append("Source: ").append(chunk.getSource()).append("\n");
            context.append("Contenu: ").append(chunk.getContent()).append("\n\n");
        }
        return context.toString();
    }
}