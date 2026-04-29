package com.Cervarent.RAG.config;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.mistralai.MistralAiChatModel;
import org.springframework.ai.mistralai.MistralAiEmbeddingModel;
import org.springframework.ai.mistralai.api.MistralAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration des clients Spring AI pour Mistral.
 * Utilise la nouvelle API unifiée de Spring AI 1.0.0-M2.
 */
@Configuration
public class AiConfig {
    
    @Value("${spring.ai.mistralai.api-key}")
    private String apiKey;
    
    /**
     * Configure le modèle de chat Mistral.
     * Utilise directement l'API Mistral (pas OpenAI-compatible).
     */
    @Bean
    public ChatModel chatModel() {
        MistralAiApi mistralAiApi = new MistralAiApi(apiKey);
        return new MistralAiChatModel(mistralAiApi);
    }
    
    /**
     * Configure le modèle d'embedding Mistral.
     */
    @Bean
    public EmbeddingModel embeddingModel() {
        MistralAiApi mistralAiApi = new MistralAiApi(apiKey);
        return new MistralAiEmbeddingModel(mistralAiApi);
    }
}