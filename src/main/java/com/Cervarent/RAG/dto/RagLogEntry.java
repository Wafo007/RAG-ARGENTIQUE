package com.Cervarent.RAG.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Entrée de log détaillée pour le RAG.
 * Contient TOUTES les informations techniques (chunks, scores, etc.).
 * NE JAMAIS envoyer au client - usage interne uniquement.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor  // ✅ CORRIGÉ : AllArgsConstructor (pas AllConstructor)
public class RagLogEntry {
    private LocalDateTime timestamp;
    private String question;
    private String answer;
    private long processingTimeMs;
    private int topK;
    private List<ChunkDetail> chunksUsed;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor  // ✅ CORRIGÉ ici aussi
    public static class ChunkDetail {
        private int chunkIndex;
        private String documentTitle;
        private String content;
        private double relevanceScore;
        private String source;
    }
}