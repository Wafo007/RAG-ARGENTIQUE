package com.Cervarent.RAG.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Réponse RAG envoyée au CLIENT.
 * Version allégée sans détails techniques.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagResponse {
    // Réponse générée par l'IA
    private String answer;

    // Sources enrichies (nom de fichier + extrait + score de pertinence)
    private List<SimpleSource> sources;

    // Temps de traitement
    private long processingTimeMs;

    /**
     * Source enrichie pour l'affichage client.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimpleSource {
        private String documentTitle;  // Nom du fichier uniquement
        private String source;         // Nom du fichier

        /**
         * Extrait du chunk effectivement utilisé pour générer la réponse
         * (le texte brut indexé). Permet à l'utilisateur de vérifier lui-même
         * ce que l'IA a "lu" avant de répondre, plutôt que de lui faire
         * confiance à l'aveugle.
         */
        private String excerpt;

        /**
         * Score de pertinence entre 0 et 1 (1 = très pertinent), calculé à
         * partir de la distance cosinus pgvector : score = 1 - distance.
         * Affiché côté client comme un pourcentage ("82% pertinent").
         */
        private double relevanceScore;
    }
}