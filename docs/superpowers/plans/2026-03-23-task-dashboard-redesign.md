# Task Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REQUIRED SKILLS:** Load `supercyan-frontend` and `supercyan-task-feature` before touching any file.

**Goal:** Upgrade `TaskDashboard` with urgency levels, overdue carry-forward, a Today/Tomorrow date toggle, and a voice-to-task feature backed by a new Qwen extraction endpoint.

**Architecture:** A new `VoiceTaskInput` component handles recording + Qwen extraction; `TaskDashboard` is enhanced in-place with urgency display, overdue detection, and form updates. A shared `auth.ts` utility is extracted from `aiService.ts` to avoid duplication. Backend gets two schema additions and one new endpoint.

**Tech Stack:** React + TypeScript (Vite), Web Speech API (`SpeechRecognition`), Python FastAPI, Supabase PostgreSQL, Qwen3-Coder-30B via vLLM (OpenAI-compatible)

**Spec:** `docs/superpowers/specs/2026-03-23-task-dashboard-redesign.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260323000007_add_task_urgency.sql` | Add `urgency` column to `tasks` table |
| Create | `supabase/migrations/20260323000007_add_task_urgency_down.sql` | Rollback migration |
| Create | `web/src/services/auth.ts` | Shared `getAuthHeaders()` Supabase JWT helper |
| Modify | `web/src/services/aiService.ts` | Import `getAuthHeaders` from `auth.ts` |
| Modify | `web/src/types/tasks.ts` | Add `urgency` field to `Task` + `TaskFormFields` type |
| Modify | `backend/app/models/schemas.py` | Add `VoiceParseRequest`, `VoiceParseResponse` |
| Modify | `backend/app/api/v1/endpoints.py` | Add `urgency` to `TaskCreateRequest`/`TaskUpdateRequest`; add `POST /tasks/parse-voice` |
| Create | `backend/tests/test_tasks.py` | Tests for `parse-voice` endpoint |
| Modify | `web/src/services/taskService.ts` | `getOverdueTasks()`, urgency in create/update, `parseVoiceTranscript()` |
| Create | `web/src/components/cyan/VoiceTaskInput.tsx` | Voice recording + Qwen extraction component |
| Modify | `web/src/components/cyan/TaskDashboard.tsx` | Urgency display, overdue section, Today/Tomorrow toggle, voice integration |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260323000007_add_task_urgency.sql`
- Create: `supabase/migrations/20260323000007_add_task_urgency_down.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260323000007_add_task_urgency.sql
ALTER TABLE tasks
  ADD COLUMN urgency TEXT NOT NULL DEFAULT 'medium'
  CHECK (urgency IN ('high', 'medium', 'low'));
```

- [ ] **Step 2: Write the rollback**

```sql
-- supabase/migrations/20260323000007_add_task_urgency_down.sql
ALTER TABLE tasks DROP COLUMN IF EXISTS urgency;
```

- [ ] **Step 3: Apply via Supabase dashboard or CLI**

If using CLI: `supabase db push`
If using dashboard: paste the SQL into the SQL editor and run it.

Verify: query `SELECT urgency FROM tasks LIMIT 1;` — should return `medium` for existing rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260323000007_add_task_urgency.sql \
        supabase/migrations/20260323000007_add_task_urgency_down.sql
git commit -m "feat(db): add urgency column to tasks table"
```

---

## Task 2: Shared Auth Utility

**Files:**
- Create: `web/src/services/auth.ts`
- Modify: `web/src/services/aiService.ts`

- [ ] **Step 1: Create `auth.ts`**

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

- [ ] **Step 2: Update `aiService.ts` to import from `auth.ts`**

Remove the local `getAuthHeaders` function definition and replace with an import:

```typescript
// Remove this from aiService.ts:
// async function getAuthHeaders(): Promise<Record<string, string>> { ... }

// Add at top of imports:
import { getAuthHeaders } from './auth';
```

The rest of `aiService.ts` is unchanged — the function signature is identical.

- [ ] **Step 3: Verify the app still compiles**

```bash
cd web && npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/services/auth.ts web/src/services/aiService.ts
git commit -m "refactor: extract getAuthHeaders into shared auth.ts utility"
```

