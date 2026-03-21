# SuperCyan - Supabase Schema Reference

Full database schema derived from the PRD data model.

---

## Table: `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `auth.uid)` | Supabase Auth user ID |
| `email` | `text` | NOT NULL | User email |
| `display_name` | `text` | | User display name |
| `avatar_url` | `text` | | Profile picture URL |
| `settings` | `jsonb` | DEFAULT `'{}'` | General app settings |
| `created_at` | `timestamptz` | DEFAULT `now()` | Account creation time |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last update time |

---

## Table: `chat_history`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Message ID |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | Owner |
| `role` | `text` | NOT NULL, CHECK `IN ('user', 'assistant')` | Message sender |
| `message` | `text` | NOT NULL | Message content |
| `timestamp` | `timestamptz` | DEFAULT `now()` | When sent |
| `is_saved` | `boolean` | DEFAULT `FALSE` | Pinned/saved (bypasses 10-day cleanup) |
| `embedding` | `vector(1536)` | | pgvector embedding for RAG |

**Indexes:**
- `idx_chat_history_user_timestamp` on `(user_id, timestamp DESC)`
- `idx_chat_history_embedding` using IVFFlat on `embedding` (for cosine similarity)

---

## Table: `email_whitelist`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Entry ID |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | Owner |
| `email_address` | `text` | NOT NULL | Approved sender address |
| `contact_name` | `text` | | Friendly name for the contact |
| `created_at` | `timestamptz` | DEFAULT `now()` | When added |

**Indexes:**
- `idx_whitelist_user_email` UNIQUE on `(user_id, email_address)`

---

## Table: `health_metrics`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Record ID |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | Owner |
| `date` | `date` | NOT NULL | Metric date |
| `water_liters` | `numeric(4,2)` | DEFAULT `0` | Daily water intake (liters) |
| `sleep_duration` | `numeric(4,2)` | | Sleep hours |
| `avg_heart_rate` | `integer` | | Average heart rate (bpm) |
| `raw_watch_data` | `jsonb` | | Full Samsung Watch sync payload |
| `ai_analysis` | `text` | | Qwen3.5-9B-Instruct generated health analysis |
| `created_at` | `timestamptz` | DEFAULT `now()` | Record creation |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last update |

**Indexes:**
- `idx_health_user_date` UNIQUE on `(user_id, date)`

---

## Table: `tasks`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Task ID |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | Owner |
| `date` | `date` | NOT NULL, DEFAULT `CURRENT_DATE` | Task date |
| `title` | `text` | NOT NULL | Task name |
| `description` | `text` | | Task details |
| `duration` | `integer` | | Duration in minutes |
| `time` | `time` | | Scheduled time |
| `status` | `text` | DEFAULT `'pending'`, CHECK `IN ('pending', 'in_progress', 'done')` | Task status |
| `is_archived` | `boolean` | DEFAULT `FALSE` | Flipped to TRUE by pg_cron at midnight |
| `created_at` | `timestamptz` | DEFAULT `now()` | When created |

**Indexes:**
- `idx_tasks_user_date` on `(user_id, date)`
- `idx_tasks_archived` on `(is_archived)` WHERE `is_archived = FALSE`

---

## Required Extensions

| Extension | Purpose |
|-----------|---------|
| `pgvector` | Vector embeddings for RAG semantic search |
| `pg_cron` | Scheduled midnight task archiving |

## pg_cron Job

```sql
SELECT cron.schedule(
  'archive-daily-tasks',
  '0 0 * * *',
  $$UPDATE tasks SET is_archived = TRUE WHERE is_archived = FALSE AND date < CURRENT_DATE;$$
);
```
