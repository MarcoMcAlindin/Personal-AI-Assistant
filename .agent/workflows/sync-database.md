---
description: Executes pending Supabase migrations and updates frontend types.
---

# Database Sync Workflow
Description: 
1. Execute the command to start the local Supabase instance if it is not running.
2. Run `supabase db push` to apply any unapplied migrations to the local database.
3. Run `supabase gen types typescript --local > web/src/types/supabase.ts` to update the Vite frontend types.
4. Run `supabase gen types typescript --local > mobile/src/types/supabase.ts` to update the Expo mobile types.
5. Print a summary of the tables that were modified.