package com.Cervarent.RAG.dto;

import lombok.Data;

/**
 * Représente un tour de conversation déjà échangé (une question OU une réponse),
 * envoyé par le frontend pour donner une mémoire conversationnelle au modèle.
 *
 * Le frontend garde tout son historique dans le localStorage (voir la phase 2,
 * fichier useConversations.ts). À chaque nouvelle question, il renvoie les
 * derniers échanges de la conversation active sous cette forme, pour que l'IA
 * "se souvienne" du contexte précédent — sans que le backend ait besoin de
 * stocker lui-même les conversations en base.
 */
@Data
public class ChatTurn {

    /** "user" pour une question posée précédemment, "assistant" pour une réponse de l'IA */
    private String role;

    /** Contenu textuel de ce tour (la question ou la réponse) */
    private String content;
}