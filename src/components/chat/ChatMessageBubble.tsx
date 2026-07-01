import ReactMarkdown from 'react-markdown';
import { Bot, User, FileText, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../../types/conversation';
import './ChatMessageBubble.css';
import SourceCard from './SourceCard';
import MarkdownRenderer from '../MarkdownRenderer';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

/**
 * Affiche un message de la conversation (question utilisateur ou réponse IA).
 *
 * Phase 3 — trois états possibles pour une réponse assistant en cours :
 * 1. isStreaming && content vide   → indicateur "en train de réfléchir" (3 points)
 * 2. isStreaming && content rempli → texte BRUT (pas markdown) + curseur clignotant
 * 3. plus de streaming              → rendu markdown complet (gras, listes...)
 *
 * Pourquoi du texte brut pendant le streaming plutôt que du markdown ?
 * → ReactMarkdown génère des balises bloc (<p>, <ul>...). Un curseur placé
 *   APRÈS ce rendu se retrouverait sur sa propre ligne, pas collé au dernier
 *   mot. En affichant du texte brut (avec white-space: pre-wrap) tant que ça
 *   streame, le curseur reste un simple <span> inline, correctement positionné
 *   à la fin du texte. Le rendu markdown "propre" n'apparaît qu'une fois la
 *   génération terminée.
 */
export default function ChatMessageBubble({ message, onRegenerate, isRegenerating }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isWaitingForFirstChunk = Boolean(message.isStreaming) && message.content.length === 0;

  return (
    <div className={isUser ? 'chat-msg chat-msg--user' : 'chat-msg chat-msg--assistant'}>
      <div className="chat-msg__avatar" aria-hidden="true">
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className="chat-msg__body">
        {message.isError ? (
          <div className="chat-msg__error" role="alert">
            <AlertCircle size={16} />
            <span>{message.content}</span>
          </div>
        ) : isWaitingForFirstChunk ? (
          <div className="chat-msg__typing" aria-label="Génération de la réponse en cours">
            <span />
            <span />
            <span />
          </div>
        ) : message.isStreaming ? (
          <div className="chat-msg__content chat-msg__content--streaming">
            {message.content}
            <span className="chat-msg__cursor" aria-hidden="true" />
          </div>
        ) : (
          <MarkdownRenderer content={message.content} isStreaming={false} />
        )}

        {!isUser && !message.isError && !message.isStreaming && (
          <div className="chat-msg__meta">
            {typeof message.processingTimeMs === 'number' && (
              <span className="chat-msg__time">
                <Clock size={12} />
                Traité en {message.processingTimeMs} ms
              </span>
            )}

            {onRegenerate && (
              <button
                type="button"
                className="chat-msg__regen"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw size={12} className={isRegenerating ? 'chat-msg__spin' : ''} />
                Régénérer
              </button>
            )}
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="chat-msg__sources">
            <h4>Sources utilisées</h4>
            <div className="chat-msg__sources-list">
              {message.sources.map((source, i) => (
                <SourceCard key={`${source.source}-${i}`} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}