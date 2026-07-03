import { useState } from 'react';
import { FileText, ChevronDown, Download, Check } from 'lucide-react';
import type { ChatSource } from '../../types/conversation';
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
 * Télécharge le contenu de la source sous forme de fichier texte.
 * Le nom du fichier est dérivé du titre du document.
 */
function downloadSource(source: ChatSource) {
  const filename = (source.documentTitle || source.source || 'document')
    .replace(/[^a-zA-Z0-9\u00C0-\u017F\s-]/g, '') // Nettoyer les caractères spéciaux
    .trim()
    .replace(/\s+/g, '_') + '.txt';

  const content = [
    `Document : ${source.documentTitle || source.source}`,
    `Source : ${source.source}`,
    `Score de pertinence : ${Math.round(source.relevanceScore * 100)}%`,
    '',
    '--- Extrait ---',
    '',
    source.excerpt || 'Aucun extrait disponible.',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function SourceCard({ source }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);
  
  const level = relevanceLevel(source.relevanceScore);
  const percentage = Math.round(source.relevanceScore * 100);

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation(); // Empêche le dépliement de la carte
    downloadSource(source);
    setJustDownloaded(true);
    setTimeout(() => setJustDownloaded(false), 2000);
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
        
        {/* Bouton de téléchargement */}
        <button
          type="button"
          className="source-card__download"
          onClick={handleDownload}
          title={`Télécharger le document : ${source.documentTitle || source.source}`}
          aria-label={`Télécharger le document ${source.documentTitle || source.source}`}
        >
          {justDownloaded ? <Check size={14} /> : <Download size={14} />}
        </button>
        
        <ChevronDown
          size={14}
          className={isExpanded ? 'source-card__chevron source-card__chevron--open' : 'source-card__chevron'}
        />
      </button>

      {isExpanded && (
        <div className="source-card__excerpt">{source.excerpt || 'Aucun extrait disponible.'}</div>
      )}
    </div>
  );
}