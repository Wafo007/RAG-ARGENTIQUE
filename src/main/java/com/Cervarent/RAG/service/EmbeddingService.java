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

/**
 * Service d'embedding Mistral.
 * Génère les vecteurs numériques pour le RAG.
 * 
 * Deux modes :
 * - embed() : 1 texte = 1 appel API (pour les questions utilisateur)
 * - embedBatch() : N textes = 1 appel API (pour l'indexation de documents)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {
    
    private final EmbeddingModel embeddingModel;
    
    /** Taille maximale d'un batch pour l'API Mistral */
    private static final int MAX_BATCH_SIZE = 10;

    /**
     * Crée un embedding pour UN SEUL texte.
     * Utilisé pour la question de l'utilisateur (1 appel rapide).
     * 
     * @param text Texte à vectoriser
     * @return Liste de 1024 floats (vecteur Mistral)
     */
    public List<Float> embed(String text) {
        log.debug("Création d'embedding pour: {}", 
            text.substring(0, Math.min(50, text.length())) + "...");
        
        try {
            EmbeddingResponse response = embeddingModel.call(
                new EmbeddingRequest(List.of(text), null)
            );
            
            // Spring AI 1.0.0-M2 retourne float[] (tableau primitif)
            float[] embeddingArray = response.getResults().get(0).getOutput();
            
            // Conversion float[] → List<Float> (auto-boxing)
            List<Float> embedding = new ArrayList<>(embeddingArray.length);
            for (float value : embeddingArray) {
                embedding.add(value);
            }
            
            return embedding;
                    
        } catch (Exception e) {
            log.error("Erreur lors de la création de l'embedding", e);
            throw new RuntimeException("Impossible de créer l'embedding", e);
        }
    }

    /**
     * Crée des embeddings pour PLUSIEURS textes en UN SEUL appel API.
     * C'est la méthode clé pour l'indexation de documents volumineux.
     * 
     * Pourquoi c'est mieux ?
     * → 1 appel API pour 10 chunks au lieu de 10 appels séparés
     * → 10x moins de connexions HTTP ouvertes
     * → 10x moins de mémoire consommée
     * → 10x plus rapide
     * 
     * @param texts Liste de textes à vectoriser (max 10 éléments)
     * @return Liste de vecteurs, dans le même ordre que les textes
     */
    public List<List<Float>> embedBatch(List<String> texts) {
        if (texts.size() > MAX_BATCH_SIZE) {
            throw new IllegalArgumentException(
                "Batch trop grand : " + texts.size() + " > max " + MAX_BATCH_SIZE
            );
        }
        
        log.debug("Création d'embeddings batch pour {} textes", texts.size());
        
        try {
            EmbeddingResponse response = embeddingModel.call(
                new EmbeddingRequest(texts, null)
            );
            
            // Récupérer tous les résultats
            List<List<Float>> embeddings = new ArrayList<>();
            for (var result : response.getResults()) {
                float[] embeddingArray = result.getOutput();
                
                // Conversion float[] → List<Float>
                List<Float> embedding = new ArrayList<>(embeddingArray.length);
                for (float value : embeddingArray) {
                    embedding.add(value);
                }
                embeddings.add(embedding);
            }
            
            log.debug("Batch terminé : {} embeddings générés", embeddings.size());
            return embeddings;
            
        } catch (Exception e) {
            log.error("Erreur lors du batch embedding", e);
            throw new RuntimeException("Impossible de créer les embeddings batch", e);
        }
    }

    /**
     * Convertit un embedding List<Float> en String format PostgreSQL vector.
     * Exemple : [0.1, 0.2, 0.3, ...]
     * 
     * @param embedding Liste de floats
     * @return String format vector PostgreSQL
     */
    public String embeddingToString(List<Float> embedding) {
        return embedding.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(",", "[", "]"));
    }
}