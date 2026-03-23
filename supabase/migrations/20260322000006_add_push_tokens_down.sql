-- Down migration: remove push_tokens column and index from users table
DROP INDEX IF EXISTS users_push_tokens_gin_idx;

ALTER TABLE public.users
    DROP COLUMN IF EXISTS push_tokens;