---

## Task 3: Backend Schema Updates

**Files:**
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/api/v1/endpoints.py` (schema classes only, lines ~73-87)

- [ ] **Step 1: Add `VoiceParseRequest` and `VoiceParseResponse` to `schemas.py`**

```python
# backend/app/models/schemas.py — append to existing models

class VoiceParseRequest(BaseModel):
    transcript: str

class VoiceParseResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    urgency: Optional[str] = None   # "high" | "medium" | "low"
    time: Optional[str] = None      # HH:MM or null
```

- [ ] **Step 2: Add `urgency` to `TaskCreateRequest` in `endpoints.py`**

Find the `TaskCreateRequest` class (around line 73) and add the field:

```python
class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    date: Optional[str] = None
    urgency: Optional[str] = None   # ADD — "high" | "medium" | "low"
```

- [ ] **Step 3: Add `urgency` to `TaskUpdateRequest` in `endpoints.py`**

Find the `TaskUpdateRequest` class and add the field:

```python
class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    status: Optional[str] = None
    is_archived: Optional[bool] = None
    urgency: Optional[str] = None   # ADD — "high" | "medium" | "low"
```

- [ ] **Step 4: Verify backend starts cleanly**

```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload
```
Expected: server starts, no import errors.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/schemas.py backend/app/api/v1/endpoints.py
git commit -m "feat(backend): add urgency to task schemas + VoiceParse models"
```

---

## Task 4: `/tasks/parse-voice` Endpoint + Tests

**Files:**
- Modify: `backend/app/api/v1/endpoints.py` (new route)
- Create: `backend/tests/test_tasks.py`

- [ ] **Step 1: Write the failing tests first**

