package com.Cervarent.RAG.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO pour recevoir une question de l'utilisateur.
 */
@Data
public class QuestionRequest {
    // La question posée par l'utilisateur
    private String question;

    // Nombre de documents à récupérer (défaut: 3)
    private Integer topK = 3;

    /**
     * Historique de la conversation en cours, du plus ancien au plus récent,
     * SANS la question actuelle (qui est déjà dans le champ "question" ci-dessus).
     *
     * Ajouté en phase 3 pour donner une mémoire conversationnelle au modèle :
     * avant cet ajout, chaque question était traitée de façon totalement isolée
     * et le modèle ne savait jamais ce qui avait été demandé/répondu juste avant.
     * Champ optionnel (liste vide par défaut) pour rester rétro-compatible avec
     * d'éventuels anciens appels qui ne l'enverraient pas.
     */
    private List<ChatTurn> history = new ArrayList<>();
}