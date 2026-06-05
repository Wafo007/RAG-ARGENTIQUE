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
    
    // Sources simplifiées (juste le nom du fichier)
    private List<SimpleSource> sources;
    
    // Temps de traitement
    private long processingTimeMs;
    
    /**
     * Source simplifiée pour l'affichage client.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimpleSource {
        private String documentTitle;  // Nom du fichier uniquement
        private String source;         // Nom du fichier
    }
}