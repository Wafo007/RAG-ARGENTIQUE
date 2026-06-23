import axios from 'axios';
import type {
  DocumentChunk,
  DocumentRequest,
  HealthResponse,
  IndexResponse,
  QuestionRequest,
  RagResponse,
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
 * Service regroupant tous les appels vers /api/rag/*
 * (RagController.java côté backend).
 */
export const ragApi = {
  /**
   * POST /api/rag/ask
   * Pose une question au moteur RAG et reçoit une réponse générée par l'IA
   * accompagnée des sources documentaires utilisées.
   */
  async askQuestion(payload: QuestionRequest): Promise<RagResponse> {
    const { data } = await apiClient.post<RagResponse>('/rag/ask', payload);
    return data;
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

export default apiClient;
