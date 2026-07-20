import axios from 'axios';
import type {
  ChatTurn,
  DocumentChunk,
  DocumentRequest,
  DocumentSummary,
  HealthResponse,
  IndexResponse,
  QuestionRequest,
  RagResponse,
  SimpleSource,
  UploadMode,
  UploadResponse,
} from '../types/api';

/**
 * Client HTTP central de l'application.
 *
 * En développement, Vite redirige "/api" vers http://localhost:8087
 * (voir vite.config.ts), donc on peut laisser baseURL relative.
 * En production, définir VITE_API_BASE_URL dans le fichier .env
 * pour pointer vers l'URL réelle du backend déployé.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { Accept: 'application/json' },
});

const AUTH_STORAGE_KEY = 'cervarent_auth_user';

/** Lit le token JWT stocké en localStorage, sous forme de header prêt à l'emploi. */
function getAuthHeader(): Record<string, string> {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return {};
  try {
    const { token } = JSON.parse(stored) as { token: string };
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Intercepteur de requête : attache automatiquement le token JWT (si présent)
 * à chaque appel Axios, sans avoir à le repasser manuellement dans chaque
 * fonction du service.
 */
apiClient.interceptors.request.use((config) => {
  const authHeader = getAuthHeader();
  if (authHeader.Authorization) {
    config.headers.Authorization = authHeader.Authorization;
  }
  return config;
});

/**
 * Intercepteur de réponse : si le backend renvoie 401/403 (token expiré ou
 * invalide), on nettoie la session et on redirige vers /login plutôt que
 * de laisser l'utilisateur face à des erreurs silencieuses.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** Callbacks appelés au fil de la réponse en streaming (voir streamAskQuestion). */
export interface StreamCallbacks {
  onSources?: (sources: SimpleSource[]) => void;
  onChunk?: (textDelta: string) => void;
  onDone?: (processingTimeMs: number) => void;
  onError?: (message: string) => void;
}

export interface UploadProgressCallbacks {
  onProgress?: (currentPage: number, totalPages: number, percent: number, chunksIndexed: number) => void;
}

/**
 * Découpe un évènement SSE brut (texte entre deux "\n\n") en son type
 * ("event:") et son contenu ("data:"), puis appelle le callback correspondant.
 */
function handleSseEvent(rawEvent: string, callbacks: StreamCallbacks): void {
  let eventType = 'message';
  const dataLines: string[] = [];

  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      // On garde tout ce qui suit "data:" tel quel (sans retirer d'espace) :
      // le backend n'insère aucun séparateur après "data:", et le fragment
      // Mistral commence souvent lui-même par un espace qui fait partie du
      // token — le retirer casserait l'espacement entre les mots.
      dataLines.push(line.slice('data:'.length));
    }
  }

  const data = dataLines.join('\n');

  switch (eventType) {
    case 'sources':
      callbacks.onSources?.(data ? (JSON.parse(data) as SimpleSource[]) : []);
      break;
    case 'chunk':
      callbacks.onChunk?.(data);
      break;
    case 'done': {
      const payload = data ? (JSON.parse(data) as { processingTimeMs: number }) : { processingTimeMs: 0 };
      callbacks.onDone?.(payload.processingTimeMs);
      break;
    }
    case 'error':
      callbacks.onError?.(data || 'Une erreur est survenue.');
      break;
    default:
      break;
  }
}

/** Lit un flux SSE (fetch + ReadableStream) et distribue chaque évènement complet reçu. */
async function consumeSseStream(
  response: Response,
  onEvent: (rawEvent: string) => void
): Promise<void> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      if (rawEvent.trim()) onEvent(rawEvent);
    }
  }
}

/**
 * Service regroupant tous les appels vers /api/rag/* et /api/feedback
 * (RagController.java / FeedbackController.java côté backend).
 */
