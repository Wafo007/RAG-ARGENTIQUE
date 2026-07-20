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
    completed_at    TIMESTAMP,

    -- ============================================================
    -- NOUVEAU : traçabilité du document ORIGINAL dans Supabase Storage.
    -- Sans ces colonnes, seuls les chunks/embeddings étaient conservés,
    -- rendant impossible tout téléchargement/prévisualisation du fichier
    -- réel uploadé par l'utilisateur.
    -- ============================================================
    storage_bucket  VARCHAR(100),           -- nom du bucket Supabase (ex: 'documents')
    storage_path    VARCHAR(500),           -- chemin relatif dans le bucket (ex: 'uuid/rapport.pdf')
    public_url      TEXT,                   -- dernière URL signée générée (cache, peut expirer)
    mime_type       VARCHAR(150),           -- type MIME précis (ex: application/pdf)
    extension       VARCHAR(20),            -- extension normalisée (ex: 'pdf', 'docx', 'txt', 'png')
    updated_at      TIMESTAMP DEFAULT NOW() -- dernière modification de la ligne
);

-- Migration idempotente : ajoute les colonnes si la table existe déjà avec
-- l'ancien schéma (exécution sans danger, ne modifie rien si déjà présent).
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(100);
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS storage_path   VARCHAR(500);
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS public_url     TEXT;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS mime_type      VARCHAR(150);
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS extension      VARCHAR(20);
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP DEFAULT NOW();

-- Un fichier physique est retrouvé par nom lors du téléchargement/preview
-- (la colonne "source" de document_chunks correspond à "filename" ici) :
-- un index accélère cette recherche.
CREATE INDEX IF NOT EXISTS idx_uploaded_files_filename
    ON uploaded_files (filename);

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
