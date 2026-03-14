---
trigger: glob
globs: supabase/migrations/*.sql
---

# Secure Database Migrations

Every time you create or alter a table in PostgreSQL:
1. **RLS Mandate:** You must explicitly append `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;`.
2. **Owner Policies:** You must write `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies that strictly constrain access to the authenticated user (`auth.uid() = user_id`).
3. Never create a table without an indexed Primary Key.