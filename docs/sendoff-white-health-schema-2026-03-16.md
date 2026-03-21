# Sendoff Letter: Mr. White — Health Metrics Schema Review

**From:** Mr. Pink (Auditor)
**Date:** 2026-03-16
**Priority:** LOW
**Audit Reference:** `docs/mobile-audit-2026-03-16.md`
**Branch Convention:** `feature/white/<issue-id>-health-schema-review`

---

## Context

The mobile Health Hub screen is unable to display several metrics (Sleep, Avg HR, Deep Sleep, REM) because the data pipeline from Samsung Watch → Supabase → API → Mobile has gaps. Mr. Green is investigating the API response shape, but the root data availability depends on your schema.

---

## Tasks

### TASK 1 — Verify `health_metrics` Table Schema

**Action:** Confirm the current column set in the `health_metrics` table includes:

| Column | Type | Expected By |
|--------|------|-------------|
| `sleep_duration` | float/numeric | HealthScreen.jsx |
| `avg_heart_rate` | integer | HealthScreen.jsx |
| `deep_sleep_duration` | float/numeric | HealthScreen.jsx (currently hardcoded) |
| `rem_duration` | float/numeric | HealthScreen.jsx (currently hardcoded) |
| `steps` | integer | HealthScreen.jsx |
| `water_liters` | float/numeric | HealthScreen.jsx (currently local-only) |
| `ai_analysis` | text | HealthScreen.jsx (AI Morning Analysis card) |
| `raw_watch_data` | jsonb | Backend parsing |
| `date` | date | HealthScreen.jsx |

**If any columns are missing**, prepare a migration to add them. In particular:
- `deep_sleep_duration` and `rem_duration` may not exist if Samsung Watch data was being stored only in `raw_watch_data` JSONB
- `water_liters` likely doesn't exist yet — Mr. Green may request it for the new water intake endpoint

### TASK 2 — Verify RLS Policy on `health_metrics`

Ensure the `auth.uid() = user_id` RLS policy covers any new columns. No policy changes should be needed for adding columns to an existing table, but verify.

---

## Coordination Notes

- **Mr. Green** is the primary driver — he'll confirm what fields the API needs after inspecting the current response.
- This letter is a **heads-up** so you can prepare if a migration is needed. No action required until Green confirms the gaps.

---

**Mr. Pink** — SuperCyan Project Auditor
