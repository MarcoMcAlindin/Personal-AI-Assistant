-- Migration: Revert Core VibeOS Schema (VOS-001)

-- 1. Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Drop Tables (these will also drop the policies attached to them)
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.health_metrics;
DROP TABLE IF EXISTS public.email_whitelist;
DROP TABLE IF EXISTS public.chat_history;
DROP TABLE IF EXISTS public.users;

-- 3. Drop Extensions (be careful with this if other tables in the future use them)
-- DROP EXTENSION IF EXISTS vector;
-- DROP EXTENSION IF EXISTS pg_cron;
-- Commented out extensions drop specifically since it can be destructive to other schemas, but can be manually run if this is the ONLY migration using them.