```python
# backend/tests/test_tasks.py
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.utils.config import settings
from jose import jwt
import time

client = TestClient(app)
TEST_SECRET = "test-secret-for-unit-tests-only"


def _make_token(sub: str = "test-user-uuid") -> str:
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


def _auth_header():
    return {"Authorization": f"Bearer {_make_token()}"}


def test_parse_voice_requires_auth(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.post(
        "/api/v1/tasks/parse-voice",
        json={"transcript": "Call the accountant tomorrow"},
    )
    assert response.status_code == 401


def test_parse_voice_returns_structured_fields(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)

    # The endpoint calls httpx directly — mock at the transport level
    import httpx
    from unittest.mock import MagicMock

    mock_qwen_body = '{"choices":[{"message":{"content":"{\\"title\\":\\"Call the accountant\\",\\"description\\":null,\\"urgency\\":\\"high\\",\\"time\\":null}"}}]}'

    mock_http_response = MagicMock()
    mock_http_response.status_code = 200
    mock_http_response.json.return_value = {
        "choices": [{"message": {"content": '{"title":"Call the accountant","description":null,"urgency":"high","time":null}'}}]
    }
    mock_http_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_http_response):
        response = client.post(
            "/api/v1/tasks/parse-voice",
            headers=_auth_header(),
            json={"transcript": "Call the accountant, it's really important"},
        )
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "urgency" in data
    assert "description" in data
    assert "time" in data


def test_parse_voice_rejects_empty_transcript(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)
    response = client.post(
        "/api/v1/tasks/parse-voice",
        headers=_auth_header(),
        json={"transcript": ""},
    )
    assert response.status_code == 422
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && source .venv/bin/activate
pytest tests/test_tasks.py -v
```
Expected: `test_parse_voice_requires_auth` → FAIL (route doesn't exist), others fail too.

- [ ] **Step 3: Implement the endpoint in `endpoints.py`**

Add this route after the existing task routes. Import `VoiceParseRequest` and `VoiceParseResponse` from `app.models.schemas`:

```python
@router.post("/tasks/parse-voice", response_model=schemas.VoiceParseResponse)
async def parse_voice_task(
    request: schemas.VoiceParseRequest,
    current_user: dict = Depends(get_current_user),
):
    """Extract structured task fields from a voice transcript using Qwen."""
    if not request.transcript.strip():
        raise HTTPException(status_code=422, detail="Transcript cannot be empty")

    system_prompt = """You are a task extraction assistant. Given a voice transcript, extract the following fields as JSON:
- title: short imperative task name (required, max 80 chars)
- description: any extra detail beyond the title (null if none)
- urgency: "high", "medium", or "low" based on these signals:
    high — "urgent", "important", "asap", "critical", "can't wait", "must"
    medium — "soon", "today", "need to", "should", implied time pressure; DEFAULT if unclear
    low — "whenever", "eventually", "maybe", no urgency signals
- time: 24-hour HH:MM if a time is mentioned (null otherwise)

Return only valid JSON with exactly these four keys. No explanation."""

    try:
        qwen_url = settings.qwen_endpoint_url
        headers = {"Content-Type": "application/json", **_get_gcp_headers(qwen_url)}
        payload = {
            "model": settings.qwen_model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.transcript},
            ],
            "temperature": 0.1,
            "max_tokens": 200,
        }
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{qwen_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()

        raw = resp.json()["choices"][0]["message"]["content"].strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        import json as _json
        parsed = _json.loads(raw)

        return schemas.VoiceParseResponse(
            title=parsed.get("title"),
            description=parsed.get("description"),
            urgency=parsed.get("urgency"),
            time=parsed.get("time"),
        )

    except Exception as e:
        print(f"[ParseVoice] Error: {e}")
        return schemas.VoiceParseResponse(
            title=None, description=None, urgency=None, time=None
        )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_tasks.py -v
```
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints.py backend/tests/test_tasks.py
git commit -m "feat(backend): add POST /tasks/parse-voice endpoint with Qwen extraction"
```

---

## Task 5: Frontend Types

**Files:**
- Modify: `web/src/types/tasks.ts`

- [ ] **Step 1: Add `urgency` to the `Task` interface and add `TaskFormFields`**

```typescript
// web/src/types/tasks.ts

export interface Task {
  id: string;
  user_id: string;
  date: string;
  title: string;
  description: string | null;
  duration: number | null;
  time: string | null;
  status: 'pending' | 'completed' | 'archived';
  is_archived: boolean;
  urgency: 'high' | 'medium' | 'low';   // NEW
}

export type CreateTaskInput = Omit<Task, 'id' | 'user_id' | 'status' | 'is_archived'>;

// NEW — used by the add-task form and VoiceTaskInput
export interface TaskFormFields {
  title: string;
  description: string | null;
  time: string | null;
  urgency: 'high' | 'medium' | 'low';
  date: string;   // YYYY-MM-DD, resolved from Today/Tomorrow toggle
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd web && npm run build 2>&1 | grep -i error
```
Expected: no new errors (existing code that creates tasks without urgency will be fine since the DB default is 'medium').

- [ ] **Step 3: Commit**

```bash
git add web/src/types/tasks.ts
git commit -m "feat(types): add urgency to Task type + TaskFormFields interface"
```

---

## Task 6: taskService Updates

**Files:**
- Modify: `web/src/services/taskService.ts`

- [ ] **Step 1: Read the current file to understand existing patterns**

Read `web/src/services/taskService.ts` in full before making any changes.

- [ ] **Step 2: Add `getOverdueTasks()`**

Add after `getTasksForToday()`:

```typescript
getOverdueTasks: async (): Promise<Task[]> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending')
    .eq('is_archived', false)
    .lt('date', today)
    .order('date', { ascending: true });

  if (error) throw error;

  // Sort: date asc (already from DB), then urgency (high→medium→low), then time
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  return (data as Task[]).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (uDiff !== 0) return uDiff;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return 0;
  });
},
```

- [ ] **Step 3: Update `createTask()` to pass urgency**

In the existing `createTask()`, add `urgency` to the insert object:

```typescript
const { data, error } = await supabase
  .from('tasks')
  .insert([{
    ...input,
    urgency: input.urgency ?? 'medium',   // ADD — use provided value or default
    status: 'pending',
    is_archived: false,
  }])
  .select()
  .single();
