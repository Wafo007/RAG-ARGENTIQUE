package com.Cervarent.RAG.controller;

import com.Cervarent.RAG.dto.DocumentRequest;
import com.Cervarent.RAG.dto.DocumentSummary;
import com.Cervarent.RAG.dto.QuestionRequest;
import com.Cervarent.RAG.dto.RagResponse;
import com.Cervarent.RAG.dto.UploadResponse;
import com.Cervarent.RAG.service.DocumentService;
import com.Cervarent.RAG.service.FileUploadService;
import com.Cervarent.RAG.service.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controleur REST principal du RAG.
 *
 * Regroupe : upload de documents, indexation manuelle, question/reponse
 * (bloquant et streaming), bibliotheque documentaire (liste/suppression/
 * mise a jour/telechargement) et suivi de progression d'upload.
 *
 * Toutes les routes ici necessitent d'etre authentifie (voir SecurityConfig) ;
 * seules /api/auth/** et /api/rag/health sont publiques.
 */
@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    private final DocumentService documentService;
    private final RagService ragService;
    private final FileUploadService fileUploadService;

    // ============================================
    // QUESTIONS / REPONSES
    // ============================================

    /** Pose une question au systeme RAG et attend la reponse complete. */
    @PostMapping("/ask")
    public ResponseEntity<RagResponse> askQuestion(@RequestBody QuestionRequest request) {
        return ResponseEntity.ok(ragService.answerQuestion(request));
    }

    /**
     * Pose une question avec reponse en streaming (Server-Sent Events).
     * Le frontend lit ce flux avec fetch() + ReadableStream plutot que
     * l'API EventSource native, car EventSource ne permet pas d'envoyer
     * de corps de requete POST (necessaire pour transmettre la question).
     */
    @PostMapping(value = "/ask/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Object>> askQuestionStream(@RequestBody QuestionRequest request) {
        return ragService.streamAnswer(request);
    }

    // ============================================
    // UPLOAD DE FICHIERS (PDF, TXT, DOCX)
    // ============================================

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<UploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mode", defaultValue = "thinking") String mode) throws IOException {
        return ResponseEntity.ok(fileUploadService.uploadFile(file, mode));
    }

    /** Verifie le statut d'un fichier uploade en mode asynchrone ("instant"). */
    @GetMapping("/files/{fileId}/status")
    public ResponseEntity<UploadResponse> getFileStatus(@PathVariable Long fileId) {
        return ResponseEntity.ok(fileUploadService.getFileStatus(fileId));
    }

    /** Flux SSE de progression d'un upload en cours (page par page, mode "instant"). */
    @GetMapping(value = "/upload/{fileId}/progress", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Object>> getUploadProgress(@PathVariable Long fileId) {
        return fileUploadService.getProgressStream(fileId);
    }

    // ============================================
    // INDEXATION MANUELLE
    // ============================================

    @PostMapping("/index")
    public ResponseEntity<Map<String, String>> indexDocument(@RequestBody DocumentRequest request) {
        documentService.indexDocument(request);
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Document indexé avec succès : " + request.getTitle()));
    }

    // ============================================
    // BIBLIOTHEQUE DOCUMENTAIRE
    // ============================================

    /** Liste des documents indexes (regroupes par source) avec statut/taille/date. */
    @GetMapping("/documents")
    public ResponseEntity<List<DocumentSummary>> getDocumentLibrary() {
        return ResponseEntity.ok(documentService.getDocumentLibrary());
    }

    /** Liste detaillee de tous les chunks (sans les embeddings, trop volumineux). Utile pour le debug. */
    @GetMapping("/documents/chunks")
    public ResponseEntity<?> getAllChunks() {
        return ResponseEntity.ok(documentService.getAllChunks());
    }

    /** Supprime definitivement un document (tous ses chunks) par son nom de source. */
    @DeleteMapping("/documents/{source}")
    public ResponseEntity<Map<String, String>> deleteDocument(@PathVariable String source) {
        try {
            documentService.deleteDocument(source);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Document supprimé : " + source));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Remplace le contenu d'un document existant et le reindexe. */
    @PutMapping("/documents/{source}")
    public ResponseEntity<Map<String, String>> updateDocument(
            @PathVariable String source, @RequestBody DocumentRequest request) {
        documentService.updateDocument(source, request);
        return ResponseEntity.ok(Map.of("status", "success", "message", "Document mis à jour : " + source));
    }

    /**
     * Telecharge le document complet correspondant a une source citee par l'IA.
     *
     * Reconstitue le texte integral a partir de TOUS les chunks de cette
     * source (remis dans l'ordre), contrairement a l'ancien comportement du
     * frontend qui ne telechargeait que l'extrait d'un seul chunk.
     */
    @GetMapping("/documents/{source}/download")
    public ResponseEntity<ByteArrayResource> downloadDocument(@PathVariable String source) {
        try {
            var doc = documentService.getFullDocumentContent(source);

            String fileContent = "Document : " + doc.title() + "\n"
                    + "Source : " + doc.source() + "\n"
                    + "=".repeat(60) + "\n\n"
                    + doc.fullText();

            byte[] bytes = fileContent.getBytes(StandardCharsets.UTF_8);
            ByteArrayResource resource = new ByteArrayResource(bytes);

            String downloadName = sanitizeFileName(doc.title() != null ? doc.title() : source) + ".txt";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.attachment().filename(downloadName, StandardCharsets.UTF_8).build().toString())
                    .contentLength(bytes.length)
                    .body(resource);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Nettoie un nom de fichier des caracteres interdits/speciaux avant telechargement. */
    private String sanitizeFileName(String rawName) {
        String cleaned = rawName.replaceAll("[^a-zA-Z0-9À-ÿ\\s-]", "").trim().replaceAll("\\s+", "_");
        return cleaned.isEmpty() ? "document" : cleaned;
    }

    // ============================================
    // SANTE
    // ============================================

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "RAG Mistral");
        return ResponseEntity.ok(response);
    }
}
