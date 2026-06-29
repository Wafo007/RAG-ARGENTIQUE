import { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ragApi } from '../services/ragApi';
import type { UploadMode, UploadResponse } from '../types/api';
import './UploadPanel.css';

/**
 * Panneau d'upload de documents (PDF, TXT, DOCX) pour l'indexation RAG.
 *
 * Appelle POST /api/rag/upload avec le fichier et le mode choisi :
 * - "thinking" : traitement synchrone, on attend la réponse complète
 * - "instant"  : traitement asynchrone, on pourrait ensuite interroger
 *                /api/rag/files/{id}/status pour suivre l'avancement
 */
export default function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>('thinking');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFileChange() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await ragApi.uploadFile(file, mode);
      setResult(response);
    } catch {
      setError("Échec de l'upload. Vérifiez le format (PDF, TXT, DOCX) et la taille (max 20 Mo).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upload-panel">
      <div className="upload-panel__mode">
        <span>Mode de traitement</span>
        <div className="upload-panel__toggle">
          <button
            type="button"
            className={mode === 'thinking' ? 'active' : ''}
            onClick={() => setMode('thinking')}
          >
            Réfléchi (synchrone)
          </button>
          <button
            type="button"
            className={mode === 'instant' ? 'active' : ''}
            onClick={() => setMode('instant')}
          >
            Instantané (asynchrone)
          </button>
        </div>
      </div>

      <label className="upload-panel__dropzone">
        <UploadCloud size={28} />
        <span>Cliquez pour sélectionner un fichier (PDF, TXT, DOCX — 20 Mo max)</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={handleFileChange}
          hidden
        />
      </label>

      {loading && (
        <div className="upload-panel__status upload-panel__status--loading">
          <Loader2 size={16} className="upload-panel__spin" />
          Indexation de « {fileName} » en cours…
        </div>
      )}

      {error && (
        <div className="upload-panel__status upload-panel__status--error">
          <XCircle size={16} />
          {error}
        </div>
      )}

      {result && (
        <div className="upload-panel__status upload-panel__status--success">
          <CheckCircle2 size={16} />
          <div>
            <strong>{result.filename}</strong> — statut : {result.status}
            {typeof result.chunksCount === 'number' && (
              <span> ({result.chunksCount} segments créés)</span>
            )}
            <p>{result.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
