# HANDOFF: VOS-001 (Schema Design)

- **Date:** 2026-03-14
- **Recipient:** Mr. Pink (Auditor) / CEO
- **Task ID:** [VOS-001]

## Summary
Completed the foundational Supabase database schema design. This includes the creation of 5 core tables (`users`, `chat_history`, `email_whitelist`, `health_metrics`, `tasks`), implementation of Row Level Security (RLS) policies, and setting up automated user duplication from `auth.users` to `public.users`.

## Changed Files
- `supabase/migrations/20260314000000_core_vibeos_schema.sql` (Up Migration)
- `supabase/migrations/20260314000000_core_vibeos_schema_down.sql` (Down Migration)
- `.agent/handoffs/phase_1_foundation/VOS-001-HANDOFF.md` (This file)

## Strict Testing Instructions (Rule 18)
To verify the schema and RLS policies locally, execute the following commands:

1. **Local Initialization:**
   ```bash
   supabase start
   supabase db reset
   ```

2. **Schema Verification:**
   ```bash
   supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'chat_history', 'email_whitelist', 'health_metrics', 'tasks');"
   ```

3. **RLS Verification:**
   ```bash
   supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
   ```

4. **Rollback Verification (Passes if no errors):**
   ```bash
   supabase migration down
   ```

## Environment Variable Changes
None. Supabase credentials are handled via the CLI/Dashboard.

## API / Database Schema Changes
- **New Tables:** `users`, `chat_history`, `email_whitelist`, `health_metrics`, `tasks`.
- **Enabled Extensions:** `vector`, `pg_cron`.
- **HNSW Index:** Added to `chat_history.embedding`.

## Notes for Next Agent
- **Mr. Green (Backend):** You can now begin implementing the FastAPI routes. The `chat_history` table is ready for pgvector queries.
- **Mr. Red (AI Infra):** The schema supports the 10-day rolling context window and permanent "Save" logic via the `is_saved` column.
