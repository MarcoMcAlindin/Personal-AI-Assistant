---
name: supercyan-task-feature
description: Use this skill when implementing any part of the Task Dashboard redesign for SuperCyan. Contains the approved spec decisions, urgency colour rules, overdue detection logic, voice-to-task flow, component interfaces, and backend schema changes. Trigger on: "task dashboard", "urgency", "overdue tasks", "voice input", "VoiceTaskInput", "parse-voice", "getOverdueTasks", or any work in TaskDashboard.tsx or taskService.ts.
---

# SuperCyan Task Feature — Implementation Reference

Full spec: `docs/superpowers/specs/2026-03-23-task-dashboard-redesign.md`

This skill gives you the key facts you need without reading the whole spec.

---

## Approved Decisions

| # | Decision |
|---|----------|
| Urgency levels | 3: **high / medium / low** (lowercase in DB and code) |
| Overdue style | Amber badge inline — same list, amber left border + "overdue" pill |
| Architecture | Enhance `TaskDashboard` + new `VoiceTaskInput` component |
| Voice confirm | Pre-fill form, user reviews and saves manually |
| Next-day scheduling | Today / Tomorrow toggle (resolves to YYYY-MM-DD before `createTask()`) |

---

## Urgency Colours

| Level | Left border | Badge text | Badge bg |
|-------|------------|-----------|---------|
| `high` | `#FF4444` | `#FF4444` | `rgba(255,68,68,0.12)` |
| `medium` | `#D97706` | `#D97706` | `rgba(217,119,6,0.12)` |
| `low` | `#4499DD` | `#4499DD` | `rgba(68,153,221,0.12)` |
| overdue (any urgency) | `#F59E0B` | `#F59E0B` | `rgba(245,158,11,0.15)` |

**Overdue border always overrides urgency border.** The urgency pill badge still shows inside the card.

---

## Task Type (updated)

```typescript
// web/src/types/tasks.ts — add urgency field
export interface Task {
  id: string;
  user_id: string;
  date: string;           // YYYY-MM-DD (PostgreSQL DATE, compared as string)
  title: string;
  description: string | null;
  duration: number | null;
  time: string | null;    // HH:MM
  status: 'pending' | 'completed' | 'archived';
  is_archived: boolean;
  urgency: 'high' | 'medium' | 'low';   // NEW
}
```

---

## TaskFormFields (new type)

```typescript
// Used by the add-task form and VoiceTaskInput
interface TaskFormFields {
  title: string;
  description: string | null;
  time: string | null;          // HH:MM
  urgency: 'high' | 'medium' | 'low';
  date: string;                 // YYYY-MM-DD, resolved from Today/Tomorrow toggle
}
```

---

## VoiceTaskInput Component

```typescript
// web/src/components/cyan/VoiceTaskInput.tsx
interface VoiceTaskInputProps {
  onExtracted: (fields: Partial<Omit<TaskFormFields, 'date'>>) => void;
}
```

- Uses **Web Speech API (`SpeechRecognition`)** only — no `MediaRecorder`, no audio blob
- **Manual stop** (button click) — no silence detection
- Posts transcript to `/tasks/parse-voice` via `taskService.parseVoiceTranscript()`
- States: `idle` → `recording` → `processing` → `done` / `error`

**Error messages:**
- Mic denied → "Microphone access denied"
- 503 → "AI is warming up, try again in 30s"
- Empty transcript → "Nothing captured, try again"
- Bad JSON from Qwen → "Couldn't parse your task — please fill in manually"

---

## taskService Changes

```typescript
// web/src/services/taskService.ts

// Unchanged — returns Task[] for today only
getTasksForToday(): Promise<Task[]>

// NEW — separate query: status=pending, date < today
// Sort: date asc, then urgency (high→medium→low), then time asc
getOverdueTasks(): Promise<Task[]>

// Updated — now passes urgency and resolved date
createTask(input: CreateTaskInput & { urgency: 'high' | 'medium' | 'low' }): Promise<Task>

// Updated — now passes urgency
updateTask(id: string, fields: Partial<TaskFormFields>): Promise<Task>

// NEW — calls backend /tasks/parse-voice
// Returns all 4 keys, null for fields Qwen can't extract
parseVoiceTranscript(transcript: string): Promise<{
  title: string | null;
  description: string | null;
  urgency: 'high' | 'medium' | 'low' | null;
  time: string | null;
}>
```

**Auth:** `taskService` currently calls Supabase directly. `parseVoiceTranscript` calls the FastAPI backend and needs Bearer auth. Use the shared helper from `web/src/services/auth.ts` (create this file if it doesn't exist yet):

```typescript
// web/src/services/auth.ts
import { supabase } from './supabase';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
```

Also update `aiService.ts` to import from `auth.ts` instead of its local copy.

---

## TaskDashboard Changes

```typescript
// New state
const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
const [taskDate, setTaskDate] = useState<'today' | 'tomorrow'>('today');
const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');

// On mount — fetch both in parallel
const [todayTasks, overdue] = await Promise.all([
  taskService.getTasksForToday(),
  taskService.getOverdueTasks(),
]);

// Date resolution for createTask
const resolvedDate = taskDate === 'today'
  ? new Date().toISOString().split('T')[0]
  : new Date(Date.now() + 86400000).toISOString().split('T')[0];
```

**Render order:** Overdue section (hidden if empty) → Today section → Add Task form

**Sorting within Today section:** High → Medium → Low, then time ascending, completed last.

---

## Backend: New Endpoint

```python
# POST /tasks/parse-voice — requires auth
# Request: VoiceParseRequest(transcript: str)
# Response: VoiceParseResponse(title, description, urgency, time — all Optional[str])

# Qwen urgency inference:
# high   → "urgent", "important", "asap", "critical", "can't wait", "must"
# medium → "soon", "today", "need to", "should", implied time pressure; DEFAULT if unclear
# low    → "whenever", "eventually", "maybe", no urgency signals
```

---

## Backend: Schema Updates

```python
# TaskCreateRequest — add:
urgency: Optional[str] = None   # "high" | "medium" | "low"

# TaskUpdateRequest — add:
urgency: Optional[str] = None   # "high" | "medium" | "low"

# New models in schemas.py:
class VoiceParseRequest(BaseModel):
    transcript: str

class VoiceParseResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    urgency: Optional[str] = None
    time: Optional[str] = None
```

---

## Database Migration

```sql
-- /supabase/migrations/<timestamp>_add_task_urgency.sql
ALTER TABLE tasks
  ADD COLUMN urgency TEXT NOT NULL DEFAULT 'medium'
  CHECK (urgency IN ('high', 'medium', 'low'));
```

`DEFAULT 'medium'` means existing rows are valid immediately — no backfill needed.

---

## Today/Tomorrow Toggle UI

```tsx
<div style={{ display: 'flex', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px', overflow: 'hidden' }}>
  {(['today', 'tomorrow'] as const).map(opt => (
    <button
      key={opt}
      onClick={() => setTaskDate(opt)}
      style={{
        padding: '6px 14px',
        fontSize: '11px',
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: taskDate === opt ? 'linear-gradient(135deg, #0099CC, #00FFFF)' : 'transparent',
        color: taskDate === opt ? '#000' : '#BBC9CD',
      }}
    >
      {opt.charAt(0).toUpperCase() + opt.slice(1)}
    </button>
  ))}
</div>
```
