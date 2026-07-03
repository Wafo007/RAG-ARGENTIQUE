import { useState, type FormEvent } from 'react';
import { Bot, Send, FileText, Clock, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ragApi } from '../services/ragApi';
import type { RagResponse } from '../types/api';
import './RagSearchPanel.css';
import MarkdownRenderer from './MarkdownRenderer';

/** Exemples de questions affichés sous forme de suggestions cliquables */
const EXAMPLES = [
  'Quelles sont les publications sur la biodiversité ?',
  'Résume les travaux récents sur l\'agriculture durable.',
  'Quels axes de recherche concernent le changement climatique ?',
];

/**
 * Panneau de recherche augmentée par IA (RAG).
 *
 * - Envoie la question saisie à POST /api/rag/ask
 * - Affiche la réponse générée, les sources documentaires et le temps de traitement
 * - Gère les états de chargement et d'erreur
 */
export default function RagSearchPanel() {
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RagResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await ragApi.askQuestion({ question: trimmed, topK });
      setResult(response);
    } catch {
      setError(
        "Impossible de contacter le service de recherche IA. Vérifiez que le backend (port 8087) est démarré."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rag-panel">
      <div className="rag-panel__badge">
        <Bot size={15} />
        Intelligence artificielle RAG
      </div>

      <h1 className="rag-panel__title">
        Recherche augmentée par <span className="rag-panel__highlight">IA</span>
      </h1>

      <p className="rag-panel__subtitle">
        Posez vos questions en langage naturel. Notre système RAG analyse les publications
        du CERVARENT pour vous fournir des réponses contextuelles et citées.
      </p>

      <form className="rag-panel__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="rag-panel__input"
          placeholder="Ex : Quelles sont les publications sur la biodiversité ?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label="Votre question"
        />
        <button type="submit" className="rag-panel__submit" disabled={loading}>
          {loading ? <Loader2 size={18} className="rag-panel__spin" /> : <Send size={18} />}
          {loading ? 'Recherche…' : 'Rechercher'}
        </button>
      </form>

      <div className="rag-panel__options">
        <label htmlFor="topK">Nombre de sources à considérer</label>
        <select
          id="topK"
          value={topK}
          onChange={(e) => setTopK(Number(e.target.value))}
        >
          {[1, 2, 3, 5, 8].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="rag-panel__examples">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="rag-panel__example"
            onClick={() => setQuestion(example)}
          >
            {example}
          </button>
        ))}
      </div>

      {/* Zone de résultat */}
      {error && (
        <div className="rag-panel__error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="rag-panel__result">
          <div className="rag-panel__answer markdown-body">
            <MarkdownRenderer content={result.answer} />
          </div>

          <div className="rag-panel__meta">
            <span className="rag-panel__time">
              <Clock size={14} />
              Traité en {result.processingTimeMs} ms
            </span>
          </div>

          {result.sources.length > 0 && (
            <div className="rag-panel__sources">
              <h3>Sources utilisées</h3>
              <ul>
                {result.sources.map((source, i) => (
                  <li key={`${source.source}-${i}`}>
                    <FileText size={14} />
                    <span>{source.documentTitle || source.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
