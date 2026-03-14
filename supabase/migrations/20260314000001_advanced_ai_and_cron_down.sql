-- VOS-002: Revert Advanced PG Features

-- 1. Unschedule the cron job
SELECT cron.unschedule('midnight-archive');

-- 2. Revert index to IVFFlat if preferred, or just drop
DROP INDEX IF EXISTS chat_history_embedding_hnsw_idx;
CREATE INDEX IF NOT EXISTS chat_history_embedding_idx ON public.chat_history USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
