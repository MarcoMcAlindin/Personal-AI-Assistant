---
name: supabase-rollback-strategist
description: Mandates the creation of 'Down' migrations for every 'Up' migration.
---
# Supabase Rollback Strategist
## When to use this skill
- When generating any `.sql` file in the `/supabase/migrations` directory.
## How to use it
1. **The Revert Plan:** For every `CREATE TABLE` or `ALTER TABLE`, you MUST write the exact inverse command (e.g., `DROP TABLE`).
2. **Data Preservation:** If dropping a column, ensure you write a temporary backup strategy.
