import { useEffect, useState } from 'react';
import { Plus, Search, Pin, PinOff, Pencil, Trash2, Check, X, Sparkles } from 'lucide-react';
import type { Conversation } from '../../types/conversation';
import { groupConversationsByDate } from '../../utils/dateGroups';
import './ConversationSidebar.css';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

/**
 * Barre latérale façon "Claude" : nouvelle conversation, recherche, et
 * historique regroupé par date avec actions (renommer / épingler / supprimer).
 *
 * Ce composant est purement présentationnel : toute la logique d'état (création,
 * persistance...) vient du hook useConversations, utilisé par RagSearchPage.
 * Cela suit le même principe de séparation logique/affichage déjà présent
 * dans le reste du projet (ex : PublicationsPage / ragApi).
 */
export default function ConversationSidebar({
  conversations,
  activeConversationId,
  searchQuery,
  onSearchChange,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onTogglePin,
}: ConversationSidebarProps) {
  // Id de la conversation en cours de renommage (null = aucune en édition)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Id de la conversation pour laquelle on demande confirmation avant suppression.
  // Pattern "double clic" : un premier clic affiche "Supprimer ?", un second clic
  // déclenche réellement la suppression. Cela évite une popup native disgracieuse
  // tout en protégeant contre les clics accidentels sur l'icône corbeille.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // La demande de confirmation expire après 3 secondes si l'utilisateur ne
  // confirme pas, pour ne jamais laisser un bouton "Supprimer ?" coincé.
  useEffect(() => {
    if (!pendingDeleteId) return;
    const timeout = setTimeout(() => setPendingDeleteId(null), 3000);
    return () => clearTimeout(timeout);
  }, [pendingDeleteId]);

  function startRename(conv: Conversation) {
    setEditingId(conv.id);
    setEditingValue(conv.title);
  }

  function confirmRename() {
    if (editingId) onRename(editingId, editingValue);
    setEditingId(null);
  }

  const pinned = conversations.filter((c) => c.pinned);
  const unpinned = conversations.filter((c) => !c.pinned);
  const dateGroups = groupConversationsByDate(unpinned);

  function renderItem(conv: Conversation) {
    const isActive = conv.id === activeConversationId;
    const isEditing = editingId === conv.id;
    const isPendingDelete = pendingDeleteId === conv.id;

    return (
      <li
        key={conv.id}
        className={isActive ? 'conv-sidebar__item conv-sidebar__item--active' : 'conv-sidebar__item'}
      >
        {isEditing ? (
          <div className="conv-sidebar__edit">
            <input
              autoFocus
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
            />
            <button type="button" aria-label="Valider le renommage" onClick={confirmRename}>
              <Check size={14} />
            </button>
            <button type="button" aria-label="Annuler le renommage" onClick={() => setEditingId(null)}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="conv-sidebar__title"
              onClick={() => onSelect(conv.id)}
              title={conv.title}
            >
              {conv.title}
            </button>

            <div className="conv-sidebar__actions">
              <button
                type="button"
                aria-label={conv.pinned ? 'Désépingler la conversation' : 'Épingler la conversation'}
                onClick={() => onTogglePin(conv.id)}
              >
                {conv.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <button type="button" aria-label="Renommer la conversation" onClick={() => startRename(conv)}>
                <Pencil size={14} />
              </button>
              {isPendingDelete ? (
                <button
                  type="button"
                  aria-label="Confirmer la suppression"
                  className="conv-sidebar__confirm-delete"
                  onClick={() => {
                    onDelete(conv.id);
                    setPendingDeleteId(null);
                  }}
                >
                  Supprimer ?
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Supprimer la conversation"
                  onClick={() => setPendingDeleteId(conv.id)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </>
        )}
      </li>
    );
  }

  return (
    <aside className="conv-sidebar">
      <button type="button" className="conv-sidebar__new" onClick={onCreate}>
        <Plus size={16} />
        Nouvelle conversation
      </button>

      <div className="conv-sidebar__search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Rechercher dans l'historique"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Rechercher dans l'historique des conversations"
        />
      </div>

      <nav className="conv-sidebar__list" aria-label="Historique des conversations">
        {pinned.length > 0 && (
          <div className="conv-sidebar__group">
            <h3>Épinglées</h3>
            <ul>{pinned.map(renderItem)}</ul>
          </div>
        )}

        {dateGroups.map((group) => (
          <div className="conv-sidebar__group" key={group.label}>
            <h3>{group.label}</h3>
            <ul>{group.conversations.map(renderItem)}</ul>
          </div>
        ))}

        {conversations.length === 0 && (
          <p className="conv-sidebar__empty">
            <Sparkles size={16} />
            Aucune conversation ne correspond à votre recherche.
          </p>
        )}
      </nav>
    </aside>
  );
}
