---
name: supabase-rls-auditor
description: Guarantees that personal health data and tasks are never exposed via the public API. Use after creating a new table or modifying existing schemas in the /supabase directory.
---

# Supabase RLS Auditor

1. **Default Deny:** Ensure Row Level Security (RLS) is enabled on all tables by default.
2. **Owner-Only Access:** Write RLS policies that strictly compare `auth.uid()` to the `user_id` column.