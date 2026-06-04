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
}