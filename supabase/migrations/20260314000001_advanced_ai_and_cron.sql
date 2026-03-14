-- VOS-002: Advanced PG Features (pgvector & pg_cron)

-- 1. Ensure extensions are available (redundant but safe)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule Midnight Archive Job
-- Every single night at exactly midnight, flip is_archived to TRUE for yesterday's tasks.
SELECT cron.schedule('midnight-archive', '0 0 * * *', 
  $$UPDATE public.tasks SET is_archived = TRUE WHERE is_archived = FALSE AND date < CURRENT_DATE$$);

-- 3. HNSW Index Optimization for Vector Search
-- Note: This requires enough rows to be effective, but setting up the structure now.
-- We already have ivfflat in the previous migration, but HNSW is generally more performant for RAG.
-- We will drop the old one and use HNSW if the model allows.
DROP INDEX IF EXISTS chat_history_embedding_idx;
CREATE INDEX chat_history_embedding_hnsw_idx ON public.chat_history USING hnsw (embedding vector_cosine_ops);
