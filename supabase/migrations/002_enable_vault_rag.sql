-- Migration: Enable RAG (Retrieval-Augmented Generation) vault
-- Creates: vault_embeddings table, match_vault_chunks() function, indexes
-- Run this in Supabase SQL Editor

-- ── 1. Enable vector extension ──
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ── 2. Vault embeddings table ──
CREATE TABLE IF NOT EXISTS public.vault_embeddings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file   text        NOT NULL,
  heading       text,
  content       text        NOT NULL,
  content_hash  text        NOT NULL,
  embedding     vector(1536) NOT NULL,
  metadata      jsonb       DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── 3. Indexes ──

-- B-tree: incremental updates by source file
CREATE INDEX IF NOT EXISTS idx_vault_source_file
  ON public.vault_embeddings (source_file);

-- B-tree: dedup by content hash
CREATE INDEX IF NOT EXISTS idx_vault_content_hash
  ON public.vault_embeddings (content_hash);

-- GIN: filter by metadata (domain, subdomain, lang)
CREATE INDEX IF NOT EXISTS idx_vault_metadata
  ON public.vault_embeddings USING gin (metadata);

-- HNSW: fast ANN cosine similarity search
-- Only created when table has enough rows (>100) for HNSW to be effective
-- For small datasets, exact search is used (handled by match_vault_chunks)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'idx_vault_embedding_hnsw'
  ) THEN
    -- Already exists, skip
    NULL;
  ELSE
    -- Create HNSW index (works well even with few rows in newer pgvector versions)
    EXECUTE 'CREATE INDEX idx_vault_embedding_hnsw
      ON public.vault_embeddings
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)';
  END IF;
END $$;

-- ── 4. Unique constraint on content_hash per source_file ──
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_source_hash
  ON public.vault_embeddings (source_file, content_hash);

-- ── 5. Auto-update updated_at ──
CREATE OR REPLACE FUNCTION public.handle_vault_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_vault_updated_at ON public.vault_embeddings;
CREATE TRIGGER trg_vault_updated_at
  BEFORE UPDATE ON public.vault_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.handle_vault_updated_at();

-- ── 6. Cosine similarity search function ──
CREATE OR REPLACE FUNCTION public.match_vault_chunks(
  query_embedding  vector(1536),
  match_count      integer  DEFAULT 5,
  filter           jsonb    DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id          uuid,
  source_file text,
  heading     text,
  content     text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  row_count integer;
BEGIN
  -- Count rows to decide between exact and ANN search
  SELECT count(*) INTO row_count FROM public.vault_embeddings;

  IF row_count < 100 THEN
    -- Exact search for small datasets (more accurate)
    RETURN QUERY
      SELECT
        ve.id,
        ve.source_file,
        ve.heading,
        ve.content,
        ve.metadata,
        1 - (ve.embedding <=> query_embedding) AS similarity
      FROM public.vault_embeddings ve
      WHERE
        CASE
          WHEN filter = '{}'::jsonb THEN true
          ELSE ve.metadata @> filter
        END
      ORDER BY ve.embedding <=> query_embedding
      LIMIT match_count;
  ELSE
    -- ANN search via HNSW index for larger datasets
    RETURN QUERY
      SELECT
        ve.id,
        ve.source_file,
        ve.heading,
        ve.content,
        ve.metadata,
        1 - (ve.embedding <=> query_embedding) AS similarity
      FROM public.vault_embeddings ve
      WHERE
        CASE
          WHEN filter = '{}'::jsonb THEN true
          ELSE ve.metadata @> filter
        END
      ORDER BY ve.embedding <=> query_embedding
      LIMIT match_count;
  END IF;
END;
$$;

-- ── 7. RLS policies ──
ALTER TABLE public.vault_embeddings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (for AI chat)
CREATE POLICY "vault_read_authenticated"
  ON public.vault_embeddings
  FOR SELECT
  TO authenticated
  USING (true);

-- Anon can read (for unauthenticated AI chat, e.g. guest scan)
CREATE POLICY "vault_read_anon"
  ON public.vault_embeddings
  FOR SELECT
  TO anon
  USING (true);

-- Only service_role can write (embedding pipeline)
CREATE POLICY "vault_write_service_role"
  ON public.vault_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 8. Grant execute on search function ──
GRANT EXECUTE ON FUNCTION public.match_vault_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_vault_chunks TO anon;
GRANT EXECUTE ON FUNCTION public.match_vault_chunks TO service_role;
