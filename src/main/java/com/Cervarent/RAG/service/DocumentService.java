package com.Cervarent.RAG.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.Cervarent.RAG.dto.DocumentRequest;
import com.Cervarent.RAG.dto.DocumentSummary;
import com.Cervarent.RAG.entity.DocumentChunk;
import com.Cervarent.RAG.repository.DocumentRepository;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final EmbeddingService embeddingService;
    private final JdbcTemplate jdbcTemplate; // AJOUTER ÇA

    private static final int CHUNK_SIZE = 1000;
    private static final int CHUNK_OVERLAP = 200;

    @Transactional
    public void indexDocument(DocumentRequest request) {
        log.info("Indexation du document: {}", request.getTitle());

        List<String> chunks = splitIntoChunks(request.getContent());
        log.info("Document découpé en {} chunks", chunks.size());

        for (int i = 0; i < chunks.size(); i++) {
            String chunkText = chunks.get(i);
            List<Float> embeddingList = embeddingService.embed(chunkText);

            // String format [x,y,z] — comme avant
            String embeddingString = embeddingList.stream()
                    .map(String::valueOf)
                    .collect(java.util.stream.Collectors.joining(",", "[", "]"));

            // INSERT avec CAST forcé
            String sql = """
                    INSERT INTO document_chunks
                    (document_title, content, chunk_index, embedding, source, created_at)
                    VALUES (?, ?, ?, ?::vector, ?, NOW())
                    """;

            jdbcTemplate.update(sql,
                    request.getTitle(),
                    chunkText,
                    i,
                    embeddingString,
                    request.getSource());

            log.debug("Chunk {} inséré", i);
        }

        log.info("Document indexé: {} chunks", chunks.size());
    }

    // getAllChunks() reste avec JPA
    public List<com.Cervarent.RAG.dto.DocumentChunkLightProjection> getAllChunks() {
        return documentRepository.findAllLight();
    }

    private List<String> splitIntoChunks(String text) {
        // ... votre code existant ...
        List<String> chunks = new ArrayList<>();
        if (text.length() <= CHUNK_SIZE) {
            chunks.add(text);
            return chunks;
        }
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());
            if (end < text.length()) {
                int lastPeriod = text.lastIndexOf(". ", end);
                if (lastPeriod > start && lastPeriod > end - 100) {
                    end = lastPeriod + 1;
                }
            }
            chunks.add(text.substring(start, end).trim());
            start = end - CHUNK_OVERLAP;
        }
        return chunks;
    }

    /**
     * Renvoie la liste des documents indexes, regroupes par source, pour la
     * vue "bibliotheque documentaire" du frontend.
     */
    public List<DocumentSummary> getDocumentLibrary() {
        return documentRepository.findDocumentSummaries().stream()
                .map(p -> DocumentSummary.builder()
                        .source(p.getSource())
                        .documentTitle(p.getDocumentTitle())
                        .chunksCount(p.getChunksCount())
                        .totalCharacters(p.getTotalCharacters())
                        .addedAt(p.getAddedAt())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Supprime completement un document (tous ses chunks) de l'index.
     * 
     * @throws RuntimeException si aucun document ne correspond a ce "source"
     */
    @Transactional
    public void deleteDocument(String source) {
        int deletedCount = documentRepository.deleteBySource(source);
        if (deletedCount == 0) {
            throw new RuntimeException("Aucun document trouve avec la source : " + source);
        }
        log.info("Document '{}' supprime ({} chunks retires de l'index)", source, deletedCount);
    }

    /**
     * "Met a jour" un document : en pratique, on supprime l'ancienne version
     * puis on reindexe le nouveau contenu. Plus simple et plus fiable que
     * d'essayer de faire un diff chunk par chunk.
     */
    @Transactional
    public void updateDocument(String source, DocumentRequest newContent) {
        documentRepository.deleteBySource(source); // pas d'erreur si 0 supprime (cas "creation")
        newContent.setSource(source);
        indexDocument(newContent);
        log.info("Document '{}' mis a jour ({} nouveaux chunks)", source,
                splitIntoChunks(newContent.getContent()).size());
    }

    /**
     * Reconstitue le texte complet d'un document a partir de tous ses chunks,
     * remis dans l'ordre (chunk_index croissant).
     *
     * Corrige le bug de telechargement des sources : auparavant, le bouton
     * "Telecharger" du frontend ne telechargeait que l'extrait (excerpt) du
     * SEUL chunk cite par l'IA dans sa reponse, c'est a dire un fragment de
     * quelques centaines de caracteres, pas le document reel. Desormais, on
     * recupere TOUS les chunks appartenant a la meme source et on les
     * recolle dans l'ordre, pour obtenir une reconstitution fidele du
     * document original tel qu'il a ete indexe.
     *
     * @param source identifiant du document (nom de fichier ou libelle fourni a l'indexation)
     * @throws RuntimeException si aucun chunk ne correspond a cette source
     */
    public DocumentContent getFullDocumentContent(String source) {
        List<DocumentChunk> chunks = documentRepository.findBySourceOrderByChunkIndexAsc(source);

        if (chunks.isEmpty()) {
            throw new RuntimeException("Aucun document trouve avec la source : " + source);
        }

        String fullText = chunks.stream()
                .map(DocumentChunk::getContent)
                .collect(java.util.stream.Collectors.joining("\n\n"));

        String title = chunks.get(0).getDocumentTitle();

        return new DocumentContent(title, source, fullText);
    }

    /** Petit porteur de donnees pour le telechargement (titre + source + texte complet reconstitue). */
    public record DocumentContent(String title, String source, String fullText) {
    }
}