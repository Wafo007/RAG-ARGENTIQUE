package com.Cervarent.RAG.dto;

/**
 * Projection (interface Spring Data) pour la recherche de similarité avec score.
 *
 * Pourquoi une interface plutôt que de réutiliser l'entité DocumentChunk ?
 * → La requête SQL ajoute une colonne calculée "distance" (la distance cosinus
 *   renvoyée par pgvector) qui n'existe PAS dans la table document_chunks, et
 *   donc pas dans l'entité JPA. Spring Data ne peut pas mapper une colonne
 *   calculée sur une entité @Entity classique. Une interface de projection,
 *   elle, peut exposer n'importe quelle colonne du SELECT — calculée ou non —
 *   simplement en déclarant un getter dont le nom correspond à l'alias SQL.
 */
public interface SimilarChunkProjection {
    Long getId();
    String getDocumentTitle();
    String getContent();
    Integer getChunkIndex();
    String getSource();

    /**
     * Distance cosinus renvoyée par l'opérateur pgvector "<=>" :
     * 0 = vecteurs de direction identique, jusqu'à ~1-2 = très différents.
     * RagService la convertit en score de pertinence (1 - distance) pour l'affichage.
     */
    Double getDistance();
}