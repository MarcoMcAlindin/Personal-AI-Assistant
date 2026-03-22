-- Drop Tables
DROP TABLE IF EXISTS public.scrape_logs CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.inbox_items CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.cv_files CASCADE;

-- Drop Enums
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS inbox_status CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
