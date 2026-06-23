import { FileText, Hash } from 'lucide-react';
import './PublicationCard.css';

interface PublicationCardProps {
  title: string;
  source: string;
  chunksCount: number;
  excerpt: string;
}

/**
 * Carte représentant une publication (regroupement de chunks par titre/source).
 * Affiche un extrait du contenu et le nombre de segments indexés.
 */
export default function PublicationCard({ title, source, chunksCount, excerpt }: PublicationCardProps) {
  return (
    <article className="pub-card">
      <div className="pub-card__icon">
        <FileText size={20} />
      </div>
      <div className="pub-card__body">
        <h3>{title}</h3>
        <p>{excerpt}</p>
        <div className="pub-card__meta">
          <span>{source || 'Source inconnue'}</span>
          <span className="pub-card__chunks">
            <Hash size={12} />
            {chunksCount} segment{chunksCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </article>
  );
}
