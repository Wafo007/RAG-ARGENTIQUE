package com.Cervarent.RAG.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Réponse renvoyée après un upload de fichier.
 * Contient l'ID du fichier, son statut, et un message explicite.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadResponse {
    
    // ID unique du fichier en base
    private Long fileId;
    
    // Nom du fichier traité
    private String filename;
    
    // "thinking" ou "instant"
    private String mode;
    
    // Statut actuel : PENDING, PROCESSING, COMPLETED, FAILED
    private String status;
    
    // Nombre de chunks créés (null si pas encore terminé)
    private Integer chunksCount;
    
    // Message lisible par l'utilisateur
    private String message;
    
    // Date de création
    private LocalDateTime createdAt;
}