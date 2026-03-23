ALTER TABLE tasks
  ADD COLUMN urgency TEXT NOT NULL DEFAULT 'medium'
  CHECK (urgency IN ('high', 'medium', 'low'));
