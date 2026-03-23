# Task Dashboard Redesign — Design Spec
**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Redesign the existing `TaskDashboard` to become a fully-featured daily to-do list with urgency levels, overdue task carry-forward, voice-to-task input, and next-day scheduling. The visual style must match the rest of the SuperCyan app (OLED dark, `#00FFFF` cyan, inline Tailwind hex classes, `GlassCard` containers).

---

## Decisions Log

| # | Question | Decision |
|---|----------|----------|
| 1 | Urgency levels | 3 levels: **High / Medium / Low** |
| 2 | Overdue style | Amber badge inline (same list, amber left border + "overdue" pill) |
| 3 | Architecture | Approach B — enhance `TaskDashboard` + extract `VoiceTaskInput` component |
| 4 | Voice → task confirmation | Pre-fill form for user review before saving |
| 5 | Next-day scheduling | Today / Tomorrow toggle in add form |

---

## Features

### 1. Urgency Levels

Three levels, each with a distinct colour used on the left border of the task card, the urgency badge, and the form toggle button:

| Level | Left border | Badge colour | Form button |
|-------|------------|-------------|-------------|
| High  | `#FF4444`  | Red         | Red outline |
| Medium | `#D97706` | Warm amber  | Warm amber outline |
| Low   | `#4499DD`  | Blue-grey   | Neutral border |

> Note: Medium urgency uses `#D97706` (darker warm amber) rather than the bright `#F59E0B` used by the overdue section, so overdue and medium-urgency cards are visually distinguishable by left border colour.

Tasks are sorted within each date section: **High → Medium → Low**, then by scheduled time ascending. Completed tasks always sort to the bottom within their section, dimmed and struck through.

### 2. Overdue Task Detection & Display

A task is **overdue** when:
- `status = 'pending'` AND
- `date < today` (task date is in the past)

Overdue tasks are fetched alongside today's tasks and rendered in a dedicated **"⚠ Overdue"** section at the top of the list, above the "Today" section. Each overdue task card:
- Has an amber (`#F59E0B`) left border regardless of urgency (overdue styling takes precedence over urgency border colour)
- Still shows the urgency pill badge (red/amber/blue) so urgency remains visible
- Shows an **"overdue"** amber pill badge next to the title
- Shows the original date as a relative label ("Yesterday", "2 days ago")
- Can be checked off, edited, or deleted like any other task

The section header shows a count: "2 carried over". If there are no overdue tasks, the section is hidden entirely.

**Daily refresh:** `pg_cron` already auto-archives tasks at midnight. Overdue detection is purely client-side: query tasks where `status = 'pending' AND date < today`.

**RLS compatibility:** The existing RLS policy on `tasks` is `auth.uid() = user_id` with no date restriction. The date filter is applied at the Supabase query layer (`.eq('date', today)` in `getTasksForToday()`), not in the policy. `getOverdueTasks()` will apply `.lt('date', today)` at the query layer — this is fully compatible with the existing policy and will return all matching rows for the authenticated user.

**Date handling:** The `tasks.date` column is a PostgreSQL `DATE` type. "Today" is resolved on the client as `new Date().toISOString().split('T')[0]` (a `YYYY-MM-DD` string). Supabase's JS client correctly serialises this string against a `DATE` column for both `.eq()` and `.lt()` comparisons. This is consistent with how `getTasksForToday()` already works.

### 3. Today / Tomorrow Toggle

The add-task form includes a segmented toggle defaulting to **Today**. Selecting **Tomorrow** sets the task date to `today + 1 day`. The active segment uses the cyan gradient; the inactive uses a neutral style. The toggle is visible in the form row alongside the time input.

The frontend resolves the actual date string (`YYYY-MM-DD`) from the toggle value before calling `createTask()`. The backend receives a resolved date string, not a "today/tomorrow" enum.

Tasks scheduled for tomorrow simply appear in the "Today" section when tomorrow arrives — there is no separate "Upcoming" or "Tomorrow" section in the rendered view.

Voice-created tasks respect the toggle by default. Qwen does not extract a date from the transcript — all tasks created via voice are assigned whichever date the toggle currently shows.

### 4. Voice-to-Task (VoiceTaskInput Component)

