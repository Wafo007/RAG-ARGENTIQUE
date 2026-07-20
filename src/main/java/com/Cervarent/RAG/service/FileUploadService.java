package com.Cervarent.RAG.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.reader.pdf.config.PdfDocumentReaderConfig;
import org.springframework.core.io.InputStreamResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.Cervarent.RAG.dto.UploadResponse;
import com.Cervarent.RAG.entity.UploadedFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

/**
 * Service responsable de l'upload et de l'indexation de fichiers (PDF, TXT,
 * DOCX).
 * 
 * ARCHITECTURE CLÉ : Traitement par streaming pour les PDF
 * → Au lieu de charger les 52 pages en mémoire d'un coup,
 * on traite 1 page à la fois, on l'indexe, on libère la mémoire.
 * → Cela évite l'OutOfMemoryError même avec des PDF de 100+ pages.
 * 
 * Deux modes :
 * - "thinking" : synchrone, le client attend la fin
 * - "instant" : asynchrone, réponse immédiate, traitement en arrière-plan
 * 
 * Toute la persistance se fait via JdbcTemplate (pas de JPA/Hibernate).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileUploadService {

    // ============================================
    // DÉPENDANCES
    // ============================================

    /** JdbcTemplate pour exécuter du SQL natif sur PostgreSQL */
    private final JdbcTemplate jdbcTemplate;

    /** Service d'embedding Mistral - génère les vecteurs pour le RAG */
    private final EmbeddingService embeddingService;

    /**
     * NOUVEAU : service d'accès à Supabase Storage.
     * Permet de sauvegarder le FICHIER ORIGINAL (pas seulement ses chunks),
     * pour pouvoir ensuite le télécharger ou le prévisualiser tel quel.
     */
    private final SupabaseStorageService supabaseStorageService;

    // ============================================
    // CONSTANTES
    // ============================================

    /**
     * Taille d'un chunk en caractères.
     * 1500 = bon équilibre entre précision et nombre de chunks.
     * Plus petit = plus de chunks = plus de mémoire. Plus grand = moins de
     * contexte.
     */
    private static final int CHUNK_SIZE = 1500;

    /**
     * Chevauchement entre chunks pour garder le contexte.
     * 100 caractères = ~1-2 phrases de chevauchement.
     */
    private static final int CHUNK_OVERLAP = 100;

    /**
     * Taille maximale d'un batch pour l'API Mistral.
     * L'API Mistral supporte jusqu'à ~100 textes par appel,
     * mais on limite à 10 pour ne pas saturer la mémoire.
     */
    private static final int BATCH_SIZE = 10;

    /** Nom du bucket Supabase Storage utilisé (voir application.properties). */
    @org.springframework.beans.factory.annotation.Value("${supabase.storage.bucket}")
    private String storageBucket;

    // ============================================
    // POINT D'ENTRÉE PRINCIPAL
    // ============================================

    /**
     * Reçoit un fichier du client et lance le traitement.
     * 
     * ÉTAPE 1 : Sauvegarde les métadonnées du fichier en base (pas le contenu
     * binaire).
     * ÉTAPE 2 : Route vers le traitement synchrone ou asynchrone.
     * 
     * @param file Le fichier uploadé par le client
     * @param mode "thinking" (synchrone) ou "instant" (asynchrone)
     * @return UploadResponse avec l'ID et le statut
     */
    @Transactional
    public UploadResponse uploadFile(MultipartFile file, String mode) throws IOException {
        log.info("Réception du fichier '{}' ({} octets) en mode '{}'",
                file.getOriginalFilename(), file.getSize(), mode);

        // ÉTAPE 0 (NOUVEAU) : lire les octets bruts UNE SEULE FOIS. On les
        // réutilise à la fois pour l'upload Supabase Storage et pour
        // l'extraction/indexation, afin de ne jamais dépendre d'un second
        // appel à file.getInputStream() (non garanti après la fin de la
        // requête HTTP, notamment en mode asynchrone).
        final byte[] rawBytes = file.getBytes();

        // ÉTAPE 1 (NOUVEAU) : sauvegarder le DOCUMENT ORIGINAL dans Supabase
        // Storage. C'est ce qui manquait : avant, seuls les chunks/embeddings
        // étaient conservés, rendant impossible tout téléchargement ou
        // prévisualisation fidèle du fichier réellement uploadé.
        String storagePath = supabaseStorageService.upload(
                file.getOriginalFilename(), file.getContentType(), rawBytes);

        // ÉTAPE 2 : Sauvegarder les métadonnées, y compris la localisation
        // du fichier original dans le bucket.
        UploadedFile uploadedFile = saveFileMetadata(file, storagePath);
        log.info("Fichier enregistré avec ID: {} (storage: {})", uploadedFile.getId(), storagePath);

        // ÉTAPE 3 : Router vers le bon mode de traitement RAG (inchangé)
        if ("thinking".equalsIgnoreCase(mode)) {
            return processSync(rawBytes, uploadedFile);
        } else {
            return processAsync(rawBytes, uploadedFile);
        }
    }

    // ============================================
    // MODE SYNCHRONE ("thinking")
    // ============================================

    /**
     * Traitement synchrone.
     * Le thread HTTP attend que tout soit terminé avant de répondre.
     * 
     * Pour les PDF : utilise le traitement page par page (streaming).
     * Pour TXT/DOCX : traitement classique (fichiers généralement plus petits).
     */
    private UploadResponse processSync(byte[] rawBytes, UploadedFile uploadedFile) {
        log.info("Mode THINKING démarré pour fichier ID {}", uploadedFile.getId());

        try {
            String contentType = uploadedFile.getContentType();
            String filename = uploadedFile.getFilename();
            Long fileId = uploadedFile.getId();

            int chunksCount;

            // Si c'est un PDF → traitement streaming page par page
            if (isPdf(contentType, filename)) {
                chunksCount = processPdfStreaming(new java.io.ByteArrayInputStream(rawBytes), filename, fileId);
            }
            // Sinon → traitement classique
            else {
                String fullText = extractTextFromStream(
                        new java.io.ByteArrayInputStream(rawBytes), contentType, filename);
                updateFileFields(fileId, "PROCESSING",
                        fullText.substring(0, Math.min(1000, fullText.length())), null, null);
                chunksCount = indexTextToRag(fullText, filename);
            }

            // Finaliser
            updateFileStatus(fileId, "COMPLETED", chunksCount, null);
            log.info("Mode THINKING terminé : {} chunks", chunksCount);

            return buildResponse(uploadedFile, "COMPLETED", chunksCount,
                    "Document indexé avec succès : " + chunksCount + " chunks créés.");

        } catch (Exception e) {
            log.error("Erreur synchrone fichier ID {}", uploadedFile.getId(), e);
            markAsFailed(uploadedFile.getId(), e.getMessage());
            return buildResponse(uploadedFile, "FAILED", null, "Erreur : " + e.getMessage());
        }
    }

    // ============================================
    // MODE ASYNCHRONE ("instant")
    // ============================================

    /**
     * Traitement asynchrone.
     * Répond immédiatement au client, traite en arrière-plan.
     * 
     * Important : on lit les bytes du fichier MAINTENANT car le MultipartFile
     * n'est plus accessible après la fin de la requête HTTP.
     */
    private UploadResponse processAsync(byte[] rawBytes, UploadedFile uploadedFile) {
        log.info("Mode INSTANT lancé pour fichier ID {}", uploadedFile.getId());

        try {
            final String contentType = uploadedFile.getContentType();
            final String filename = uploadedFile.getFilename();
            final Long fileId = uploadedFile.getId();

            // Lancer le traitement dans un thread séparé
            processAsyncTask(fileId, rawBytes, contentType, filename);

            return buildResponse(uploadedFile, "PROCESSING", null,
                    "Fichier reçu. Traitement en arrière-plan. " +
                            "GET /api/rag/files/" + fileId + "/status pour suivre.");

        } catch (Exception e) {
            markAsFailed(uploadedFile.getId(), e.getMessage());

            return buildResponse(uploadedFile, "FAILED", null,
                    "Erreur lecture : " + e.getMessage());
        }
    }

    /**
     * Méthode exécutée dans un thread séparé (@Async).
     * Reçoit les bytes du fichier car le MultipartFile est fermé.
     */
    @Async
    public void processAsyncTask(Long fileId, byte[] fileBytes, String contentType, String filename) {
        log.info("[ASYNC] Démarrage fichier ID {}", fileId);

        try (InputStream inputStream = new java.io.ByteArrayInputStream(fileBytes)) {

            int chunksCount;

            // PDF → streaming page par page
            if (isPdf(contentType, filename)) {
                chunksCount = processPdfStreaming(inputStream, filename, fileId);
            }
            // TXT/DOCX → traitement classique
            else {
                String fullText = extractTextFromStream(inputStream, contentType, filename);
                updateFileStatus(fileId, "PROCESSING", null, null);
                chunksCount = indexTextToRag(fullText, filename);
            }

            updateFileStatus(fileId, "COMPLETED", chunksCount, null);
            log.info("[ASYNC] Terminé fichier ID {} : {} chunks", fileId, chunksCount);

        } catch (Exception e) {
            log.error("[ASYNC] Échec fichier ID {}", fileId, e);
            markAsFailed(fileId, e.getMessage());
        }
    }

    // ============================================
    // TRAITEMENT PDF STREAMING (CLÉ ANTI-MÉMOIRE)
    // ============================================

    /**
     * Traite un PDF page par page sans jamais charger tout le texte en mémoire.
     * 
     * PRINCIPE :
     * 1. Extrait 1 page du PDF
     * 2. Découpe cette page en chunks
     * 3. Vectorise les chunks par batch de 10
     * 4. Insère en base
     * 5. LIBÈRE la mémoire de cette page
     * 6. Passe à la page suivante
     * 
     * @param inputStream Flux du PDF
     * @param source      Nom du fichier (pour la colonne source)
     * @param fileId      ID du fichier (pour mettre à jour le statut)
     * @return Nombre total de chunks insérés
     */
    private int processPdfStreaming(InputStream inputStream, String source, Long fileId) throws IOException {
        log.info("Traitement PDF streaming pour '{}'", source);

        // Configuration de l'extracteur PDF
        InputStreamResource resource = new InputStreamResource(inputStream);
        PdfDocumentReaderConfig config = PdfDocumentReaderConfig.builder()
                .withPageTopMargin(0)
                .withPageBottomMargin(0)
                .build();

        PagePdfDocumentReader pdfReader = new PagePdfDocumentReader(resource, config);
        List<org.springframework.ai.document.Document> pages = pdfReader.get();

        log.info("PDF contient {} pages", pages.size());

        int totalChunks = 0;
        int globalChunkIndex = 0;

        // Traiter chaque page INDIVIDUELLEMENT
        for (int pageNum = 0; pageNum < pages.size(); pageNum++) {
            String pageText = pages.get(pageNum).getContent();

            log.debug("Page {}/{} : {} caracteres", pageNum + 1, pages.size(), pageText.length());

            List<String> pageChunks = splitIntoChunks(pageText);
            globalChunkIndex = indexChunksBatch(pageChunks, source, globalChunkIndex);
            totalChunks += pageChunks.size();

            // NOUVEAU : notifier la progression apres chaque page traitee
            emitProgress(fileId, pageNum + 1, pages.size(), totalChunks);

            pageText = null;
            pageChunks = null;
            System.gc();

            if (pageNum < pages.size() - 1) {
                try {
                    Thread.sleep(200);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        log.info("PDF terminé : {} pages, {} chunks totaux", pages.size(), totalChunks);
        closeProgress(fileId);
        return totalChunks;
    }

    // ============================================
    // INDEXATION DES CHUNKS PAR BATCH
    // ============================================

    /**
     * Indexe une liste de chunks en utilisant l'API Mistral en batch.
     * 
     * @param chunks     Liste de chunks à indexer
     * @param source     Nom du fichier source
     * @param startIndex Index de départ pour la numérotation globale
     * @return Prochain index disponible
     */
    private int indexChunksBatch(List<String> chunks, String source, int startIndex) {
        int batchSize = BATCH_SIZE;

        for (int i = 0; i < chunks.size(); i += batchSize) {
            int end = Math.min(i + batchSize, chunks.size());
            List<String> batch = chunks.subList(i, end);

            // 1 appel API pour tout le batch
            List<List<Float>> embeddings = embeddingService.embedBatch(batch);

            // Insérer chaque chunk du batch
            for (int j = 0; j < batch.size(); j++) {
                insertChunk(source, batch.get(j), startIndex + i + j, embeddings.get(j));
            }

            // Pause mémoire entre batches
            if (end < chunks.size()) {
                System.gc();
                sleep(100);
            }
        }

        return startIndex + chunks.size();
    }

    /**
     * Insère un seul chunk dans document_chunks.
     */
    private void insertChunk(String source, String content, int chunkIndex, List<Float> embedding) {
        String embeddingString = embedding.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(",", "[", "]"));

        String sql = """
                INSERT INTO document_chunks
                (document_title, content, chunk_index, embedding, source, created_at)
                VALUES (?, ?, ?, ?::vector, ?, NOW())
                """;

        jdbcTemplate.update(sql, source, content, chunkIndex, embeddingString, source);
    }

    // ============================================
    // INDEXATION CLASSIQUE (TXT, DOCX)
    // ============================================

    /**
     * Indexe un texte complet (pour TXT et DOCX, fichiers plus petits).
     */
    private int indexTextToRag(String fullText, String source) {
        List<String> chunks = splitIntoChunks(fullText);
        log.info("Texte découpé en {} chunks", chunks.size());
        return indexChunksBatch(chunks, source, 0);
    }

    // ============================================
    // DÉCOUPAGE EN CHUNKS
    // ============================================

    /**
     * Découpe un texte en morceaux de CHUNK_SIZE caractères.
     * Essaye de couper aux points pour ne pas tronquer les phrases.
     */
    private List<String> splitIntoChunks(String text) {
        List<String> chunks = new ArrayList<>();

        if (text == null || text.length() <= CHUNK_SIZE) {
            if (text != null && !text.isEmpty())
                chunks.add(text);
            return chunks;
        }

        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());

            // Chercher un point pour couper proprement
            if (end < text.length()) {
                int lastPeriod = text.lastIndexOf(". ", end);
                if (lastPeriod > start && lastPeriod > end - 100) {
                    end = lastPeriod + 1;
                }
            }

            chunks.add(text.substring(start, end).trim());

            // AVANCER correctement - pas reculer !
            int nextStart = end - CHUNK_OVERLAP;
            if (nextStart <= start) {
                nextStart = end; // Éviter la boucle infinie
            }
            start = nextStart;
        }

        return chunks;
    }

    // ============================================
    // EXTRACTION DE TEXTE
    // ============================================

    /** Vérifie si le fichier est un PDF */
    private boolean isPdf(String contentType, String filename) {
        return "application/pdf".equals(contentType)
                || filename.toLowerCase().endsWith(".pdf");
    }

    /** Dispatcher d'extraction selon le format */
    private String extractTextFromStream(InputStream inputStream, String contentType, String filename)
            throws IOException {
        if (contentType == null)
            contentType = "application/octet-stream";

        if (isPdf(contentType, filename)) {
            // Ne devrait pas arriver ici (PDF traité séparément)
            return extractTextFromPdf(inputStream);
        } else if (contentType.equals("text/plain") || filename.endsWith(".txt")) {
            return extractTextFromTxt(inputStream);
        } else if (filename.endsWith(".docx")) {
            return extractTextFromDocx(inputStream);
        } else {
            throw new IllegalArgumentException("Format non supporté : " + contentType);
        }
    }

    private String extractTextFromPdf(InputStream inputStream) throws IOException {
        InputStreamResource resource = new InputStreamResource(inputStream);
        PdfDocumentReaderConfig config = PdfDocumentReaderConfig.builder()
                .withPageTopMargin(0).withPageBottomMargin(0).build();
        PagePdfDocumentReader reader = new PagePdfDocumentReader(resource, config);
        return reader.get().stream()
                .map(org.springframework.ai.document.Document::getContent)
                .collect(Collectors.joining("\n\n"));
    }

    private String extractTextFromTxt(InputStream inputStream) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }

    private String extractTextFromDocx(InputStream inputStream) throws IOException {
        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            return document.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .filter(t -> !t.trim().isEmpty())
                    .collect(Collectors.joining("\n"));
        }
    }

    // ============================================
    // PERSISTENCE (JdbcTemplate)
    // ============================================

    /**
     * Sauvegarde les métadonnées du fichier, y compris (NOUVEAU) la
     * localisation du document original dans Supabase Storage : c'est cette
     * information (storage_bucket / storage_path / mime_type / extension)
     * qui permet ensuite de le télécharger ou de le prévisualiser tel quel,
     * au lieu de reconstituer un texte approximatif à partir des chunks.
     */
    private UploadedFile saveFileMetadata(MultipartFile file, String storagePath) throws IOException {
        String extension = extractExtension(file.getOriginalFilename());

        String sql = """
                INSERT INTO uploaded_files
                (filename, content_type, file_size, status, created_at,
                 storage_bucket, storage_path, mime_type, extension, updated_at)
                VALUES (?, ?, ?, 'PENDING', NOW(), ?, ?, ?, ?, NOW())
                RETURNING id, filename, content_type, file_size, status,
                          extracted_text, chunks_count, error_message, created_at, completed_at,
                          storage_bucket, storage_path, public_url, mime_type, extension, updated_at
                """;

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> mapFromResultSet(rs),
                file.getOriginalFilename(), file.getContentType(), file.getSize(),
                storageBucket, storagePath, file.getContentType(), extension);
    }

    /** Extrait l'extension d'un nom de fichier (sans le point), en minuscule. */
    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private UploadedFile getFileById(Long fileId) {
        String sql = "SELECT * FROM uploaded_files WHERE id = ?";
        List<UploadedFile> results = jdbcTemplate.query(sql, (rs, rowNum) -> mapFromResultSet(rs), fileId);
        return results.isEmpty() ? null : results.get(0);
    }

    private void updateFileStatus(Long fileId, String status, Integer chunksCount, String errorMessage) {
        String sql = """
                UPDATE uploaded_files
                SET status = ?, chunks_count = ?, error_message = ?, completed_at = NOW()
                WHERE id = ?
                """;
        jdbcTemplate.update(sql, status, chunksCount, errorMessage, fileId);
    }

    private void updateFileFields(Long fileId, String status, String extractedText,
            Integer chunksCount, String errorMessage) {
        String sql = """
                UPDATE uploaded_files
                SET status = ?, extracted_text = ?, chunks_count = ?, error_message = ?
                WHERE id = ?
                """;
        jdbcTemplate.update(sql, status, extractedText, chunksCount, errorMessage, fileId);
    }

    private void markAsFailed(Long fileId, String errorMessage) {
        String sql = "UPDATE uploaded_files SET status = 'FAILED', error_message = ?, completed_at = NOW() WHERE id = ?";
        jdbcTemplate.update(sql, errorMessage, fileId);
    }

    private UploadedFile mapFromResultSet(ResultSet rs) throws SQLException {
        UploadedFile uf = new UploadedFile();
        uf.setId(rs.getLong("id"));
        uf.setFilename(rs.getString("filename"));
        uf.setContentType(rs.getString("content_type"));
        uf.setFileSize(rs.getLong("file_size"));

        // Gérer les colonnes qui peuvent être NULL
        uf.setExtractedText(rs.getObject("extracted_text") != null ? rs.getString("extracted_text") : null);
        uf.setStatus(rs.getString("status"));
        uf.setChunksCount(rs.getObject("chunks_count") != null ? rs.getInt("chunks_count") : 0);
        uf.setErrorMessage(rs.getObject("error_message") != null ? rs.getString("error_message") : null);
        uf.setCreatedAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null);
        uf.setCompletedAt(
                rs.getTimestamp("completed_at") != null ? rs.getTimestamp("completed_at").toLocalDateTime() : null);

        // NOUVEAU : colonnes de localisation Supabase Storage
        uf.setStorageBucket(rs.getString("storage_bucket"));
        uf.setStoragePath(rs.getString("storage_path"));
        uf.setPublicUrl(rs.getString("public_url"));
        uf.setMimeType(rs.getString("mime_type"));
        uf.setExtension(rs.getString("extension"));
        uf.setUpdatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null);
        return uf;
    }

    // ============================================
    // NOUVEAU : ACCES AU FICHIER ORIGINAL PAR NOM
    // ============================================

    /**
     * Retrouve les métadonnées de stockage d'un fichier par son nom
     * (= colonne "source" de document_chunks, puisque l'indexation utilise
     * le nom de fichier original comme identifiant de source).
     *
     * Utilisé par le contrôleur pour le téléchargement/la prévisualisation :
     * s'il existe plusieurs uploads portant le même nom, on prend le plus
     * récent (created_at DESC) pour rester cohérent avec le comportement
     * "un fichier = un nom" déjà utilisé par la bibliothèque documentaire.
     */
    public UploadedFile getFileByFilename(String filename) {
        String sql = "SELECT * FROM uploaded_files WHERE filename = ? ORDER BY created_at DESC LIMIT 1";
        List<UploadedFile> results = jdbcTemplate.query(sql, (rs, rowNum) -> mapFromResultSet(rs), filename);
        return results.isEmpty() ? null : results.get(0);
    }

    // ============================================
    // UTILITAIRES
    // ============================================

    private void sleep(int millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private UploadResponse buildResponse(UploadedFile file, String status, Integer chunksCount, String message) {
        return UploadResponse.builder()
                .fileId(file.getId())
                .filename(file.getFilename())
                .mode(file.getStatus().equals("PENDING") ? "instant" : "thinking")
                .status(status)
                .chunksCount(chunksCount)
                .message(message)
                .createdAt(file.getCreatedAt())
                .build();
    }

    // ============================================
    // ENDPOINT PUBLIC
    // ============================================

    /**
     * Récupère le statut d'un fichier uploadé.
     */
    public UploadResponse getFileStatus(Long fileId) {
        UploadedFile file = getFileById(fileId);
        if (file == null)
            throw new RuntimeException("Fichier ID " + fileId + " non trouvé");

        String message = switch (file.getStatus()) {
            case "PENDING" -> "En attente...";
            case "PROCESSING" -> "Traitement en cours...";
            case "COMPLETED" -> "Terminé : " + file.getChunksCount() + " chunks.";
            case "FAILED" -> "Échec : " + file.getErrorMessage();
            default -> "Statut inconnu";
        };

        return UploadResponse.builder()
                .fileId(file.getId())
                .filename(file.getFilename())
                .mode("instant")
                .status(file.getStatus())
                .chunksCount(file.getChunksCount())
                .message(message)
                .createdAt(file.getCreatedAt())
                .build();
    }

    /**
     * Un "Sink" par fichier en cours de traitement, permettant d'emettre des
     * evenements de progression consommables par le frontend via SSE.
     * Cle = fileId, nettoye automatiquement a la fin du traitement.
     */
    private final ConcurrentHashMap<Long, Sinks.Many<ServerSentEvent<Object>>> progressSinks = new ConcurrentHashMap<>();

    /**
     * Expose le flux de progression d'un fichier en cours de traitement.
     * Appele par le controller pour le endpoint GET
     * /api/rag/upload/{fileId}/progress
     */
    public Flux<ServerSentEvent<Object>> getProgressStream(Long fileId) {
        Sinks.Many<ServerSentEvent<Object>> sink = progressSinks.computeIfAbsent(
                fileId, id -> Sinks.many().multicast().onBackpressureBuffer());
        return sink.asFlux();
    }

    /**
     * Emet un evenement de progression et le loggue ; ignore silencieusement si
     * personne n'ecoute.
     */
    private void emitProgress(Long fileId, int currentPage, int totalPages, int chunksIndexed) {
        Sinks.Many<ServerSentEvent<Object>> sink = progressSinks.get(fileId);
        if (sink != null) {
            var payload = Map.of(
                    "currentPage", currentPage,
                    "totalPages", totalPages,
                    "chunksIndexed", chunksIndexed,
                    "percent", totalPages == 0 ? 0 : Math.round((currentPage * 100.0) / totalPages));
            sink.tryEmitNext(ServerSentEvent.builder((Object) payload).event("progress").build());
        }
    }

    /**
     * Ferme et nettoie le flux de progression a la fin du traitement (succes ou
     * echec).
     */
    private void closeProgress(Long fileId) {
        Sinks.Many<ServerSentEvent<Object>> sink = progressSinks.remove(fileId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
    }
}