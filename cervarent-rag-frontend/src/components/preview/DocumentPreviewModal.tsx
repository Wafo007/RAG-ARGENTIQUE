import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, FileWarning, Loader2 } from 'lucide-react';
import { ragApi } from '../../services/ragApi';
import { detectPreviewKind } from '../../utils/previewKind';
import './DocumentPreviewModal.css';

interface DocumentPreviewModalProps {
  /** Identifiant du document côté backend (colonne "source" = nom de fichier original). */
  source: string;
  /** Titre lisible affiché dans l'en-tête de la fenêtre. */
  title: string;
  /** Appelé quand l'utilisateur ferme la fenêtre (croix, overlay, touche Échap). */
  onClose: () => void;
}

type LoadState = 'loading' | 'ready' | 'unavailable' | 'error';

/**
 * Fenêtre de prévisualisation modale, inspirée de l'expérience Claude :
 * un panneau centré, avec un fond assombri, qui affiche le document
 * ORIGINAL (pas une reconstitution de chunks) directement dans l'app.
 *
 * Types gérés :
 * - PDF   → <embed> natif du navigateur (zoom, recherche, pagination intégrés)
 * - Image → <img>
 * - TXT   → texte brut affiché dans une zone scrollable
 * - DOCX  → converti en HTML via "mammoth" (lecture fidèle sans backend dédié)
 *
 * Si aucun fichier original n'est disponible (document indexé avant la mise
 * en place de Supabase Storage), on affiche un message clair plutôt qu'une
 * erreur brute — cohérent avec le repli déjà en place côté téléchargement.
 */
export default function DocumentPreviewModal({ source, title, onClose }: DocumentPreviewModalProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  const kind = useMemo(() => detectPreviewKind(source), [source]);

  // Ferme la fenêtre avec la touche Échap, comme la plupart des modales natives.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Empêche le scroll de la page derrière la modale pendant qu'elle est ouverte.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Charge le contenu du document dès l'ouverture, selon le type détecté.
  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    async function load() {
      setState('loading');
      try {
        const result = await ragApi.previewDocument(source);
        if (cancelled) return;

        if (!result) {
          setState('unavailable');
          return;
        }

        const { blob } = result;

        if (kind === 'pdf' || kind === 'image') {
          createdObjectUrl = URL.createObjectURL(blob);
          setObjectUrl(createdObjectUrl);
          setState('ready');
        } else if (kind === 'txt') {
          const text = await blob.text();
          if (cancelled) return;
          setTextContent(text);
          setState('ready');
        } else if (kind === 'docx') {
          // Chargement paresseux de mammoth : evite d'alourdir le bundle
          // principal pour les utilisateurs qui ne previsualisent jamais de DOCX.
          //const mammoth = await import('mammoth');
          //const arrayBuffer = await blob.arrayBuffer();
          //const { value } = await mammoth.convertToHtml({ arrayBuffer });
          if (cancelled) return;
          //setDocxHtml(value);
          //setState('ready');
          setState('unavailable');
        } else {
          setState('unavailable');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    }

    load();

    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [source, kind]);

  async function handleDownload() {
    try {
      await ragApi.downloadDocument(source, title);
    } catch {
      // Le bouton de téléchargement de la bibliothèque/des sources gère déjà
      // ses propres erreurs ; ici on reste silencieux pour ne pas doubler
      // les messages d'erreur dans une fenêtre déjà ouverte pour lire.
    }
  }

  const modal = (
    <div className="preview-modal__overlay" onClick={onClose}>
      <div
        className="preview-modal__panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Prévisualisation de ${title}`}
      >
        <header className="preview-modal__header">
          <div className="preview-modal__heading">
            <FileText size={16} />
            <span className="preview-modal__title" title={title}>{title}</span>
          </div>
          <div className="preview-modal__actions">
            <button type="button" onClick={handleDownload} title="Télécharger" aria-label="Télécharger">
              <Download size={17} />
            </button>
            <button type="button" onClick={onClose} title="Fermer" aria-label="Fermer">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="preview-modal__body">
          {state === 'loading' && (
            <div className="preview-modal__status">
              <Loader2 size={22} className="preview-modal__spin" />
              <span>Chargement de l'aperçu…</span>
            </div>
          )}

          {state === 'unavailable' && (
            <div className="preview-modal__status">
              <FileWarning size={22} />
              <span>
                Aucun aperçu disponible pour ce document. Il a probablement été indexé avant
                l'activation du stockage des documents originaux.
              </span>
            </div>
          )}

          {state === 'error' && (
            <div className="preview-modal__status">
              <FileWarning size={22} />
              <span>Une erreur est survenue pendant le chargement de l'aperçu.</span>
            </div>
          )}

          {state === 'ready' && kind === 'pdf' && objectUrl && (
            <embed src={objectUrl} type="application/pdf" className="preview-modal__pdf" />
          )}

          {state === 'ready' && kind === 'image' && objectUrl && (
            <div className="preview-modal__image-wrap">
              <img src={objectUrl} alt={title} className="preview-modal__image" />
            </div>
          )}

          {state === 'ready' && kind === 'txt' && textContent !== null && (
            <pre className="preview-modal__text">{textContent}</pre>
          )}

          {state === 'ready' && kind === 'docx' && docxHtml !== null && (
            <div className="preview-modal__docx" dangerouslySetInnerHTML={{ __html: docxHtml }} />
          )}
        </div>
      </div>
    </div>
  );

  // Portal : la modale sort de la hiérarchie DOM du composant appelant pour
  // toujours s'afficher au-dessus de tout (chat, bibliothèque, sidebar...).
  return createPortal(modal, document.body);
}
