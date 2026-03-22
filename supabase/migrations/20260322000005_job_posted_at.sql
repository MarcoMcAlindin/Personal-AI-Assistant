-- Add job_posted_at to inbox_items
-- This stores the actual date the job was posted on the source platform,
-- as opposed to discovered_at which is when our scraper found it.
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS job_posted_at timestamptz;
