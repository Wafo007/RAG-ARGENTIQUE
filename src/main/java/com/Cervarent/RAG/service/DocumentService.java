package com.Cervarent.RAG.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.Cervarent.RAG.dto.DocumentRequest;
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
    private final JdbcTemplate jdbcTemplate;  // AJOUTER ÇA
    
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
                request.getSource()
            );
            
            log.debug("Chunk {} inséré", i);
        }
        
        log.info("Document indexé: {} chunks", chunks.size());
    }
    
    // getAllChunks() reste avec JPA
    public List<DocumentChunk> getAllChunks() {
        return documentRepository.findAll();
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
}