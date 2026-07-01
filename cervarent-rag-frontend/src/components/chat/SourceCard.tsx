import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import type { ChatSource } from '../../types/conversation';
import './SourceCard.css';

interface SourceCardProps {
  source: ChatSource;
}

/** Seuils utilisés pour colorer le badge de pertinence (vert / orange / gris) */
const HIGH_RELEVANCE_THRESHOLD = 0.7;
const MEDIUM_RELEVANCE_THRESHOLD = 0.45;

function relevanceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= HIGH_RELEVANCE_THRESHOLD) return 'high';
  if (score >= MEDIUM_RELEVANCE_THRESHOLD) return 'medium';
  return 'low';
}

/**
 * Carte dépliable affichant UNE source documentaire utilisée pour générer une
 * réponse : nom du fichier, score de pertinence, et extrait exact du texte
 * indexé qui a été transmis à l'IA — pour que l'utilisateur puisse vérifier
 * lui-même ce que l'IA a "lu" avant de répondre, plutôt que de lui faire
 * confiance à l'aveugle.
 *
 * Composant séparé de ChatMessageBubble (consigne "évite les composants
 * gigantesques") : l'état d'ouverture/fermeture (isExpanded) n'a de sens
 * qu'ICI, chaque carte se déplie indépendamment des autres.
 */
export default function SourceCard({ source }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const level = relevanceLevel(source.relevanceScore);
  const percentage = Math.round(source.relevanceScore * 100);

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