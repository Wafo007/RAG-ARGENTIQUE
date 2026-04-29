package com.Cervarent.RAG.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {
    
    private final EmbeddingModel embeddingModel;
    
    public List<Float> embed(String text) {
        log.debug("Création d'embedding pour: {}", 
            text.substring(0, Math.min(50, text.length())) + "...");
        
        try {
            EmbeddingResponse response = embeddingModel.call(
                new EmbeddingRequest(List.of(text), null)
            );
            
            // Spring AI 1.0.0-M2 retourne float[] (tableau primitif)
            float[] embeddingArray = response.getResults().get(0).getOutput();
            
            // SOLUTION : Boucle manuelle car Arrays.stream(float[]) n'existe pas
            List<Float> embedding = new ArrayList<>(embeddingArray.length);
            for (float value : embeddingArray) {
                embedding.add(value);  // auto-boxing : float -> Float
            }
            
            return embedding;
                    
        } catch (Exception e) {
            log.error("Erreur lors de la création de l'embedding", e);
            throw new RuntimeException("Impossible de créer l'embedding", e);
        }
    }
    
    public String embeddingToString(List<Float> embedding) {
        return embedding.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(",", "[", "]"));
    }
}