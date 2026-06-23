/**
 * Types TypeScript correspondant exactement aux DTOs Java du backend
 * (package com.Cervarent.RAG.dto).
 *
 * Les garder synchronisés avec le backend évite les bugs silencieux
 * dus à des champs renommés ou manquants.
 */

/** Correspond à QuestionRequest.java */
export interface QuestionRequest {
  question: string;
  topK?: number;
}

/** Correspond à RagResponse.SimpleSource (sous-objet de RagResponse.java) */
export interface SimpleSource {
  documentTitle: string;
  source: string;
}

/** Correspond à RagResponse.java — réponse renvoyée par POST /api/rag/ask */
export interface RagResponse {
  answer: string;
  sources: SimpleSource[];
  processingTimeMs: number;
}

/** Correspond à DocumentRequest.java — utilisé par POST /api/rag/index */
export interface DocumentRequest {
  title: string;
  content: string;
  source?: string;
}

/** Correspond à DocumentChunk.java — renvoyé par GET /api/rag/documents */
export interface DocumentChunk {
  id: number;
  documentTitle: string;
  content: string;
  chunkIndex: number;
  embedding?: string;
  source: string;
  createdAt: string;
}

/**
 * Statuts possibles d'un fichier uploadé,
 * tels que définis côté backend (FileUploadService).
 */
export type UploadStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** Mode de traitement de l'upload (voir RagController#uploadFile) */
export type UploadMode = 'thinking' | 'instant';

/** Correspond à UploadResponse.java */
export interface UploadResponse {
  fileId: number;
  filename: string;
  mode: UploadMode;
  status: UploadStatus;
  chunksCount: number | null;
  message: string;
  createdAt: string;
}

/** Réponse générique du endpoint /api/rag/health */
export interface HealthResponse {
  status: string;
  service: string;
}

/** Réponse générique du endpoint POST /api/rag/index */
export interface IndexResponse {
  status: string;
  message: string;
}
