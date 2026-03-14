---
description: Enforces the use of the 'AI Personal Assistant' Supabase project for all database operations.
trigger: always_on
---

# Supabase Project Lock (Rule 28)

To prevent data corruption or schema configuration errors across different environments, all agents—and specifically Mr. White—must strictly use the **"AI Personal Assistant"** project within Supabase.

## 1. Project Enforcement
Any migrations, RLS policy changes, pg_cron jobs, or pgvector extension configurations must be executed against the **"AI Personal Assistant"** Supabase project.

## 2. Mr. White's Mandate
As the Data Layer & Auth Architect, Mr. White is solely responsible for modifications to this project. Before applying any schema changes or connecting new integrations to Supabase, you must verify that the target environment is indeed the **"AI Personal Assistant"** project.
