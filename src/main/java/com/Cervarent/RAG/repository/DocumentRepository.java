package com.Cervarent.RAG.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.Cervarent.RAG.dto.SimilarChunkProjection;
import com.Cervarent.RAG.entity.DocumentChunk;

import java.util.List;

/**
 * Repository pour accéder aux chunks de documents.
 * JpaRepository fournit déjà les méthodes CRUD de base (save, findAll, etc.)
 */
@Repository
public interface DocumentRepository extends JpaRepository<DocumentChunk, Long> {

    /**
     * Recherche les chunks les plus similaires à un vecteur donné.
     * Utilise l'opérateur "<=>" de pgvector, qui calcule la DISTANCE COSINUS
     * (et non la distance euclidienne, comme l'indiquait par erreur un
     * précédent commentaire ici — correction au passage). Plus la distance
     * est petite, plus les vecteurs sont similaires (0 = direction identique).
     *
     * Conservée pour compatibilité ; RagService utilise désormais
     * findSimilarDocumentsWithScore ci-dessous, qui renvoie en plus le score.
     */
    @Query(value = """
        SELECT * FROM document_chunks 
        ORDER BY embedding <=> CAST(:embedding AS vector) 
        LIMIT :limit
        """, nativeQuery = true)
    List<DocumentChunk> findSimilarDocuments(
        @Param("embedding") String embedding,
        @Param("limit") int limit
    );

    /**
     * Identique à findSimilarDocuments, mais renvoie EN PLUS la distance
     * cosinus calculée par pgvector pour chaque chunk (alias SQL "distance").
     *
     * @param embedding Le vecteur de recherche
     * @param limit Nombre de résultats à retourner
     * @return Liste des chunks les plus pertinents, avec leur score de distance
     */
    @Query(value = """
        SELECT id,
               document_title AS documentTitle,
               content,
               chunk_index AS chunkIndex,
               source,
               embedding <=> CAST(:embedding AS vector) AS distance
        FROM document_chunks
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<SimilarChunkProjection> findSimilarDocumentsWithScore(
        @Param("embedding") String embedding,
        @Param("limit") int limit
    );

    /**
     * Recherche par similarité avec seuil de distance maximum
     * Permet de filtrer les résultats peu pertinents
     */
    @Query(value = """
        SELECT * FROM document_chunks 
        WHERE embedding <=> CAST(:embedding AS vector) < :maxDistance
        ORDER BY embedding <=> CAST(:embedding AS vector) 
        LIMIT :limit
        """, nativeQuery = true)
    List<DocumentChunk> findSimilarDocumentsWithThreshold(
        @Param("embedding") String embedding,
        @Param("maxDistance") double maxDistance,
        @Param("limit") int limit
    );
}