```

- [ ] **Step 4: Update `updateTask()` to pass urgency (if not already a generic patch)**

If `updateTask()` only passes specific fields, ensure `urgency` is included in the update payload when provided:

```typescript
updateTask: async (taskId: string, updates: Partial<Task>): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .update(updates)   // passes urgency if present in updates
    .eq('id', taskId);
  if (error) throw error;
},
```

- [ ] **Step 5: Add `parseVoiceTranscript()`**

Import `getAuthHeaders` and the backend URL, then add:

```typescript
import { getAuthHeaders } from './auth';

const BACKEND_URL = import.meta.env.VITE_CLOUD_GATEWAY_URL || 'http://localhost:8000/api/v1';

// Inside the taskService object:
parseVoiceTranscript: async (transcript: string): Promise<{
  title: string | null;
  description: string | null;
  urgency: 'high' | 'medium' | 'low' | null;
  time: string | null;
}> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BACKEND_URL}/tasks/parse-voice`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ transcript }),
  });
  if (response.status === 503) throw new Error('warming');
  if (!response.ok) throw new Error('parse-voice failed');
  return response.json();
},
```

- [ ] **Step 6: Verify types compile**

```bash
cd web && npm run build 2>&1 | grep -i error
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/services/taskService.ts
git commit -m "feat(taskService): add getOverdueTasks, urgency in create/update, parseVoiceTranscript"
```

---

## Task 7: VoiceTaskInput Component

**Files:**
- Create: `web/src/components/cyan/VoiceTaskInput.tsx`

- [ ] **Step 1: Create the component**

```typescript
// web/src/components/cyan/VoiceTaskInput.tsx
import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { taskService } from '../../services/taskService';
import { TaskFormFields } from '../../types/tasks';

interface VoiceTaskInputProps {
  onExtracted: (fields: Partial<Omit<TaskFormFields, 'date'>>) => void;
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export default function VoiceTaskInput({ onExtracted }: VoiceTaskInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not supported in this browser.');
      setState('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      setTranscript(full);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setErrorMsg('Microphone access denied.');
      } else {
        setErrorMsg('Recording error — please try again.');
      }
      setState('error');
    };

    recognition.start();
    setState('recording');
    setTranscript('');
    setErrorMsg('');
  };

  const stopRecording = async () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    if (!transcript.trim()) {
      setErrorMsg('Nothing captured, try again.');
      setState('error');
      return;
    }

    setState('processing');
    try {
      const fields = await taskService.parseVoiceTranscript(transcript);

      if (!fields.title) {
        setErrorMsg("Couldn't parse your task — please fill in manually.");
        setState('error');
        return;
      }

      onExtracted({
        title: fields.title ?? undefined,
        description: fields.description ?? undefined,
        urgency: fields.urgency ?? 'medium',
        time: fields.time ?? undefined,
      });
      setState('done');
      setTranscript('');
    } catch (err: any) {
      const msg =
        err?.message === 'warming'
          ? 'AI is warming up, try again in 30s.'
          : 'Voice parsing failed — please fill in manually.';
      setErrorMsg(msg);
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    setErrorMsg('');
    setTranscript('');
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '12px',
            background: isRecording
              ? 'rgba(255,68,68,0.15)'
              : 'linear-gradient(135deg, #0099CC, #00FFFF)',
            color: isRecording ? '#FF4444' : '#000',
            border: isRecording ? '1px solid rgba(255,68,68,0.4)' : 'none',
          }}
        >
          {isProcessing ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : isRecording ? (
            <MicOff size={14} />
          ) : (
            <Mic size={14} />
          )}
          {isProcessing ? 'Processing...' : isRecording ? 'Stop' : '🎤 Voice'}
        </button>

        {state === 'done' && (
          <span style={{ fontSize: '12px', color: '#00FFFF' }}>✓ Fields filled</span>
        )}
        {state === 'error' && (
          <button
            onClick={reset}
            style={{ fontSize: '11px', color: '#BBC9CD', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Retry
          </button>
        )}
      </div>

      {isRecording && transcript && (
        <div style={{
          fontSize: '11px',
          color: '#BBC9CD',
          background: '#0D0D0D',
          border: '1px solid #2A2A2A',
          borderRadius: '6px',
          padding: '6px 10px',
          fontStyle: 'italic',
        }}>
          "{transcript}"
        </div>
      )}

      {state === 'error' && errorMsg && (
        <div style={{ fontSize: '11px', color: '#FF4444' }}>{errorMsg}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd web && npm run build 2>&1 | grep -i error
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/cyan/VoiceTaskInput.tsx
git commit -m "feat(web): add VoiceTaskInput component (Web Speech API + Qwen extraction)"
```

