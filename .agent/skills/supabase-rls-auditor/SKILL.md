---
name: supabase-rls-auditor
description: Guarantees that personal health data and tasks are never exposed via the public API.
---
# Supabase RLS Auditor
## When to use this skill
- After creating a new table or modifying existing schemas in the `/supabase` directory.
## How to use it
1. **Default Deny:** Ensure Row Level Security (RLS) is enabled on all tables by default.
2. **Owner-Only Access:** Write RLS policies that strictly compare `auth.uid()` to the `user_id` column.