A standalone `VoiceTaskInput.tsx` component handles the full voice flow:

**Flow:**
1. User clicks **🎤 Voice** button in the add-task form header
2. Browser requests microphone permission (first use only)
3. `SpeechRecognition` (Web Speech API) transcribes in real-time, showing a live transcript preview. No `MediaRecorder` is needed — the text transcript is all that is sent to the backend; no audio blob is captured or stored.
4. User manually stops recording by clicking the button again (no automatic silence detection — avoids truncating mid-sentence pauses)
5. Transcript is sent to the backend `/tasks/parse-voice` endpoint with the user's auth token
6. Qwen extracts structured fields: `title`, `description`, `urgency` (high/medium/low), `time` (HH:MM or null)
7. Extracted fields pre-fill the add-task form — user reviews and confirms
8. User clicks **+ Add Task** to save (standard form submit path — no separate voice-save route)

**TaskFormFields type:**
```typescript
interface TaskFormFields {
  title: string;
  description: string | null;   // null if not provided
  time: string | null;          // HH:MM or null
  urgency: 'high' | 'medium' | 'low';
  date: string;                 // YYYY-MM-DD, resolved from Today/Tomorrow toggle
}
```

**Component interface:**
```typescript
interface VoiceTaskInputProps {
  onExtracted: (fields: Partial<TaskFormFields>) => void;
}
```

**States:** idle → recording → processing → done (fields populated) / error

**Error handling:**
- Microphone denied → show inline error message
- Qwen unavailable (503) → show "AI is warming up, try again in 30s"
- Transcript empty → show "Nothing captured, try again"
- Malformed / non-JSON Qwen response → parse what fields are extractable; if `title` is absent or unparseable, show "Couldn't parse your task — please fill in manually" and leave the form empty for the user to type

### 5. Backend: `/tasks/parse-voice` Endpoint

New POST endpoint added to `endpoints.py`. Requires authentication (Bearer token) — same as all other task endpoints.

**Request:**
```json
{ "transcript": "Call the accountant tomorrow morning at 9, it's quite important" }
```

**Response:**
```json
{
  "title": "Call the accountant",
  "description": null,
  "urgency": "high",
  "time": "09:00"
}
```

The response **always includes all four keys**. Fields Qwen cannot confidently extract are returned as `null`. The frontend fills whatever is non-null and leaves the rest for the user to complete.

**Auth:** The endpoint requires a valid Bearer token (same as all other task endpoints). `taskService.parseVoiceTranscript()` reads the Supabase session token using the same pattern as `aiService.ts`. However, `getAuthHeaders()` is currently defined locally inside `aiService.ts` and is not exported. As part of this work, extract it into a new shared utility file `web/src/services/auth.ts` and import it in both `aiService.ts` and `taskService.ts`. No token prop is needed in `VoiceTaskInputProps`; auth is handled inside the service layer.

**Qwen system prompt (for the extraction call):**
```
You are a task extraction assistant. Given a voice transcript, extract the following fields in JSON:
- title: short imperative task name (required, max 80 chars)
- description: any extra detail beyond the title (null if none)
- urgency: "high", "medium", or "low" based on these signals:
    high — "urgent", "important", "asap", "critical", "can't wait", "must"
    medium — "soon", "today", "need to", "should", implied time pressure
    low — no urgency signals, "whenever", "eventually", "maybe"
    default to "medium" if unclear
- time: 24-hour HH:MM if a time is mentioned (null otherwise)

Return only valid JSON, no explanation.
```

### 6. Backend: `updateTask` + Pydantic Schema Changes

**`TaskCreateRequest`** must be extended to include `urgency`:
```python
class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    date: Optional[str] = None
    urgency: Optional[str] = None   # ADD THIS — "high" | "medium" | "low", defaults to "medium" in DB
```

**`TaskUpdateRequest`** must also be extended:
```python
class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    status: Optional[str] = None
    is_archived: Optional[bool] = None
    urgency: Optional[str] = None   # ADD THIS — "high" | "medium" | "low"
```

