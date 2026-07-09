package com.Cervarent.RAG.controller;

// Imports à ajouter en haut du fichier
import org.springframework.web.multipart.MultipartFile;
import com.Cervarent.RAG.dto.UploadResponse;
import com.Cervarent.RAG.service.FileUploadService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.Cervarent.RAG.dto.DocumentRequest;
import com.Cervarent.RAG.dto.QuestionRequest;
import com.Cervarent.RAG.dto.RagResponse;
import com.Cervarent.RAG.entity.DocumentChunk;
import com.Cervarent.RAG.service.DocumentService;
import com.Cervarent.RAG.service.RagService;

import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

import org.springframework.web.multipart.MultipartFile;
import com.Cervarent.RAG.dto.UploadResponse;
import com.Cervarent.RAG.service.FileUploadService;

import org.springframework.http.MediaType;

import com.Cervarent.RAG.dto.DocumentSummary;

import java.io.IOException;
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
// @CrossOrigin(origins = "*") // Autorise les requêtes cross-origin (pour
// frontend)
public class RagController {

    private final DocumentService documentService;
    private final RagService ragService;

    // Injection du service dans le controller
    private final FileUploadService fileUploadService;

    // ============================================
    // UPLOAD DE FICHIERS (PDF, TXT, DOCX)
    // ============================================

    /**
     * Endpoint pour uploader et indexer un fichier.
     * 
     * @param file Le fichier à uploader (multipart/form-data)
     * @param mode "thinking" = synchrone (attend la fin),
     *             "instant" = asynchrone (répond immédiatement)
     * @return UploadResponse avec statut et message
     */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<UploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mode", defaultValue = "thinking") String mode) throws IOException {

        UploadResponse response = fileUploadService.uploadFile(file, mode);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint pour vérifier le statut d'un fichier uploadé en mode "instant".
     * 
     * @param fileId ID du fichier retourné lors de l'upload
     * @return UploadResponse avec le statut actuel
     */
    @GetMapping("/files/{fileId}/status")
    public ResponseEntity<UploadResponse> getFileStatus(@PathVariable Long fileId) {
        UploadResponse response = fileUploadService.getFileStatus(fileId);
        return ResponseEntity.ok(response);
    }

    /**
     * Indexe un nouveau document.
     * 
     * Exemple de requête :
     * POST /api/rag/index
     * {
     * "title": "Guide Spring Boot",
     * "content": "Spring Boot est un framework Java...",
     * "source": "guide.pdf"
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
     * "question": "Qu'est-ce que Spring Boot ?",
     * "topK": 3
     * }
     */
    @PostMapping("/ask")
    public ResponseEntity<RagResponse> askQuestion(@RequestBody QuestionRequest request) {
        RagResponse response = ragService.answerQuestion(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Pose une question au système RAG, avec réponse en streaming (Server-Sent
     * Events).
     *
     * Contrairement à /ask qui attend la réponse complète avant de répondre,
     * cet endpoint envoie la réponse au fur et à mesure qu'elle est générée,
     * via 4 types d'évènements SSE : "sources", "chunk" (répété), "done", "error".
     *
     * Le frontend lit ce flux avec fetch() + un ReadableStream manuel plutôt que
     * l'API EventSource native du navigateur, car EventSource ne permet pas
     * d'envoyer un corps de requête POST (nécessaire ici pour transmettre la
     * question, le topK et l'historique de conversation).
     */
    @PostMapping(value = "/ask/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Object>> askQuestionStream(@RequestBody QuestionRequest request) {
        return ragService.streamAnswer(request);
    }

    /**
     * Récupère tous les chunks indexés (utile pour debug).
     */
    /**
     * Recupere tous les chunks indexes SANS les embeddings (trop volumineux,
     * inutiles pour l'affichage, et source probable du timeout observe avec
     * Supabase). Utiliser /documents/library pour la vue "bibliotheque" normale.
     */
    @GetMapping("/documentst")
    public ResponseEntity<List<Map<String, Object>>> getAllDocuments() {
        List<Map<String, Object>> lightweightChunks = documentService.getAllChunks().stream()
                .map(chunk -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", chunk.getId());
                    map.put("documentTitle", chunk.getDocumentTitle());
                    map.put("content", chunk.getContent());
                    map.put("chunkIndex", chunk.getChunkIndex());
                    map.put("source", chunk.getSource());
                    map.put("createdAt", chunk.getCreatedAt());
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(lightweightChunks);
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

    /**
     * Bibliotheque documentaire : liste des documents indexes avec
     * statut/taille/date.
     */
    @GetMapping("/documents")
    public ResponseEntity<List<DocumentSummary>> getDocumentLibrary() {
        return ResponseEntity.ok(documentService.getDocumentLibrary());
    }

    /**
     * Supprime un document indexe (tous ses chunks) par son nom de source.
     * Exemple : DELETE /api/rag/documents/guide_ethique.pdf
     */
    @DeleteMapping("/documents/{source}")
    public ResponseEntity<Map<String, String>> deleteDocument(@PathVariable String source) {
        try {
            documentService.deleteDocument(source);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Document supprime : " + source));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Met a jour un document existant (remplace son contenu et le reindexe).
     */
    @PutMapping("/documents/{source}")
    public ResponseEntity<Map<String, String>> updateDocument(
            @PathVariable String source, @RequestBody DocumentRequest request) {
        documentService.updateDocument(source, request);
        return ResponseEntity.ok(Map.of("status", "success", "message", "Document mis a jour : " + source));
    }

    /**
     * Flux SSE de progression d'un upload PDF en cours (page par page).
     * Le frontend s'y connecte juste apres avoir recu la reponse de /upload
     * (qui contient le fileId), tant que le statut n'est pas COMPLETED/FAILED.
     */
    @GetMapping(value = "/upload/{fileId}/progress", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Object>> getUploadProgress(@PathVariable Long fileId) {
        return fileUploadService.getProgressStream(fileId);
    }
}