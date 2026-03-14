-- Revert Schema Creation (Down Migration)
-- Drops the tables and extensions created in the corresponding "Up" migration

-- 1. Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Drop policies (Optional, since dropping tables drops the policies, but cleanly defined)
DROP POLICY IF EXISTS "Users can only access their own user data" ON public.users;
DROP POLICY IF EXISTS "Users can only access their own chats" ON public.chat_history;
DROP POLICY IF EXISTS "Users can only access their own whitelist" ON public.email_whitelist;
DROP POLICY IF EXISTS "Users can only access their own health metrics" ON public.health_metrics;
DROP POLICY IF EXISTS "Users can only access their own tasks" ON public.tasks;

-- 3. Drop tables
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.health_metrics CASCADE;
DROP TABLE IF EXISTS public.email_whitelist CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 4. Drop extensions (CAUTION: only drop these if no other tables use them)
-- DROP EXTENSION IF EXISTS vector;
-- DROP EXTENSION IF EXISTS pg_cron;
