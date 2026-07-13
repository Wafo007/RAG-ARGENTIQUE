-- ============================================================
-- SCHEMA DE BASE DE DONNEES - CERVARENT RAG
-- PostgreSQL + extension pgvector (compatible Supabase)
-- ============================================================
-- A executer une seule fois, avant le premier lancement du backend,
-- dans l'editeur SQL de Supabase (ou tout client psql connecte a la base).

-- Extension nécessaire pour stocker et comparer des vecteurs d'embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Documents indexés (RAG)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_chunks (
    id              BIGSERIAL PRIMARY KEY,
    document_title  VARCHAR(255) NOT NULL,
    content         VARCHAR(4000) NOT NULL,
    chunk_index     INTEGER,
    embedding       vector(1024),
    source          VARCHAR(255),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Index de recherche par similarité vectorielle (accélère la recherche RAG)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 1);

-- Index utilisé par la bibliothèque documentaire (regroupement par source)
CREATE INDEX IF NOT EXISTS idx_document_chunks_source
    ON document_chunks (source);

-- ============================================================
-- Fichiers uploadés (suivi du traitement PDF/TXT/DOCX)
-- ============================================================
CREATE TABLE IF NOT EXISTS uploaded_files (
    id              BIGSERIAL PRIMARY KEY,
    filename        VARCHAR(255) NOT NULL,
    content_type    VARCHAR(100),
    file_size       BIGINT,
    extracted_text  TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    chunks_count    INTEGER,
    error_message   TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP
);

-- ============================================================
-- Utilisateurs (authentification simple : username + mot de passe)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Avis utilisateurs sur les réponses de l'IA (pouce haut / bas)
-- ============================================================
CREATE TABLE IF NOT EXISTS message_feedback (
    id              BIGSERIAL PRIMARY KEY,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    rating          VARCHAR(10) NOT NULL, -- 'UP' ou 'DOWN'
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);
