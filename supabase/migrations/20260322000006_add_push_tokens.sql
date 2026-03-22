-- Add push_tokens JSONB column to users table
-- Stores device push notification tokens as a JSON array.
-- GIN index added for efficient jsonb array membership queries.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS push_tokens JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS users_push_tokens_gin_idx
    ON public.users
    USING gin(push_tokens);
