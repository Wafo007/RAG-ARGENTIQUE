import { useConversations } from '../hooks/useConversations';
import ConversationSidebar from '../components/chat/ConversationSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import Navbar from '../components/Navbar';
import './RagSearchPage.css';

/**
 * Page de recherche augmentée par IA — expérience "façon Claude" complète :
 * sidebar de conversations à gauche, zone de chat à droite.
 *
 * Différence volontaire par rapport aux autres pages (qui utilisent
 * <Layout withSidebar>) : cette page n'utilise PAS le composant Sidebar
 * "Publications" (navigation du site), qui n'a pas de sens ici. Elle a besoin
 * de sa propre sidebar, dédiée à l'historique des conversations. On conserve
 * uniquement la Navbar, pour garder l'identité visuelle CERVARENT en haut
 * de l'écran et permettre de revenir facilement aux autres pages du site.
 */
export default function RagSearchPage() {
  const {
    conversations,
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
  } = useConversations();

  return (
    <div className="rag-search-page">
      <Navbar />

      <div className="rag-search-page__body">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={setActiveConversationId}
          onCreate={createConversation}
          onRename={renameConversation}
          onDelete={deleteConversation}
          onTogglePin={togglePinConversation}
        />

        {/* activeConversation peut être undefined pendant une fraction de
            seconde au tout premier rendu (avant que le garde-fou du hook
            n'ait créé la conversation initiale) : on affiche un état neutre
            plutôt que de risquer une erreur de rendu. */}
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            onAppendMessage={(message) => appendMessage(activeConversation.id, message)}
            onUpdateMessage={(messageId, patch) => updateMessage(activeConversation.id, messageId, patch)}
            onRemoveLastMessages={(count) => removeLastMessages(activeConversation.id, count)}
          />
        ) : (
          <div className="rag-search-page__loading">Préparation de votre espace de discussion…</div>
        )}
      </div>
    </div>
  );
}
