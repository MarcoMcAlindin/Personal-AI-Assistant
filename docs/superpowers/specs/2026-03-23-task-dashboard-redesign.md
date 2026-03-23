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
| Medium | `#F59E0B` | Amber       | Amber outline |
| Low   | `#4499DD`  | Blue-grey   | Neutral border |

Tasks are sorted within each date section: **High → Medium → Low**, then by scheduled time ascending. Completed tasks always sort to the bottom within their section, dimmed and struck through.

### 2. Overdue Task Detection & Display

A task is **overdue** when:
- `status = 'pending'` AND
- `date < today` (task date is in the past)

Overdue tasks are fetched alongside today's tasks and rendered in a dedicated **"⚠ Overdue"** section at the top of the list, above the "Today" section. Each overdue task card:
- Has an amber (`#F59E0B`) left border
- Shows an **"overdue"** amber pill badge next to the title
- Shows the original date as a relative label ("Yesterday", "2 days ago")
- Still shows the urgency badge
- Can be checked off, edited, or deleted like any other task

The section header shows a count: "2 carried over". If there are no overdue tasks, the section is hidden entirely.

**Daily refresh:** `pg_cron` already auto-archives tasks at midnight. Overdue detection is purely client-side: query tasks where `status = 'pending' AND date < today`.

### 3. Today / Tomorrow Toggle

The add-task form includes a segmented toggle defaulting to **Today**. Selecting **Tomorrow** sets the task date to `today + 1 day`. The active segment uses the cyan gradient; the inactive uses a neutral style. The toggle is visible in the form row alongside the time input.

Voice-created tasks also respect this toggle — the extracted date from the transcript overrides it only if Qwen explicitly extracts a date; otherwise the toggle value is used.

### 4. Voice-to-Task (VoiceTaskInput Component)

A standalone `VoiceTaskInput.tsx` component handles the full voice flow:

**Flow:**
1. User clicks **🎤 Voice** button in the add-task form header
2. Browser requests microphone permission (first use only)
3. `MediaRecorder` records audio; `SpeechRecognition` (Web Speech API) transcribes in real-time, showing a live transcript preview
4. User stops recording (button click or silence detection after 3s)
5. Transcript is sent to the backend `/tasks/parse-voice` endpoint
6. Qwen extracts structured fields: `title`, `description`, `urgency` (high/medium/low), `time` (HH:MM or null)
7. Extracted fields pre-fill the add-task form — user reviews and confirms
8. User clicks **+ Add Task** to save (standard form submit path — no separate voice-save route)

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

### 5. Backend: `/tasks/parse-voice` Endpoint

New POST endpoint added to `endpoints.py`:

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

Qwen is prompted with a structured extraction instruction. If a field cannot be confidently extracted it is returned as `null`. The frontend fills whatever is returned and leaves the rest for the user to complete.

### 6. Database: `urgency` Column

A new `urgency` column is added to the `tasks` table:

```sql
ALTER TABLE tasks ADD COLUMN urgency TEXT NOT NULL DEFAULT 'medium'
  CHECK (urgency IN ('high', 'medium', 'low'));
```

Migration added to `/supabase/migrations/`.

---

## Component Architecture

```
TaskDashboard.tsx          (orchestrator — existing, enhanced)
  ├── VoiceTaskInput.tsx   (new — voice recording + extraction)
  └── taskService.ts       (enhanced — urgency field, overdue query)
```

### TaskDashboard changes
- Add `urgency` to `Task` type and all form state
- Add overdue detection: second Supabase query for `status=pending, date < today`
- Add Today/Tomorrow toggle state (`taskDate: 'today' | 'tomorrow'`)
- Render overdue section above today section
- Urgency-based left border + badge on task cards
- Sort tasks: completed last, then High → Medium → Low, then by time

### VoiceTaskInput changes (new file)
- `MediaRecorder` + `SpeechRecognition` for capture + live transcript
- POST to `/tasks/parse-voice` with transcript
- Calls `onExtracted(fields)` to populate parent form state

### taskService changes
- `getTasksForToday()` → also fetch overdue tasks (separate query or combined with date filter)
- `createTask()` → pass `urgency` field
- Add `parseVoiceTranscript(transcript: string)` calling the new backend endpoint

---

## Visual Spec

| Element | Style |
|---------|-------|
| Overdue section header | `#F59E0B`, uppercase, `⚠` prefix, amber divider line |
| Overdue card left border | `3px solid #F59E0B` |
| Overdue badge | Amber pill: `color:#F59E0B; background:rgba(245,158,11,0.15)` |
| High urgency border | `#FF4444` |
| Medium urgency border | `#F59E0B` |
| Low urgency border | `#4499DD` |
| Completed card | `opacity: 0.5`, strikethrough title, filled cyan checkbox |
| Today section header | `#00FFFF`, uppercase, cyan divider line |
| Voice button | Cyan gradient, `🎤 Voice` label |
| Today/Tomorrow toggle | Active segment: cyan gradient; inactive: `#BBC9CD` on `#0D0D0D` |
| Urgency form buttons | Outlined, colour-matched per level; active state filled |

---

## Out of Scope (for this iteration)

- Recurring tasks
- Drag-to-reorder
- Sub-tasks / checklists
- Push notifications / reminders
- Automatic voice submit (no human-in-loop) — revisit after stability confirmed