export const ragApi = {
  /** POST /api/rag/ask — question/réponse complète (non streamée). */
  async askQuestion(payload: QuestionRequest): Promise<RagResponse> {
    const { data } = await apiClient.post<RagResponse>('/rag/ask', payload);
    return data;
  },

  /**
   * POST /api/rag/ask/stream — version streamée : la réponse arrive
   * fragment par fragment via Server-Sent Events.
   *
   * Utilise fetch() + ReadableStream plutôt que l'API EventSource native,
   * car EventSource ne supporte pas les requêtes POST avec corps JSON
   * (nécessaire ici pour transmettre question + topK + historique).
   */
  async streamAskQuestion(
    payload: QuestionRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const baseURL = apiClient.defaults.baseURL ?? '/api';

    const response = await fetch(`${baseURL}/rag/ask/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...getAuthHeader(), // fetch() n'est pas concerné par l'intercepteur axios
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Le serveur a répondu avec le statut ${response.status}`);
    }

    await consumeSseStream(response, (rawEvent) => handleSseEvent(rawEvent, callbacks));
  },

  /** POST /api/rag/index — indexation manuelle d'un document texte. */
  async indexDocument(payload: DocumentRequest): Promise<IndexResponse> {
    const { data } = await apiClient.post<IndexResponse>('/rag/index', payload);
    return data;
  },

  /**
   * GET /api/rag/documents — bibliothèque documentaire (documents regroupés
   * par source, avec nombre de chunks/taille/date). C'est la vue principale
   * pour afficher/gérer les documents indexés.
   */
  async getDocumentLibrary(): Promise<DocumentSummary[]> {
    const { data } = await apiClient.get<DocumentSummary[]>('/rag/documents');
    return data;
  },

  /** GET /api/rag/documents/chunks — tous les chunks bruts (debug uniquement). */
  async getAllChunks(): Promise<DocumentChunk[]> {
    const { data } = await apiClient.get<DocumentChunk[]>('/rag/documents/chunks');
    return data;
  },

  /** DELETE /api/rag/documents/{source} — supprime définitivement un document. */
  async deleteDocument(source: string): Promise<void> {
    await apiClient.delete(`/rag/documents/${encodeURIComponent(source)}`);
  },

  /** PUT /api/rag/documents/{source} — remplace le contenu d'un document et le réindexe. */
  async updateDocument(source: string, payload: DocumentRequest): Promise<void> {
    await apiClient.put(`/rag/documents/${encodeURIComponent(source)}`, payload);
  },

  /**
   * GET /api/rag/documents/{source}/download — télécharge le document COMPLET
   * (tous ses chunks recollés dans l'ordre), pas seulement l'extrait cité
   * par l'IA. Déclenche directement le téléchargement dans le navigateur.
   */
  async downloadDocument(source: string, suggestedFilename?: string): Promise<void> {
    const baseURL = apiClient.defaults.baseURL ?? '/api';

    const response = await fetch(`${baseURL}/rag/documents/${encodeURIComponent(source)}/download`, {
      method: 'GET',
      headers: { ...getAuthHeader() },
    });

    if (!response.ok) {
      throw new Error("Impossible de télécharger ce document.");
    }

    // Le backend fixe déjà un nom de fichier via Content-Disposition ; on le
    // relit ici pour respecter exactement ce nom côté navigateur.
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    const filename = match ? decodeURIComponent(match[1]) : (suggestedFilename ?? `${source}.txt`);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * GET /api/rag/documents/{source}/preview — récupère le document original
   * (blob binaire tel qu'uploadé) pour l'afficher DANS l'application
   * (fenêtre de prévisualisation), sans déclencher de téléchargement.
   *
   * Retourne `null` si aucun fichier original n'est disponible pour cette
   * source (ex : document indexé avant la mise en place de Supabase Storage) :
   * le composant appelant doit alors proposer un repli (ex: afficher
   * uniquement l'extrait texte déjà connu côté frontend).
   */
  async previewDocument(source: string): Promise<{ blob: Blob; contentType: string } | null> {
    const baseURL = apiClient.defaults.baseURL ?? '/api';

    const response = await fetch(`${baseURL}/rag/documents/${encodeURIComponent(source)}/preview`, {
      method: 'GET',
      headers: { ...getAuthHeader() },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error("Impossible de charger l'aperçu de ce document.");
    }

    const blob = await response.blob();
    const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';
    return { blob, contentType };
  },

  /** POST /api/rag/upload — upload d'un fichier (PDF, TXT, DOCX) pour indexation. */
  async uploadFile(file: File, mode: UploadMode = 'thinking'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    const { data } = await apiClient.post<UploadResponse>('/rag/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** GET /api/rag/files/{fileId}/status — statut de traitement d'un fichier uploadé en mode "instant". */
  async getFileStatus(fileId: number): Promise<UploadResponse> {
    const { data } = await apiClient.get<UploadResponse>(`/rag/files/${fileId}/status`);
    return data;
  },

  /** GET /api/rag/health — vérifie que le backend répond correctement. */
  async health(): Promise<HealthResponse> {
    const { data } = await apiClient.get<HealthResponse>('/rag/health');
    return data;
  },

  /**
   * GET /api/rag/upload/{fileId}/progress — flux SSE de progression d'un
   * upload en cours (mode "instant"), page par page. Renvoie une fonction
   * "stop" pour interrompre l'écoute si le composant est démonté avant la fin.
   */
  watchUploadProgress(fileId: number, callbacks: UploadProgressCallbacks): () => void {
    const baseURL = apiClient.defaults.baseURL ?? '/api';
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${baseURL}/rag/upload/${fileId}/progress`, {
          headers: { Accept: 'text/event-stream', ...getAuthHeader() },
          signal: controller.signal,
        });

        await consumeSseStream(response, (rawEvent) => {
          const dataLine = rawEvent.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) return;
          const payload = JSON.parse(dataLine.slice('data:'.length));
          callbacks.onProgress?.(payload.currentPage, payload.totalPages, payload.percent, payload.chunksIndexed);
        });
      } catch {
        // Flux interrompu (fin normale du traitement ou composant démonté) : silencieux
      }
    })();

    return () => controller.abort();
  },

  /** POST /api/feedback — envoie un avis (pouce haut/bas) sur une réponse donnée. */
  async submitFeedback(question: string, answer: string, rating: 'UP' | 'DOWN'): Promise<void> {
    await apiClient.post('/feedback', { question, answer, rating });
  },
};

// Réexporté pour que ChatWindow.tsx puisse typer son historique sans
// importer directement depuis types/api.ts à deux endroits différents.
export type { ChatTurn };

export default apiClient;