---

## Task 8: TaskDashboard — Urgency Display + Overdue Section

**Files:**
- Modify: `web/src/components/cyan/TaskDashboard.tsx`

> Read the full `TaskDashboard.tsx` before making changes. Load `supercyan-task-feature` skill for colour references.

- [ ] **Step 1: Add new state variables**

At the top of the component (after existing state declarations), add:

```typescript
const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
```

- [ ] **Step 2: Update `fetchTasks` to also fetch overdue tasks**

```typescript
const fetchTasks = async () => {
  setLoading(true);
  try {
    const [todayData, overdueData] = await Promise.all([
      taskService.getTasksForToday(),
      taskService.getOverdueTasks(),
    ]);
    setTasks(todayData);
    setOverdueTasks(overdueData);
  } catch (err) {
    console.error('[TaskDashboard] fetch error:', err);
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 3: Add urgency helper functions**

```typescript
const urgencyBorderColor = (urgency: Task['urgency']) => {
  if (urgency === 'high') return '#FF4444';
  if (urgency === 'medium') return '#D97706';
  return '#4499DD';
};

const urgencyBadgeStyle = (urgency: Task['urgency']): React.CSSProperties => {
  const map = {
    high: { color: '#FF4444', background: 'rgba(255,68,68,0.12)' },
    medium: { color: '#D97706', background: 'rgba(217,119,6,0.12)' },
    low: { color: '#4499DD', background: 'rgba(68,153,221,0.12)' },
  };
  return { ...map[urgency], fontSize: '10px', fontWeight: 700, borderRadius: '4px', padding: '1px 6px' };
};
```

- [ ] **Step 4: Update task card rendering to show urgency**

In the task list render, update each task card to use `urgencyBorderColor`:

```tsx
// Task card container — replace hardcoded border with:
style={{
  borderLeft: `3px solid ${task.status === 'completed' ? '#333' : urgencyBorderColor(task.urgency ?? 'low')}`,
  background: task.status === 'completed' ? '#0F0F0F' : '#1A1A1A',
  opacity: task.status === 'completed' ? 0.5 : 1,
  // ... keep existing padding, borderRadius, etc.
}}

// Add urgency badge inside the card next to the title:
<span style={urgencyBadgeStyle(task.urgency ?? 'low')}>
  {(task.urgency ?? 'low').toUpperCase()}
