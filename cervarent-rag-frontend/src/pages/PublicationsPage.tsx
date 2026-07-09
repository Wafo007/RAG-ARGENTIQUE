import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertCircle, UploadCloud } from 'lucide-react';
import Layout from '../components/Layout';
import StatsRow from '../components/StatsRow';
import RagSearchPanel from '../components/RagSearchPanel';
import PublicationCard from '../components/PublicationCard';
import UploadPanel from '../components/UploadPanel';
import { ragApi } from '../services/ragApi';
import type { DocumentChunk } from '../types/api';
import './PublicationsPage.css';
import DocumentLibrary from '../components/DocumentLibrary';

/**
 * Page "Publications" : reproduit la maquette fournie.
 *
 * - Rangée de statistiques (calculées à partir de GET /api/rag/documents)
 * - Panneau de recherche augmentée par IA (signature de la page)
 * - Bibliothèque des publications indexées, regroupées par titre
 * - Panneau d'upload pour ajouter de nouveaux documents
 */
export default function PublicationsPage() {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ragApi
      .getAllDocuments()
      .then((data) => {
        if (active) setChunks(data);
      })
      .catch(() => {
        if (active) setError("Impossible de charger les publications depuis le backend.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Regroupe les chunks par titre de document pour afficher une carte par publication
  const publications = useMemo(() => {
    const groups = new Map<string, DocumentChunk[]>();
    chunks.forEach((chunk) => {
      const key = chunk.documentTitle || 'Document sans titre';
      const existing = groups.get(key) ?? [];
      existing.push(chunk);
      groups.set(key, existing);
    });

    return Array.from(groups.entries()).map(([title, group]) => ({
      title,
      source: group[0]?.source ?? '',
      chunksCount: group.length,
      excerpt: group[0]?.content?.slice(0, 160) ?? '',
    }));
  }, [chunks]);

  const stats = [
    { label: 'Publications totales', value: String(publications.length) },
    { label: 'Segments indexés', value: String(chunks.length) },
    { label: 'Sources distinctes', value: String(new Set(chunks.map((c) => c.source)).size) },
    { label: 'Statut', value: error ? 'Hors ligne' : 'En ligne' },
  ];

  return (
    <Layout withSidebar>
      <StatsRow stats={stats} />

      <DocumentLibrary />

      <section className="pub-section">
        <div className="pub-section__header">
          <h2>Bibliothèque de publications</h2>
          <p>Documents indexés et disponibles pour la recherche IA.</p>
        </div>

        {loading && (
          <div className="pub-section__state">
            <Loader2 size={18} className="pub-section__spin" />
            Chargement des publications…
          </div>
        )}

        {error && (
          <div className="pub-section__state pub-section__state--error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!loading && !error && publications.length === 0 && (
          <div className="pub-section__state">
            Aucune publication indexée pour le moment. Ajoutez un document ci-dessous.
          </div>
        )}

        {!loading && publications.length > 0 && (
          <div className="pub-section__grid">
            {publications.map((pub) => (
              <PublicationCard key={pub.title + pub.source} {...pub} />
            ))}
          </div>
        )}
      </section>

      <section className="pub-section">
        <div className="pub-section__header">
          <h2>
            <UploadCloud size={18} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            Ajouter une publication
          </h2>
          <p>Importez un fichier PDF, TXT ou DOCX pour l'indexer dans la base de connaissances.</p>
        </div>
        <UploadPanel />
      </section>
    </Layout>
  );
}
