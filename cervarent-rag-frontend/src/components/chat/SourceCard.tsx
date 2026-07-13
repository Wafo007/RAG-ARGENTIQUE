import { useState } from 'react';
import { FileText, ChevronDown, Download, Check, Loader2 } from 'lucide-react';
import type { ChatSource } from '../../types/conversation';
import { ragApi } from '../../services/ragApi';
import './SourceCard.css';

interface SourceCardProps {
  source: ChatSource;
}

/** Seuils utilisés pour colorer le badge de pertinence */
const HIGH_RELEVANCE_THRESHOLD = 0.7;
const MEDIUM_RELEVANCE_THRESHOLD = 0.45;

function relevanceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= HIGH_RELEVANCE_THRESHOLD) return 'high';
  if (score >= MEDIUM_RELEVANCE_THRESHOLD) return 'medium';
  return 'low';
}

/**
 * Carte affichant une source documentaire citée par l'IA dans sa réponse,
 * avec un score de pertinence, un aperçu dépliable, et un bouton de
 * téléchargement.
 *
 * Le téléchargement appelle désormais le backend
 * (GET /api/rag/documents/{source}/download), qui reconstitue et renvoie
 * le document COMPLET (tous ses chunks recollés dans l'ordre), au lieu de
 * ne télécharger que l'extrait (excerpt) du seul chunk cité par l'IA.
 */
export default function SourceCard({ source }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const level = relevanceLevel(source.relevanceScore);
  const percentage = Math.round(source.relevanceScore * 100);

  async function handleDownload(event: React.MouseEvent) {
    event.stopPropagation(); // Empêche le dépliement de la carte
    if (downloadState === 'loading') return;

    setDownloadState('loading');
    try {
      await ragApi.downloadDocument(source.source, source.documentTitle || source.source);
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 2000);
    } catch {
      setDownloadState('error');
      setTimeout(() => setDownloadState('idle'), 2500);
    }
  }

  return (
    <div className={`source-card source-card--${level}`}>
      <button
        type="button"
        className="source-card__header"
        onClick={() => setIsExpanded((e) => !e)}
        aria-expanded={isExpanded}
      >
        <FileText size={14} className="source-card__icon" />
        <span className="source-card__title">{source.documentTitle || source.source}</span>
        <span className="source-card__score" title="Score de pertinence (similarité avec la question)">
          {percentage}%
        </span>

        <button
          type="button"
          className="source-card__download"
          onClick={handleDownload}
          disabled={downloadState === 'loading'}
          title={`Télécharger le document complet : ${source.documentTitle || source.source}`}
          aria-label={`Télécharger le document ${source.documentTitle || source.source}`}
        >
          {downloadState === 'loading' && <Loader2 size={14} className="source-card__spin" />}
          {downloadState === 'done' && <Check size={14} />}
          {downloadState === 'idle' && <Download size={14} />}
          {downloadState === 'error' && <Download size={14} className="source-card__download-error" />}
        </button>

        <ChevronDown
          size={14}
          className={isExpanded ? 'source-card__chevron source-card__chevron--open' : 'source-card__chevron'}
        />
      </button>

      {isExpanded && (
        <div className="source-card__excerpt">{source.excerpt || 'Aucun extrait disponible.'}</div>
      )}
      {downloadState === 'error' && (
        <div className="source-card__error-message">Échec du téléchargement. Réessayez.</div>
      )}
    </div>
  );
}
