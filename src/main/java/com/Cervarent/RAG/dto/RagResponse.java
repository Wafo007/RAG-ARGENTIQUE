package com.Cervarent.RAG.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO pour la réponse du RAG
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagResponse {
    // Réponse générée par l'IA
    private String answer;
    
    // Sources utilisées pour générer la réponse
    private List<Source> sources;
    
    // Temps de traitement en ms
    private long processingTimeMs;
    
    /**
     * Représente une source documentaire
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Source {
        private String documentTitle;
        private String content;
        private String source;
        private double relevanceScore;
    }
}