import type { PreviewKind } from '../types/api';

/**
 * Détermine comment prévisualiser un document, à partir de son nom de
 * fichier et/ou de son Content-Type MIME renvoyé par le backend.
 *
 * On vérifie d'abord l'extension (fiable, toujours présente sur `source`),
 * puis on retombe sur le mime-type si besoin.
 */
export function detectPreviewKind(filenameOrSource: string, mimeType?: string): PreviewKind {
  const lower = filenameOrSource.toLowerCase();

  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';

  if (
    lower.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  if (lower.endsWith('.txt') || mimeType === 'text/plain') return 'txt';

  if (
    /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(lower) ||
    (mimeType?.startsWith('image/') ?? false)
  ) {
    return 'image';
  }

  return 'unsupported';
}
