/**
 * Types liés aux conversations du chat RAG.
 *
 * Une conversation est composée de messages (question utilisateur / réponse IA).
 * Elle est persistée dans le localStorage du navigateur (voir services/conversationStorage.ts),
 * ce qui permet de retrouver son historique après un rechargement de page, sans avoir
 * besoin d'une base de données dédiée côté backend pour l'instant.
 *
 * Limite connue (à traiter dans une phase ultérieure) : le backend (RagService) ne reçoit
 * que la dernière question posée, pas l'historique de la conversation. L'IA ne "se souvient"
 * donc pas du contexte des échanges précédents — seul le frontend garde une trace visuelle
 * persistante de l'historique pour l'instant.
 */

/** Une source documentaire citée dans une réponse (correspond à RagResponse.SimpleSource côté backend) */
export interface ChatSource {
  documentTitle: string;
  source: string;
  excerpt: string;
  relevanceScore: number;
}

/** Un message du chat, posé par l'utilisateur ou généré par l'IA */
export interface ChatMessage {
  /** Identifiant unique du message, généré côté client (voir utils/id.ts) */
  id: string;
  /** Qui a écrit ce message */
  role: 'user' | 'assistant';
  /** Contenu textuel (interprété en markdown pour les réponses IA) */
  content: string;
  /** Sources utilisées pour générer la réponse (uniquement pertinent pour role === 'assistant') */
  sources?: ChatSource[];
  /** Temps de traitement renvoyé par le backend, en millisecondes */
  processingTimeMs?: number;
  /** Date de création au format ISO 8601 */
  createdAt: string;
  /** Vrai si ce message représente une erreur (ex : backend inaccessible) plutôt qu'une vraie réponse */
  isError?: boolean;
  /**
   * Vrai pendant que ce message assistant est en cours de génération
   * (streaming). Sert à afficher le curseur clignotant et l'indicateur
   * "en train de réfléchir", et à désactiver le bouton "Régénérer" tant
   * que la réponse n'est pas terminée.
   */
  isStreaming?: boolean;
}

/** Une conversation : un fil de discussion avec son historique de messages */
export interface Conversation {
  id: string;
  /** Titre affiché dans la sidebar (auto-généré à partir de la 1ère question, ou renommé manuellement) */
  title: string;
  /** Vrai si l'utilisateur a épinglé cette conversation en haut de la liste */
  pinned: boolean;
  createdAt: string;
  /** Mise à jour à chaque nouveau message : sert à trier et regrouper par date dans la sidebar */
  updatedAt: string;
  messages: ChatMessage[];
}
