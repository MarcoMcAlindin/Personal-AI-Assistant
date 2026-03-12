# VibeOS — Supabase Setup Guide

## 1. Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Select your preferred region (recommend `eu-west-1` for Scotland proximity)
3. Save your project URL and keys from **Settings → API**

## 2. Enable Extensions

```sql
-- Enable pgvector for AI embeddings (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_cron for scheduled task archiving
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

## 3. Create Tables

Run the SQL from `schema_reference.md` in the **SQL Editor** to create all tables.

## 4. Configure Row Level Security (RLS)

Enable RLS on every table and create policies:

```sql
-- Example: users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Repeat similar patterns for all tables:
-- chat_history, email_whitelist, health_metrics, tasks
```

## 5. Set Up pg_cron (Midnight Task Archiving)

```sql
-- Archive all active tasks at midnight GMT every day
SELECT cron.schedule(
  'archive-daily-tasks',
  '0 0 * * *',
  $$
    UPDATE tasks
    SET is_archived = TRUE
    WHERE is_archived = FALSE
      AND date < CURRENT_DATE;
  $$
);
```

## 6. Configure Google OAuth

1. Go to **Authentication → Providers → Google** in Supabase dashboard
2. Enable Google provider
3. Add your Google OAuth Client ID and Client Secret
4. Configure authorized redirect URLs

## 7. Using MCP Tool

You can interact with your Supabase project directly using the **Supabase MCP tool**:

```
# List projects
mcp_supabase_list_projects

# List tables
mcp_supabase_list_tables (project_id, schemas: ["public"], verbose: true)

# Run migrations
mcp_supabase_apply_migration (project_id, name, query)

# Execute SQL
mcp_supabase_execute_sql (project_id, query)
```
