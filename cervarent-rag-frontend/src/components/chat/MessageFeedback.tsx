import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { ragApi } from '../../services/ragApi';
import './MessageFeedback.css';

interface MessageFeedbackProps {
  question: string;
  answer: string;
}

/**
 * Boutons 👍/👎 affiches sous chaque reponse de l'assistant.
 * Une fois un avis envoye, il devient definitif visuellement (pas de
 * changement d'avis possible) pour eviter le spam et garder des donnees
 * de feedback propres.
 */
export default function MessageFeedback({ question, answer }: MessageFeedbackProps) {
  const [submitted, setSubmitted] = useState<'UP' | 'DOWN' | null>(null);
  const [sending, setSending] = useState(false);

  async function handleClick(rating: 'UP' | 'DOWN') {
    if (submitted || sending) return; // deja envoye ou envoi en cours : on ignore

    setSending(true);
    try {
      await ragApi.submitFeedback(question, answer, rating);
      setSubmitted(rating);
    } catch {
      // Echec silencieux : le feedback n'est pas critique pour l'utilisateur,
      // pas la peine d'afficher une erreur bloquante pour ca
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="msg-feedback msg-feedback--done">
        <Check size={14} />
        Merci pour votre retour
      </div>
    );
  }

  return (
    <div className="msg-feedback">
      <button
        type="button"
        onClick={() => handleClick('UP')}
        disabled={sending}
        title="Réponse utile"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => handleClick('DOWN')}
        disabled={sending}
        title="Réponse pas utile"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}