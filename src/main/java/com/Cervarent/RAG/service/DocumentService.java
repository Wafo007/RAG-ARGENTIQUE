package com.Cervarent.RAG.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.Cervarent.RAG.dto.DocumentRequest;
import com.Cervarent.RAG.entity.DocumentChunk;
import com.Cervarent.RAG.repository.DocumentRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {
    
    private final DocumentRepository documentRepository;
    private final EmbeddingService embeddingService;
    
    private static final int CHUNK_SIZE = 1000;
    private static final int CHUNK_OVERLAP = 200;
    
    @Transactional
    public void indexDocument(DocumentRequest request) {
        log.info("Indexation du document: {}", request.getTitle());
        
        List<String> chunks = splitIntoChunks(request.getContent());
        log.info("Document découpé en {} chunks", chunks.size());
        
        List<DocumentChunk> documentChunks = new ArrayList<>();
        
        for (int i = 0; i < chunks.size(); i++) {
            String chunkText = chunks.get(i);
            
            // Créer l'embedding (List<Float>)
            List<Float> embeddingList = embeddingService.embed(chunkText);
            
            // CONVERTIR en String format PostgreSQL vector
            String embeddingString = embeddingList.stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(",", "[", "]"));
            
            DocumentChunk docChunk = new DocumentChunk();
            docChunk.setDocumentTitle(request.getTitle());
            docChunk.setContent(chunkText);
            docChunk.setChunkIndex(i);
            docChunk.setEmbedding(embeddingString); // String, pas List
            docChunk.setSource(request.getSource());
            
            documentChunks.add(docChunk);
            
            log.debug("Chunk {} vectorisé", i);
        }
        
        documentRepository.saveAll(documentChunks);
        log.info("Document indexé avec succès: {} chunks sauvegardés", documentChunks.size());
    }
    
    private List<String> splitIntoChunks(String text) {
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
    
    public List<DocumentChunk> getAllChunks() {
        return documentRepository.findAll();
    }
}