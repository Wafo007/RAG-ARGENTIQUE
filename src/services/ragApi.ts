import axios from 'axios';
import type {
  ChatTurn,
  DocumentChunk,
  DocumentRequest,
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
  headers: {
    Accept: 'application/json',
  },
});

/**
 * Callbacks appelés au fil de la réponse en streaming (voir streamAskQuestion).
 * Tous optionnels : un appelant peut ne s'intéresser qu'à certains évènements.
 */
export interface StreamCallbacks {
  /** Appelé une fois, dès que les sources documentaires sont connues (avant le texte) */
  onSources?: (sources: SimpleSource[]) => void;
  /** Appelé à chaque fragment de texte reçu */
  onChunk?: (textDelta: string) => void;
  /** Appelé une fois, à la fin du flux, avec le temps de traitement total */
  onDone?: (processingTimeMs: number) => void;
  /** Appelé en cas d'erreur côté serveur pendant la génération */
  onError?: (message: string) => void;
}

/**
 * Découpe un évènement SSE brut (texte entre deux "\n\n") en son type
 * ("event:") et son contenu ("data:"), puis appelle le callback correspondant.
 *
 * Format SSE rappel :
 *   event: chunk
 *   data: voici un fragment de texte
 *
 * Une ligne "data:" peut apparaître plusieurs fois pour un même évènement
 * (texte multi-lignes côté serveur) : on les rejoint avec "\n".
 */

function handleSseEvent(rawEvent: string, callbacks: StreamCallbacks): void {
  let eventType = 'message';
  const dataLines: string[] = [];

  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      // CORRECTIF DÉFINITIF : on garde TOUT ce qui suit "data:" tel quel,
      // sans retirer le moindre caractère. Notre backend (RagService.java)
      // n'insère aucun espace de séparation après "data:" : ce qui suit les
      // deux-points est le contenu EXACT du fragment Mistral. Comme ce
      // fragment commence très souvent lui-même par un espace (convention
      // des tokenizers type Mistral/GPT, l'espace fait partie du token), le
      // retirer — même un seul, "par convention SSE" — détruit l'espacement
      // réel entre les mots. D'où le bug des mots collés malgré le 1er correctif.
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

/**
 * Service regroupant tous les appels vers /api/rag/*
 * (RagController.java côté backend).
 */
export const ragApi = {
  /**
   * POST /api/rag/ask
   * Pose une question au moteur RAG et reçoit une réponse générée par l'IA
   * accompagnée des sources documentaires utilisées (réponse complète, non streamée).
   */
  async askQuestion(payload: QuestionRequest): Promise<RagResponse> {
    const { data } = await apiClient.post<RagResponse>('/rag/ask', payload);
    return data;
  },

  /**
   * POST /api/rag/ask/stream
   * Version streamée de askQuestion : la réponse arrive fragment par fragment
   * via Server-Sent Events, et chaque fragment déclenche le callback approprié.
   *
   * Pourquoi fetch() + ReadableStream plutôt que l'API EventSource native ?
   * → EventSource ne supporte que les requêtes GET, sans corps de requête.
   *   Ici on doit envoyer la question, topK ET l'historique de conversation,
   *   ce qui nécessite un POST avec un corps JSON. fetch() le permet, et son
   *   response.body (un ReadableStream) permet de lire la réponse au fur et
   *   à mesure qu'elle arrive plutôt que d'attendre sa fin.
   *
   * @param payload Question, topK et historique
   * @param callbacks Fonctions appelées au fil des évènements reçus
   * @param signal AbortSignal optionnel, pour interrompre la génération (bouton "Stop")
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
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Le serveur a répondu avec le statut ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    // Boucle de lecture du flux : chaque itération récupère un nouveau morceau
    // de bytes, le décode en texte, et l'ajoute au buffer. On en extrait ensuite
    // tous les évènements SSE complets (séparés par une ligne vide "\n\n") déjà
    // disponibles, en gardant le reste (évènement potentiellement incomplet)
    // pour la prochaine itération.
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        if (rawEvent.trim()) {
          handleSseEvent(rawEvent, callbacks);
        }
      }
    }
  },

  /**
   * POST /api/rag/index
   * Indexe manuellement un document texte (titre + contenu + source optionnelle).
   */
  async indexDocument(payload: DocumentRequest): Promise<IndexResponse> {
    const { data } = await apiClient.post<IndexResponse>('/rag/index', payload);
    return data;
  },

  /**
   * GET /api/rag/documents
   * Récupère tous les chunks de documents indexés (vue "bibliothèque").
   */
  async getAllDocuments(): Promise<DocumentChunk[]> {
    const { data } = await apiClient.get<DocumentChunk[]>('/rag/documents');
    return data;
  },

  /**
   * POST /api/rag/upload
   * Upload un fichier (PDF, TXT, DOCX) pour indexation.
   * mode = "thinking" (synchrone) ou "instant" (asynchrone).
   */
  async uploadFile(file: File, mode: UploadMode = 'thinking'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    const { data } = await apiClient.post<UploadResponse>('/rag/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * GET /api/rag/files/{fileId}/status
   * Vérifie le statut de traitement d'un fichier uploadé en mode "instant".
   */
  async getFileStatus(fileId: number): Promise<UploadResponse> {
    const { data } = await apiClient.get<UploadResponse>(`/rag/files/${fileId}/status`);
    return data;
  },

  /**
   * GET /api/rag/health
   * Vérifie que le backend (et le service IA) répond correctement.
   */
  async health(): Promise<HealthResponse> {
    const { data } = await apiClient.get<HealthResponse>('/rag/health');
    return data;
  },
};

// Réexporté pour que ChatWindow.tsx puisse typer son historique sans
// importer directement depuis types/api.ts à deux endroits différents.
export type { ChatTurn };

export default apiClient;