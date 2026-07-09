import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import ChatMessageBubble from './ChatMessageBubble';
import ChatComposer from './ChatComposer';
import { ragApi } from '../../services/ragApi';
import type { ChatTurn } from '../../types/api';
import type { ChatMessage, Conversation } from '../../types/conversation';
import { generateId } from '../../utils/id';
import './ChatWindow.css';
import UserGreeting from '../UserGreeting';

const EXAMPLES = [
  'Quelles sont les publications sur la biodiversité ?',
  "Résume les travaux récents sur l'agriculture durable.",
  'Quels axes de recherche concernent le changement climatique ?',
];

/** Nombre maximum de messages d'historique envoyés au backend par question.
 *  Le backend applique de toute façon sa propre limite (MAX_HISTORY_TURNS),
 *  mais autant éviter d'envoyer un payload inutilement gros pour une longue
 *  conversation. */
const MAX_HISTORY_MESSAGES_SENT = 20;

interface ChatWindowProps {
  conversation: Conversation;
  onAppendMessage: (message: ChatMessage) => void;
  /** Patche un message existant (utilisé pour faire grandir le texte pendant le streaming) */
  onUpdateMessage: (messageId: string, patch: Partial<ChatMessage>) => void;
  onRemoveLastMessages: (count: number) => void;
}

/**
 * Zone principale du chat : historique des messages + zone de saisie.
 *
 * Phase 3 : les questions sont désormais envoyées en streaming (SSE) plutôt
 * qu'en un seul appel bloquant, et accompagnées de l'historique de la
 * conversation pour donner une mémoire conversationnelle au modèle.
 */
export default function ChatWindow({
  conversation,
  onAppendMessage,
  onUpdateMessage,
  onRemoveLastMessages,
}: ChatWindowProps) {
  const [loading, setLoading] = useState(false);
  const [topK, setTopK] = useState(3);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Référence vers le contrôleur d'annulation de la requête en cours, pour
  // pouvoir l'interrompre depuis le bouton "Stop" du composer. Une ref (et non
  // un state) car on n'a jamais besoin de re-render quand elle change : on la
  // lit/écrit uniquement dans des gestionnaires d'évènements.
  const abortControllerRef = useRef<AbortController | null>(null);

  const messages = conversation.messages;

  // Auto-scroll vers le bas à chaque nouveau message ET à chaque mise à jour
  // du contenu du dernier message (pour suivre le texte pendant le streaming).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  /** Convertit les messages déjà affichés en historique au format attendu par le backend */
  function buildHistory(excludeLastN = 0): ChatTurn[] {
    const relevant = excludeLastN > 0 ? messages.slice(0, -excludeLastN) : messages;
    return relevant.slice(-MAX_HISTORY_MESSAGES_SENT).map((m) => ({ role: m.role, content: m.content }));
  }

  /**
   * Lance la génération en streaming d'une réponse pour `question`, en tenant
   * compte de `history`, et alimente le message assistant `assistantMessageId`
   * au fur et à mesure des fragments reçus.
   */
  async function streamInto(assistantMessageId: string, question: string, history: ChatTurn[]) {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    let accumulated = '';

    try {
      await ragApi.streamAskQuestion(
        { question, topK, history },
        {
          onSources: (sources) => onUpdateMessage(assistantMessageId, { sources }),
          onChunk: (delta) => {
            accumulated += delta;
            onUpdateMessage(assistantMessageId, { content: accumulated });
          },
          onDone: (processingTimeMs) => {
            onUpdateMessage(assistantMessageId, { isStreaming: false, processingTimeMs });
          },
          onError: (message) => {
            onUpdateMessage(assistantMessageId, { isStreaming: false, isError: true, content: message });
          },
        },
        controller.signal
      );
    } catch (error) {
      // AbortError : l'utilisateur a cliqué sur "Stop". On garde le texte déjà
      // reçu comme réponse finale plutôt que d'afficher une erreur — ce n'est
      // pas un échec, c'est le comportement normal du bouton Stop.
      if (error instanceof DOMException && error.name === 'AbortError') {
        onUpdateMessage(assistantMessageId, { isStreaming: false });
      } else {
        onUpdateMessage(assistantMessageId, {
          isStreaming: false,
          isError: true,
          content:
            'Impossible de contacter le service de recherche IA. Vérifiez que le backend (port 8087) est démarré.',
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  /** Pose une nouvelle question (suggestion cliquée ou texte tapé dans le composer) */
  async function askQuestion(question: string) {
    const history = buildHistory();

    onAppendMessage({
      id: generateId(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    });

    const assistantMessageId = generateId();
    onAppendMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    });

    await streamInto(assistantMessageId, question, history);
  }

  /**
   * Régénère la dernière réponse : retire l'ancienne réponse et redemande la
   * même question, avec l'historique tel qu'il était AVANT cet échange (donc
   * sans la question ni l'ancienne réponse qu'on est en train de remplacer).
   */
  async function regenerateLastAnswer() {
    if (loading || messages.length < 2) return;
    const lastAnswer = messages[messages.length - 1];
    const lastQuestion = messages[messages.length - 2];
    if (lastAnswer.role !== 'assistant' || lastQuestion.role !== 'user') return;

    const history = buildHistory(2);

    onRemoveLastMessages(1); // on retire l'ancienne réponse, la question reste affichée
    const assistantMessageId = generateId();
    onAppendMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    });

    await streamInto(assistantMessageId, lastQuestion.content, history);
  }

  /** Interrompt la génération en cours (bouton "Stop" du composer) */
  function stopGeneration() {
    abortControllerRef.current?.abort();
  }

  const lastMessage = messages[messages.length - 1];
  const canRegenerate = lastMessage?.role === 'assistant' && !lastMessage.isError && !lastMessage.isStreaming;

  return (
    <div className="chat-window">
      <div className="chat-window__scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-window__empty">
            <div className="chat-window__empty-icon">
              <Sparkles size={26} />
            </div>
            <div>
              <UserGreeting />
            </div>
            <h2>Recherche augmentée par IA</h2>
            <p>
              Posez vos questions en langage naturel. Le système analyse les publications du
              CERVARENT pour vous fournir des réponses contextuelles et citées.
            </p>
            <div className="chat-window__examples">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => askQuestion(example)}>
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              previousUserQuestion={message.role === 'assistant' ? messages[index - 1]?.content ?? '' : ''}
              onRegenerate={
                index === messages.length - 1 && canRegenerate ? regenerateLastAnswer : undefined
              }
              isRegenerating={loading}
            />
          ))
        )}
      </div>

      <ChatComposer
        onSubmit={askQuestion}
        onStop={stopGeneration}
        loading={loading}
        topK={topK}
        onTopKChange={setTopK}
      />
    </div>
  );
}