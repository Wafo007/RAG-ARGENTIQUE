import { useEffect, useState } from 'react';
import { FileText, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { ragApi } from '../services/ragApi';
import type { DocumentSummary } from '../types/api';
import './DocumentLibrary.css';

/** Formate un nombre de caracteres en taille lisible (approximation simple, pas d'octets exacts) */
function formatSize(characters: number): string {
  if (characters < 1000) return `${characters} caractères`;
  return `${(characters / 1000).toFixed(1)} k caractères`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Vue "bibliotheque documentaire" : liste tous les documents indexes
 * (regroupes par source) avec statut visuel, taille et date, et permet
 * de supprimer un document de l'index.
 */
export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Garde en memoire quelle source est en cours de suppression, pour
  // desactiver uniquement CE bouton-la (pas tous les boutons de la liste)
  const [deletingSource, setDeletingSource] = useState<string | null>(null);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const data = await ragApi.getDocumentLibrary();
      setDocuments(data);
    } catch {
      setError('Impossible de charger la bibliothèque documentaire.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleDelete(source: string) {
    // Confirmation simple avant une action destructive et irreversible
    if (!window.confirm(`Supprimer définitivement « ${source} » de l'index ?`)) return;

    setDeletingSource(source);
    try {
      await ragApi.deleteDocument(source);
      setDocuments((prev) => prev.filter((doc) => doc.source !== source));
    } catch {
      setError(`Échec de la suppression de « ${source} ».`);
    } finally {
      setDeletingSource(null);
    }
  }

  if (loading) {
    return <div className="doc-library__loading">Chargement de la bibliothèque...</div>;
  }

  return (
    <div className="doc-library">
      <div className="doc-library__header">
        <h2>Bibliothèque documentaire</h2>
        <button type="button" onClick={loadDocuments} title="Rafraîchir">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="doc-library__error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="doc-library__empty">Aucun document indexé pour le moment.</p>
      ) : (
        <table className="doc-library__table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Segments</th>
              <th>Taille</th>
              <th>Ajouté le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.source}>
                <td className="doc-library__title-cell">
                  <FileText size={16} />
                  <span>{doc.documentTitle || doc.source}</span>
                </td>
                <td>{doc.chunksCount}</td>
                <td>{formatSize(doc.totalCharacters)}</td>
                <td>{formatDate(doc.addedAt)}</td>
                <td>
                  <button
                    type="button"
                    className="doc-library__delete"
                    onClick={() => handleDelete(doc.source)}
                    disabled={deletingSource === doc.source}
                    title="Supprimer ce document"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}