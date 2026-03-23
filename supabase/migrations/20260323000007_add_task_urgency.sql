-- Add urgency level column to tasks (high / medium / low)
ALTER TABLE tasks
  ADD COLUMN urgency TEXT NOT NULL DEFAULT 'medium'
    CONSTRAINT tasks_urgency_valid CHECK (urgency IN ('high', 'medium', 'low'));
