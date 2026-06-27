package com.Cervarent.RAG.config;

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
     *
     * CHANGEMENT PHASE 3 : le type de retour est maintenant la classe CONCRÈTE
     * MistralAiChatModel, et non plus l'interface ChatModel.
     *
     * Pourquoi ce changement ?
     * → MistralAiChatModel implémente DEUX interfaces : ChatModel (utilisé pour
     *   les réponses classiques non streamées, via .call()) ET StreamingChatModel
     *   (utilisé pour le streaming token par token, via .stream()).
     * → Si cette méthode déclarait encore "ChatModel" comme type de retour, Spring
     *   enregistrerait le bean sous le type ChatModel uniquement, et il serait
     *   impossible d'injecter un StreamingChatModel ailleurs (dans RagService,
     *   pour le streaming) à partir de ce même bean : Spring ne saurait pas que
     *   ce ChatModel est AUSSI un StreamingChatModel.
     * → En déclarant le type concret, Spring peut satisfaire les injections de
     *   ChatModel, StreamingChatModel ET MistralAiChatModel avec UNE SEULE
     *   instance partagée — pas besoin de deux beans séparés pour la même
     *   configuration (même clé API, même client HTTP sous-jacent).
     */
    @Bean
    public MistralAiChatModel chatModel() {
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