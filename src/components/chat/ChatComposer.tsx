import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send, Square, SlidersHorizontal } from 'lucide-react';
import './ChatComposer.css';

interface ChatComposerProps {
  onSubmit: (question: string) => void;
  /** Interrompt la génération en cours (phase 3 — bouton "Stop") */
  onStop: () => void;
  loading: boolean;
  topK: number;
  onTopKChange: (value: number) => void;
}

const TOPK_OPTIONS = [1, 2, 3, 5, 8];

/**
 * Zone de saisie en bas de l'écran.
 *
 * Phase 3 : le bouton d'envoi se transforme en bouton "Stop" (icône carrée)
 * pendant qu'une réponse est en cours de génération, au lieu d'une simple
 * roue de chargement désactivée — l'utilisateur peut interrompre le flux.
 */
export default function ChatComposer({ onSubmit, onStop, loading, topK, onTopKChange }: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setValue('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      {showSettings && (
        <div className="chat-composer__settings">
          <label htmlFor="topK">Nombre de sources à considérer</label>
          <select id="topK" value={topK} onChange={(e) => onTopKChange(Number(e.target.value))}>
            {TOPK_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="chat-composer__bar">
        <button
          type="button"
          className="chat-composer__settings-btn"
          aria-label="Paramètres de recherche"
          onClick={() => setShowSettings((s) => !s)}
        >
          <SlidersHorizontal size={18} />
        </button>

        <textarea
          rows={1}
          placeholder="Posez votre question sur les publications du CERVARENT…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Votre question"
        />

        <button
          type={loading ? 'button' : 'submit'}
          className="chat-composer__send"
          onClick={loading ? onStop : undefined}
          disabled={!loading && !value.trim()}
          aria-label={loading ? 'Arrêter la génération' : 'Envoyer'}
        >
          {loading ? <Square size={14} fill="currentColor" /> : <Send size={18} />}
        </button>
      </div>
    </form>
  );
}