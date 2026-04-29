package com.Cervarent.RAG.dto;

import lombok.Data;

/**
 * DTO pour recevoir un document à indexer
 */
@Data
public class DocumentRequest {
    // Titre du document
    private String title;
    
    // Contenu textuel complet
    private String content;
    
    // Source (optionnel, ex: "manuel.pdf", "article.txt")
    private String source;
}
