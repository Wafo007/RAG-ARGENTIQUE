package com.Cervarent.RAG.dto;

import java.time.LocalDateTime;

/**
 * Projection pour la requete SQL agregee findDocumentSummaries().
 * Meme principe que SimilarChunkProjection : necessaire car les colonnes
 * calculees (COUNT, SUM, MIN) n'existent pas dans l'entite DocumentChunk.
 */
public interface DocumentSummaryProjection {
    String getSource();
    String getDocumentTitle();
    Integer getChunksCount();
    Long getTotalCharacters();
    LocalDateTime getAddedAt();
}