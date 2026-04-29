package com.Cervarent.RAG.dto;

import lombok.Data;

/**
 * DTO pour recevoir une question de l'utilisateur
 */
@Data
public class QuestionRequest {
    // La question posée par l'utilisateur
    private String question;
    
    // Nombre de documents à récupérer (défaut: 3)
    private Integer topK = 3;
}
