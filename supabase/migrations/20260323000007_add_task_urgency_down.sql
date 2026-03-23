-- Rollback: remove urgency column from tasks
ALTER TABLE tasks DROP COLUMN IF EXISTS urgency;
