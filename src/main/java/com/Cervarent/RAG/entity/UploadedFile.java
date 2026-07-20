package com.Cervarent.RAG.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * POJO simple représentant un fichier uploadé.
 * PAS une entité JPA - la persistance se fait via JdbcTemplate.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UploadedFile {
    private Long id;
    private String filename;
    private String contentType;
    private Long fileSize;
    //private byte[] fileData;
    private String extractedText;
    private String status;
    private Integer chunksCount;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    // ============================================
    // NOUVEAU : localisation du document ORIGINAL
    // dans Supabase Storage (voir SupabaseStorageService).
    // ============================================
    /** Nom du bucket Supabase (ex: "documents"). */
    private String storageBucket;
    /** Chemin relatif dans le bucket (ex: "3f1e.../rapport.pdf"). */
    private String storagePath;
    /** Dernière URL signée générée pour ce fichier (mise en cache, peut expirer). */
    private String publicUrl;
    /** Type MIME précis du fichier original (ex: "application/pdf"). */
    private String mimeType;
    /** Extension normalisée sans le point (ex: "pdf", "docx", "txt", "png"). */
    private String extension;
    /** Date de dernière mise à jour de la ligne. */
    private LocalDateTime updatedAt;
}