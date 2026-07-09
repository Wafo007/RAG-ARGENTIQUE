package com.Cervarent.RAG.dto;

import java.time.LocalDateTime;

/** Projection sans l'embedding, pour lister les chunks sans alourdir le transfert reseau */
public interface DocumentChunkLightProjection {
    Long getId();
    String getDocumentTitle();
    String getContent();
    Integer getChunkIndex();
    String getSource();
    LocalDateTime getCreatedAt();
}