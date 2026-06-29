import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatMessage, Conversation } from '../types/conversation';
import { loadConversations, saveConversations } from '../services/conversationStorage';
import { generateId } from '../utils/id';

/** Longueur max du titre auto-généré à partir de la première question posée */
const AUTO_TITLE_MAX_LENGTH = 48;

/** Construit une conversation vide, prête à recevoir des messages */
function createEmptyConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: 'Nouvelle conversation',
    pinned: false,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

/** Construit un titre court et lisible à partir du texte de la première question */
function buildAutoTitle(content: string): string {
  const cleaned = content.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= AUTO_TITLE_MAX_LENGTH) return cleaned;
  return `${cleaned.slice(0, AUTO_TITLE_MAX_LENGTH).trimEnd()}…`;
}

/**
 * Hook central de gestion des conversations du chat RAG.
 *
 * Pourquoi un hook personnalisé plutôt que de mettre cette logique directement
 * dans le composant de page ?
 * → Réutilisabilité : si l'on affiche un jour le chat RAG ailleurs (ex : un
 *   widget flottant sur une autre page), on réutilise ce hook sans dupliquer
 *   la logique de persistance/CRUD.
 * → Lisibilité : le composant de page ne fait plus que de l'affichage, toute
 *   la logique d'état est isolée et testable indépendamment du JSX.
 */
export function useConversations() {
  // État principal : la liste de toutes les conversations.
  // Initialisé une seule fois depuis le localStorage grâce à l'initialiseur
  // "lazy" de useState (la fonction ci-dessous n'est exécutée qu'au tout premier
  // rendu, jamais aux rendus suivants). Si aucune conversation n'existe encore
  // (première visite), on en crée une vide pour ne jamais afficher d'écran vide.
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const loaded = loadConversations();
    return loaded.length > 0 ? loaded : [createEmptyConversation()];
  });

  // Identifiant de la conversation actuellement affichée dans la zone de chat.
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => conversations[0]?.id ?? null
  );

  // Texte tapé dans la barre de recherche de l'historique (sidebar).
  const [searchQuery, setSearchQuery] = useState('');

  // Chaque fois que la liste de conversations change, on la persiste.
  // Effet volontairement simple : pas de debounce, car écrire du JSON dans le
  // localStorage est une opération synchrone très rapide (pas d'appel réseau).
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  /**
   * Garde-fou de cohérence : on s'assure qu'il existe toujours au moins une
   * conversation, et que activeConversationId pointe vers une conversation
   * qui existe réellement (utile après une suppression).
   */
  useEffect(() => {
    if (conversations.length === 0) {
      setConversations([createEmptyConversation()]);
      return;
    }
    const stillExists = conversations.some((c) => c.id === activeConversationId);
    if (!stillExists) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  /** La conversation actuellement sélectionnée */
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  /** Conversations filtrées par la recherche, triées par date de dernière activité (plus récent en premier) */
  const filteredConversations = useMemo(() => {
    const sorted = [...conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter((c) => c.title.toLowerCase().includes(query));
  }, [conversations, searchQuery]);

  /** Crée une nouvelle conversation vide et la rend active immédiatement */
  const createConversation = useCallback((): string => {
    const newConversation = createEmptyConversation();
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    return newConversation.id;
  }, []);

  /** Renomme une conversation (déclenché par l'icône crayon de la sidebar) */
  const renameConversation = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return; // on ignore un titre vide plutôt que de l'accepter
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)));
  }, []);

  /** Épingle ou désépingle une conversation */
  const togglePinConversation = useCallback((id: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }, []);

  /** Supprime définitivement une conversation (le garde-fou ci-dessus recrée une conversation vide si besoin) */
  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /**
   * Ajoute un message à une conversation et met à jour sa date de dernière activité.
   * Si c'est le premier message de la conversation (et qu'elle a encore son titre
   * par défaut), le titre est auto-généré à partir de son contenu.
   */
  const appendMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;

        const isFirstUserMessage = c.messages.length === 0 && message.role === 'user';
        const shouldAutoTitle = isFirstUserMessage && c.title === 'Nouvelle conversation';

        return {
          ...c,
          title: shouldAutoTitle ? buildAutoTitle(message.content) : c.title,
          updatedAt: new Date().toISOString(),
          messages: [...c.messages, message],
        };
      })
    );
  }, []);

  /**
   * Met à jour partiellement un message existant.
   *
   * Ajouté en phase 3 pour le streaming : au lieu de créer un nouveau message
   * à chaque fragment de texte reçu, on patche le MÊME message assistant au
   * fil de l'eau (content qui grandit, puis isStreaming qui passe à false,
   * puis sources/processingTimeMs qui se remplissent).
   *
   * Limite assumée : cela déclenche une écriture dans le localStorage à
   * chaque fragment (voir l'effet de persistance plus haut dans ce fichier).
   * Pour une réponse de quelques dizaines de fragments sur quelques secondes,
   * le coût est négligeable ; pour une optimisation future, on pourrait
   * debouncer cette écriture pendant le streaming.
   */
  const updateMessage = useCallback(
    (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== conversationId
            ? c
            : {
                ...c,
                updatedAt: new Date().toISOString(),
                messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
              }
        )
      );
    },
    []
  );

  /** Supprime les N derniers messages d'une conversation (utilisé par le bouton "Régénérer") */
  const removeLastMessages = useCallback((conversationId: string, count: number) => {
    setConversations((prev) =>
      prev.map((c) => (c.id !== conversationId ? c : { ...c, messages: c.messages.slice(0, -count) }))
    );
  }, []);

  return {
    conversations: filteredConversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    searchQuery,
    setSearchQuery,
    createConversation,
    renameConversation,
    togglePinConversation,
    deleteConversation,
    appendMessage,
    updateMessage,
    removeLastMessages,
  };
}
