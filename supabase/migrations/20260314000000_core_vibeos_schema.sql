-- Migration: Create Core VibeOS Schema (VOS-001)

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create Tables

-- users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    oauth_tokens JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- chat_history
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_saved BOOLEAN DEFAULT FALSE,
    embedding VECTOR(1536)
);

-- email_whitelist
CREATE TABLE IF NOT EXISTS public.email_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    contact_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, email_address)
);

-- health_metrics
CREATE TABLE IF NOT EXISTS public.health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    water_liters NUMERIC DEFAULT 0,
    sleep_duration NUMERIC DEFAULT 0,
    avg_heart_rate INTEGER DEFAULT 0,
    raw_watch_data JSONB DEFAULT '{}'::jsonb,
    ai_analysis TEXT,
    UNIQUE(user_id, date)
);

-- tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER,
    time TIME,
    status TEXT DEFAULT 'pending',
    is_archived BOOLEAN DEFAULT FALSE
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS chat_history_embedding_idx ON public.chat_history USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS chat_history_is_saved_idx ON public.chat_history(is_saved);

-- 4. Row Level Security (RLS) policies

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "Users can only access their own user data" 
    ON public.users 
    FOR ALL 
    USING (auth.uid() = id);

-- chat_history policies
CREATE POLICY "Users can only access their own chats" 
    ON public.chat_history 
    FOR ALL 
    USING (auth.uid() = user_id);

-- email_whitelist policies
CREATE POLICY "Users can only access their own whitelist" 
    ON public.email_whitelist 
    FOR ALL 
    USING (auth.uid() = user_id);

-- health_metrics policies
CREATE POLICY "Users can only access their own health metrics" 
    ON public.health_metrics 
    FOR ALL 
    USING (auth.uid() = user_id);

-- tasks policies
CREATE POLICY "Users can only access their own tasks" 
    ON public.tasks 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 5. Trigger to handle auth.users insertion
-- Automatically creates a public.users row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
