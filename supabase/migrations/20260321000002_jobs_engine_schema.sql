-- Create Enum Types
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED');
CREATE TYPE inbox_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE application_status AS ENUM ('READY_TO_APPLY', 'APPLIED', 'INTERVIEWING', 'OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN');

-- CV Files Table
CREATE TABLE public.cv_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    parsed_text TEXT,
    parsed_metadata JSONB,
    embedding VECTOR(1536),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_primary BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_cv_user ON public.cv_files(user_id);
CREATE INDEX idx_cv_primary ON public.cv_files(user_id, is_primary) WHERE is_primary = TRUE;
ALTER TABLE public.cv_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own CV files" ON public.cv_files USING (auth.uid() = user_id);

-- Campaigns Table
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cv_file_id UUID REFERENCES public.cv_files(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    status campaign_status DEFAULT 'DRAFT',
    job_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    search_sources JSONB DEFAULT '["linkedin", "indeed", "crustdata"]'::jsonb,
    search_frequency_hours INTEGER DEFAULT 24,
    max_results_per_run INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    total_jobs_found INTEGER DEFAULT 0,
    total_jobs_matched INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT
);
CREATE INDEX idx_campaigns_user_status ON public.campaigns(user_id, status);
CREATE INDEX idx_campaigns_next_run ON public.campaigns(next_run_at) WHERE status = 'RUNNING';
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own campaigns" ON public.campaigns USING (auth.uid() = user_id);

-- Inbox Items Table
CREATE TABLE public.inbox_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_logo_url VARCHAR(500),
    location VARCHAR(255),
    remote_type VARCHAR(50),
    salary_range VARCHAR(100),
    source VARCHAR(100) NOT NULL,
    external_job_id VARCHAR(255),
    job_url TEXT NOT NULL,
    job_description TEXT NOT NULL,
    job_description_html TEXT,
    match_score DECIMAL(3,2) CHECK (match_score >= 0 AND match_score <= 1),
    match_reasoning TEXT,
    extracted_requirements JSONB,
    keyword_matches JSONB,
    status inbox_status DEFAULT 'PENDING_REVIEW',
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(1536)
);
CREATE INDEX idx_inbox_user_status_score ON public.inbox_items(user_id, status, match_score DESC);
CREATE INDEX idx_inbox_discovered_at ON public.inbox_items(discovered_at DESC);
CREATE INDEX idx_inbox_job_desc_fts ON public.inbox_items USING gin(to_tsvector('english', job_description));
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inbox items" ON public.inbox_items USING (auth.uid() = user_id);

-- Applications Table
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inbox_item_id UUID UNIQUE REFERENCES public.inbox_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    cover_letter_text TEXT NOT NULL,
    cover_letter_metadata JSONB DEFAULT '{}'::jsonb,
    status application_status DEFAULT 'READY_TO_APPLY',
    applied_at TIMESTAMP WITH TIME ZONE,
    application_method VARCHAR(100),
    interview_dates JSONB DEFAULT '[]'::jsonb,
    offer_details JSONB,
    user_notes TEXT,
    next_followup_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_applications_user_status ON public.applications(user_id, status);
CREATE INDEX idx_applications_created_at ON public.applications(created_at DESC);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own applications" ON public.applications USING (auth.uid() = user_id);

-- Scrape Logs Table
CREATE TABLE public.scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL,
    search_query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    duration_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_scrape_campaign ON public.scrape_logs(campaign_id);
CREATE INDEX idx_scrape_source ON public.scrape_logs(source, started_at);
ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scrape logs" ON public.scrape_logs USING (auth.uid() IN (SELECT user_id FROM public.campaigns WHERE id = campaign_id));
