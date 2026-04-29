package com.Cervarent.RAG.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.Cervarent.RAG.dto.DocumentRequest;
import com.Cervarent.RAG.dto.QuestionRequest;
import com.Cervarent.RAG.dto.RagResponse;
import com.Cervarent.RAG.entity.DocumentChunk;
import com.Cervarent.RAG.service.DocumentService;
import com.Cervarent.RAG.service.RagService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Contrôleur REST pour exposer les fonctionnalités du RAG.
 * 
 * Endpoints disponibles :
 * - POST /api/rag/index : Indexer un nouveau document
 * - POST /api/rag/ask : Poser une question
 * - GET /api/rag/documents : Lister tous les chunks indexés
 */
@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")  // Autorise les requêtes cross-origin (pour frontend)
public class RagController {
    
    private final DocumentService documentService;
    private final RagService ragService;
    
    /**
     * Indexe un nouveau document.
     * 
     * Exemple de requête :
     * POST /api/rag/index
     * {
     *   "title": "Guide Spring Boot",
     *   "content": "Spring Boot est un framework Java...",
     *   "source": "guide.pdf"
     * }
     */
    @PostMapping("/index")
    public ResponseEntity<Map<String, String>> indexDocument(@RequestBody DocumentRequest request) {
        documentService.indexDocument(request);
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Document indexé avec succès: " + request.getTitle());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Pose une question au système RAG.
     * 
     * Exemple de requête :
     * POST /api/rag/ask
     * {
     *   "question": "Qu'est-ce que Spring Boot ?",
     *   "topK": 3
     * }
     */
    @PostMapping("/ask")
    public ResponseEntity<RagResponse> askQuestion(@RequestBody QuestionRequest request) {
        RagResponse response = ragService.answerQuestion(request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Récupère tous les chunks indexés (utile pour debug).
     */
    @GetMapping("/documents")
    public ResponseEntity<List<DocumentChunk>> getAllDocuments() {
        return ResponseEntity.ok(documentService.getAllChunks());
    }
    
    /**
     * Endpoint de santé pour vérifier que le service fonctionne.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "RAG Mistral");
        return ResponseEntity.ok(response);
    }
}