**`VoiceParseRequest` / `VoiceParseResponse`** — new Pydantic models added to `schemas.py`:
```python
class VoiceParseRequest(BaseModel):
    transcript: str

class VoiceParseResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    urgency: Optional[str] = None   # "high" | "medium" | "low"
    time: Optional[str] = None      # HH:MM or null
```

The `/tasks/parse-voice` endpoint uses these models for request validation and response serialisation — consistent with the project's convention of defining all schemas in `schemas.py`.

### 7. Database: `urgency` Column

A new `urgency` column is added to the `tasks` table:

```sql
ALTER TABLE tasks ADD COLUMN urgency TEXT NOT NULL DEFAULT 'medium'
  CHECK (urgency IN ('high', 'medium', 'low'));
```

The `DEFAULT 'medium'` ensures all existing rows are valid after migration — no backfill needed. Migration added to `/supabase/migrations/`.

---

## Component Architecture

```
TaskDashboard.tsx          (orchestrator — existing, enhanced)
  ├── VoiceTaskInput.tsx   (new — voice recording + extraction)
  └── taskService.ts       (enhanced — urgency field, overdue query, voice parse)
```

### TaskDashboard changes
- Add `urgency` to `Task` type and all form state
- Add overdue detection: second Supabase query for `status=pending, date < today`
- Add Today/Tomorrow toggle state (`taskDate: 'today' | 'tomorrow'`), resolved to `YYYY-MM-DD` before `createTask()` call
- Render overdue section above today section
- Urgency-based left border + badge on task cards (overdue section uses amber border regardless)
- Sort tasks: completed last, then High → Medium → Low, then by time

### VoiceTaskInput changes (new file)
- `SpeechRecognition` (Web Speech API) for live transcript — no `MediaRecorder`, no audio blob
- Manual stop only (button click) — no silence detection
- POST to `/tasks/parse-voice` with transcript and auth token
- Calls `onExtracted(fields)` to populate parent form state

### taskService changes
- `getTasksForToday()` — unchanged, continues to return `Task[]` for today's date
- Add `getOverdueTasks(): Promise<Task[]>` — separate Supabase query: `status=pending, date < today`, ordered by date ascending (oldest first), then by urgency (high → medium → low), then by time ascending for same-date same-urgency ties
- `createTask()` → accepts and passes `urgency` and resolved `date` fields
- Add `parseVoiceTranscript(transcript: string): Promise<Partial<Omit<TaskFormFields, 'date'>>>` — POSTs to `/tasks/parse-voice` with auth headers read via shared `getAuthHeaders()` helper. The `date` field is always owned by the Today/Tomorrow toggle and is never returned from voice extraction.
- Update `updateTask()` to accept and pass the `urgency` field so editing an existing task does not drop the urgency value

`TaskDashboard` calls both `getTasksForToday()` and `getOverdueTasks()` in parallel on mount, storing results in separate state variables (`tasks` and `overdueTasks`).

---

## Visual Spec

| Element | Style |
|---------|-------|
| Overdue section header | `#F59E0B`, uppercase, `⚠` prefix, amber divider line |
| Overdue card left border | `3px solid #F59E0B` (always amber, regardless of urgency) |
| Overdue badge | Amber pill: `color:#F59E0B; background:rgba(245,158,11,0.15)` |
| High urgency border (non-overdue) | `#FF4444` |
| Medium urgency border (non-overdue) | `#D97706` |
| Low urgency border (non-overdue) | `#4499DD` |
| Completed card | `opacity: 0.5`, strikethrough title, filled cyan checkbox |
| Today section header | `#00FFFF`, uppercase, cyan divider line |
| Voice button | Cyan gradient, `🎤 Voice` label |
| Today/Tomorrow toggle | Active segment: cyan gradient; inactive: `#BBC9CD` on `#0D0D0D` (`#BBC9CD` is the existing muted text colour used throughout `TaskDashboard` — not a one-off token) |
| Urgency form buttons | Outlined, colour-matched per level; active state filled |

---

## Out of Scope (for this iteration)

- Recurring tasks
- Drag-to-reorder
- Sub-tasks / checklists
- Push notifications / reminders
- Automatic voice submit (no human-in-loop) — revisit after stability confirmed
- Silence detection for auto-stop recording