</span>
```

- [ ] **Step 5: Add the overdue section above the main task list**

Find the task list render area and prepend the overdue section:

```tsx
{overdueTasks.length > 0 && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {/* Section header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
        ⚠ Overdue
      </span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(245,158,11,0.25)' }} />
      <span style={{ fontSize: '10px', color: '#BBC9CD' }}>{overdueTasks.length} carried over</span>
    </div>

    {/* Overdue task cards */}
    {overdueTasks.map(task => (
      <div
        key={task.id}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px', background: '#1A1A1A', borderRadius: '10px',
          borderLeft: '3px solid #F59E0B',   // amber always, regardless of urgency
        }}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={() => taskService.toggleTaskStatus(task.id, task.status).then(fetchTasks)}
          style={{ accentColor: '#F59E0B', width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: '#DAE2FD' }}>{task.title}</span>
            {/* overdue pill */}
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', borderRadius: '4px', padding: '1px 6px' }}>
              overdue
            </span>
            {/* urgency badge */}
            <span style={urgencyBadgeStyle(task.urgency ?? 'medium')}>
              {(task.urgency ?? 'medium').toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#BBC9CD', marginTop: '3px' }}>
            {formatRelativeDate(task.date)}
            {task.description && ` · ${task.description}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {/* Edit — reuse the same edit mechanism as today's tasks (toggle showEditForm or similar) */}
          <button
            onClick={() => { /* trigger edit for task.id — same handler as today's task cards */ }}
            style={{ fontSize: '10px', color: '#BBC9CD', background: '#0D0D0D', border: '1px solid #333', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
          >
            Edit
          </button>
          <button
            onClick={() => taskService.deleteTask(task.id).then(fetchTasks)}
            style={{ fontSize: '10px', color: '#BBC9CD', background: '#0D0D0D', border: '1px solid #333', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 6: Add `formatRelativeDate` helper**

```typescript
const formatRelativeDate = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  return `${diffDays} days ago`;
};
```

- [ ] **Step 7: Add Today section header above existing task list**

```tsx
{/* Today section label */}
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  <span style={{ fontSize: '10px', fontWeight: 700, color: '#00FFFF', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
    Today
  </span>
  <div style={{ flex: 1, height: '1px', background: 'rgba(0,255,255,0.15)' }} />
</div>
```

- [ ] **Step 8: Sort today's tasks (completed last, then high→medium→low, then time)**

Apply sort after fetching:

```typescript
const sortTasks = (tasks: Task[]): Task[] => {
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const aComplete = a.status === 'completed' ? 1 : 0;
    const bComplete = b.status === 'completed' ? 1 : 0;
    if (aComplete !== bComplete) return aComplete - bComplete;
    const uDiff = urgencyOrder[a.urgency ?? 'low'] - urgencyOrder[b.urgency ?? 'low'];
    if (uDiff !== 0) return uDiff;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return 0;
  });
};
// Use: setTasks(sortTasks(todayData));
```

- [ ] **Step 9: Test manually — open the app and verify**

```bash
cd web && npm run dev
```
- Overdue section appears at top if any past-pending tasks exist
- Urgency badges show on all task cards
- Today section header shows below overdue
- Completed tasks are dimmed and sorted to bottom

- [ ] **Step 10: Commit**

```bash
git add web/src/components/cyan/TaskDashboard.tsx
git commit -m "feat(web): urgency display + overdue section in TaskDashboard"
```

---

## Task 9: TaskDashboard — Today/Tomorrow Toggle + Voice Integration

**Files:**
- Modify: `web/src/components/cyan/TaskDashboard.tsx`

- [ ] **Step 1: Add form state for urgency, taskDate, and voice**

```typescript
const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');
const [taskDate, setTaskDate] = useState<'today' | 'tomorrow'>('today');
```

Remove the existing `formDuration` state if it's not needed in the new design (check if duration still appears in the form — if not, remove it).

- [ ] **Step 2: Add date resolution helper**

```typescript
const resolveDate = (which: 'today' | 'tomorrow'): string => {
  const d = new Date();
  if (which === 'tomorrow') d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};
```

- [ ] **Step 3: Update `handleCreateTask` to pass urgency and resolved date**

```typescript
const handleCreateTask = async () => {
  if (!formTitle.trim()) return;
  setSubmitting(true);
  try {
    await taskService.createTask({
      title: formTitle,
      description: formDescription || null,
      time: formTime || null,
      urgency,
      date: resolveDate(taskDate),
      duration: null,
    });
    // Reset form
    setFormTitle('');
    setFormDescription('');
    setFormTime('');
    setUrgency('medium');
    setTaskDate('today');
    await fetchTasks();
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 4: Add Today/Tomorrow toggle to the form**

In the form JSX, add the toggle alongside the time input:

```tsx
{/* Time + Today/Tomorrow row */}
<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
  <input
    value={formTime}
    onChange={e => setFormTime(e.target.value)}
    placeholder="Time (09:00)"
    style={{ flex: 1, background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#DAE2FD', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
  />
  {/* Today / Tomorrow toggle */}
  <div style={{ display: 'flex', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
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
</div>
```

- [ ] **Step 5: Add urgency selector to the form**

```tsx
{/* Urgency selector */}
<div style={{ display: 'flex', gap: '6px' }}>
  {(['high', 'medium', 'low'] as const).map(level => {
    const colors = {
      high: { active: 'rgba(255,68,68,0.25)', border: 'rgba(255,68,68,0.6)', text: '#FF4444', inactiveBg: 'rgba(255,68,68,0.08)', inactiveBorder: 'rgba(255,68,68,0.25)' },
      medium: { active: 'rgba(217,119,6,0.25)', border: 'rgba(217,119,6,0.6)', text: '#D97706', inactiveBg: 'rgba(217,119,6,0.08)', inactiveBorder: 'rgba(217,119,6,0.25)' },
      low: { active: 'rgba(68,153,221,0.25)', border: 'rgba(68,153,221,0.6)', text: '#4499DD', inactiveBg: 'rgba(68,153,221,0.08)', inactiveBorder: 'rgba(68,153,221,0.25)' },
    }[level];
    const isActive = urgency === level;
    return (
      <button
        key={level}
        onClick={() => setUrgency(level)}
        style={{
          flex: 1,
          padding: '7px 0',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          border: `1px solid ${isActive ? colors.border : colors.inactiveBorder}`,
          background: isActive ? colors.active : colors.inactiveBg,
          color: colors.text,
        }}
      >
        {level.toUpperCase()}
      </button>
    );
  })}
</div>
```

- [ ] **Step 6: Import VoiceTaskInput and wire it into the form**

```typescript
import VoiceTaskInput from './VoiceTaskInput';
```

In the form header area (where the add form title label is), add `VoiceTaskInput`:

```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <span style={{ fontSize: '12px', fontWeight: 600, color: '#BBC9CD', textTransform: 'uppercase', letterSpacing: '1px' }}>
    Add Task
  </span>
  <VoiceTaskInput
    onExtracted={(fields) => {
      if (fields.title) setFormTitle(fields.title);
      if (fields.description) setFormDescription(fields.description);
      if (fields.time) setFormTime(fields.time);
      if (fields.urgency) setUrgency(fields.urgency);
    }}
  />
</div>
```

- [ ] **Step 7: Manual verification**

```bash
cd web && npm run dev
```
Check:
- [ ] Today/Tomorrow toggle appears in the form
- [ ] Urgency buttons (HIGH / MED / LOW) appear and toggle correctly
- [ ] Voice button appears; clicking starts recording (browser asks for mic permission)
- [ ] After saying a task aloud and stopping, fields are pre-filled
- [ ] Creating a task with "Tomorrow" shows it the next day, not today
- [ ] Stats pills update after adding/completing tasks

- [ ] **Step 8: Final build check**

```bash
cd web && npm run build && npm run lint
```
Expected: no errors or warnings.

- [ ] **Step 9: Commit**

```bash
git add web/src/components/cyan/TaskDashboard.tsx
git commit -m "feat(web): Today/Tomorrow toggle + urgency form + voice integration in TaskDashboard"
```

---

## Task 10: Deploy Backend + Wrap Up

**Files:**
- `backend/deploy.sh` (no changes needed)

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && source .venv/bin/activate
pytest tests/ -v
```
Expected: all tests pass.

- [ ] **Step 2: Deploy backend to Cloud Run**

```bash
bash backend/deploy.sh
```

- [ ] **Step 3: Smoke test voice parsing on production**

With the web app pointed at the production backend, open the task page, click Voice, speak a task, and verify the form fills correctly.

- [ ] **Step 4: Final commit + push**

```bash
git push origin staging
```

---

## Summary

| Task | What it produces |
|------|-----------------|
| 1 — DB Migration | `urgency` column live in Supabase |
| 2 — Shared Auth | `auth.ts` extracted, `aiService.ts` updated |
| 3 — Backend Schemas | `urgency` in create/update, `VoiceParse` models |
| 4 — parse-voice Endpoint | `POST /tasks/parse-voice` with tests |
| 5 — Frontend Types | `Task.urgency` + `TaskFormFields` |
| 6 — taskService | `getOverdueTasks`, urgency in CRUD, `parseVoiceTranscript` |
| 7 — VoiceTaskInput | Self-contained voice→fields component |
| 8 — Dashboard: Urgency + Overdue | Coloured borders, badges, overdue section |
| 9 — Dashboard: Form + Voice | Toggle, urgency selector, voice integration |
| 10 — Deploy | Production live |
