# Sendoff Letter: Mr. Green — Backend Multi-Model Router (VOS-062)

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. Green (Cloud Backend & API Engineer)
**Date:** 2026-03-17
**Priority:** MEDIUM — optional backend routing layer; Home PC model works without this (direct mobile-to-Ollama), but this enables RAG context for Home PC chats
**Issue:** VOS-062 — https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/77
**Skill:** `.agent/skills/multi-model-inference-router/SKILL.md`
**Can run in parallel with:** VOS-059, VOS-060, VOS-061

---

## What You Are Building

An optional `model_target` field on the backend `/chat` route that lets the Cloud Run backend proxy chat requests to a user's home Ollama instance — with full RAG context injection. This is **phase 2** of the home PC model feature.

Phase 1 (VOS-061) is direct mobile-to-Ollama with no RAG. Phase 2 (this task) adds RAG support for Home PC chats by routing through the backend.

**Branch:** `feature/green/062-backend-multi-model-router`

---

## Architecture

```
Current (VOS-061 direct path):
  Mobile → Ollama:11434/v1/chat/completions
  (no RAG, no auth, no backend involved)

New (VOS-062 backend path):
  Mobile → POST /api/v1/chat  { model_target: "home_pc", message: "..." }
         → FastAPI → RAG context fetch (Supabase pgvector)
         → POST OLLAMA_ENDPOINT_URL/v1/chat/completions
         → response back to mobile
```

The mobile app will offer a toggle per-model: "Use Cloud RAG" (routes via backend) vs "Direct" (routes to Ollama directly). For now, add the backend capability — the UI toggle is a follow-up.

---

## Task Steps

### Step 1 — Prime your worktree

```bash
git worktree list
git worktree add /home/marco/vibeos-worktrees/green-062 feature/green/062-backend-multi-model-router
cd /home/marco/vibeos-worktrees/green-062
```

### Step 2 — Update `ChatRequest` schema

**File:** `backend/app/models/schemas.py`

Add `model_target` to the `ChatRequest` Pydantic model:

```python
from typing import Optional, Literal

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    model_target: Optional[Literal['cloud', 'home_pc', 'device']] = 'cloud'
    ollama_url: Optional[str] = None  # user-provided URL for home_pc target
```

The `device` target will never be routed through the backend (it's fully local), but including it in the schema is forward-compatible. The backend should return 400 if `model_target='device'` is sent.

### Step 3 — Add Ollama proxy function to `ai_service.py`

**File:** `backend/app/services/ai_service.py`

```python
import os
import httpx
from typing import Optional

async def call_ollama(message: str, rag_context: str, ollama_url: str) -> str:
    """Proxy chat request to a user's Ollama instance with RAG context."""
    base = ollama_url.rstrip('/')
    system_prompt = (
        "You are VibeOS Assistant. Use the following context to answer the user's question.\n\n"
        f"Context:\n{rag_context}"
        if rag_context
        else "You are VibeOS Assistant."
    )
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{base}/v1/chat/completions",
            json={
                "model": os.environ.get("OLLAMA_MODEL_NAME", "qwen2.5:7b"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                "stream": False,
            },
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
```

Note the `OLLAMA_MODEL_NAME` env var — never hardcode the model name (lesson from VOS-058).

### Step 4 — Update `chat_with_ai()` in `endpoints.py`

**File:** `backend/app/api/v1/endpoints.py`

```python
from app.services.ai_service import call_ollama

@router.post("/chat")
async def chat_with_ai(request: ChatRequest, ...):
    # ... existing RAG context fetch (unchanged) ...
    rag_context = await rag_service.get_context(request.message, request.user_id)

    if request.model_target == 'device':
        raise HTTPException(status_code=400, detail="device model_target is local-only — do not route through backend")

    if request.model_target == 'home_pc':
        ollama_url = request.ollama_url or os.environ.get("OLLAMA_ENDPOINT_URL")
        if not ollama_url:
            raise HTTPException(
                status_code=400,
                detail="home_pc model_target requires ollama_url in request body or OLLAMA_ENDPOINT_URL env var"
            )
        try:
            text = await call_ollama(request.message, rag_context, ollama_url)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Ollama unreachable: {e}")
        return {"response": text, "model": "ollama/home_pc"}

    # Default: cloud vLLM path (unchanged)
    # ... existing vLLM call ...
```

The existing cloud path must be completely unchanged — this is an additive branch only.

### Step 5 — Add `OLLAMA_ENDPOINT_URL` to config

**File:** `backend/app/utils/config.py`

```python
OLLAMA_ENDPOINT_URL: Optional[str] = os.environ.get("OLLAMA_ENDPOINT_URL")
OLLAMA_MODEL_NAME: str = os.environ.get("OLLAMA_MODEL_NAME", "qwen2.5:7b")
```

**File:** `backend/.env.example` — add:
```
OLLAMA_ENDPOINT_URL=  # optional: http://YOUR_HOME_PC_IP:11434 or Tailscale IP
OLLAMA_MODEL_NAME=qwen2.5:7b
```

### Step 6 — Local test

```bash
cd /home/marco/vibeos-worktrees/green-062/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

With home PC Ollama running:

```bash
# Test cloud path (unchanged):
curl -s -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "model_target": "cloud"}'
# → normal cloud response

# Test home_pc path:
curl -s -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "model_target": "home_pc", "ollama_url": "http://192.168.x.x:11434"}'
# → Ollama response with RAG context

# Test device rejection:
curl -s -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "model_target": "device"}'
# → 400 error
```

### Step 7 — Deploy backend

```bash
cd /home/marco/vibeos-worktrees/green-062/backend
bash deploy.sh
```

No new Cloud Run env vars needed unless you want a server-side Ollama default (optional).

### Step 8 — Commit and PR

```bash
git add backend/app/models/schemas.py \
        backend/app/services/ai_service.py \
        backend/app/api/v1/endpoints.py \
        backend/app/utils/config.py \
        backend/.env.example
git commit -m "[VOS-062][Green] feat: backend multi-model router — model_target field, Ollama proxy with RAG"
gh pr create --base staging \
  --title "[VOS-062][Green] feat: Backend multi-model router — RAG-aware Ollama proxy" \
  --body "Adds model_target to ChatRequest. Routes home_pc requests to user Ollama with full RAG context. Cloud path unchanged. Returns 400 for device target (local-only). OLLAMA_MODEL_NAME env var prevents hardcoded model name."
```

---

## Acceptance Criteria

- [ ] `ChatRequest.model_target` field added (Optional, defaults to `'cloud'`)
- [ ] `chat_with_ai()` routes `home_pc` to `call_ollama()` — cloud path completely unchanged
- [ ] `call_ollama()` injects RAG context into Ollama system prompt
- [ ] `model_target='device'` returns HTTP 400 with clear error
- [ ] Missing `ollama_url` returns HTTP 400 (not 500)
- [ ] Ollama unreachable returns HTTP 502 (not 500 unhandled)
- [ ] `OLLAMA_MODEL_NAME` env var used — model name not hardcoded
- [ ] `OLLAMA_ENDPOINT_URL` added to `.env.example`
- [ ] Cloud path verified unchanged (no regression)
- [ ] Backend deployed to Cloud Run

---

## Rules to Follow

- **Rule 05 (API Contract):** `model_target` is additive — existing clients sending no `model_target` field get `cloud` by default. Zero breaking changes.
- **Rule 30 (Git Worktree):** Work in `feature/green/062-backend-multi-model-router`.
- **Rule 04 (Python Standard):** Type hints everywhere. Use `Optional[str]`, `Literal['cloud', 'home_pc', 'device']` from `typing`.
- **Rule 06 (Secrets Management):** `OLLAMA_ENDPOINT_URL` is not a secret (it's a LAN IP) but still goes in env, not code.
- **Rule 10 (Definition of Done):** Curl proof of home_pc routing in your handoff. Both cloud (unchanged) and home_pc paths tested.
- **Rule 11 (Handoff Standard):** Include three curl outputs: cloud path, home_pc path, device rejection (400).
- **Rule 27 (No AI Attribution):** Signed as `Mr. Green`.

---

## Dependency Note

This task is **independent** — it can be worked in parallel with VOS-059, VOS-060, VOS-061. The mobile app (VOS-061) uses direct-to-Ollama routing by default. This backend router is the enhancement that enables RAG for home PC users. When both VOS-061 and VOS-062 are merged, the mobile UI can offer a "Use Cloud RAG" toggle as a future improvement.

---

**Mr. Pink** — VibeOS Project Manager & Scout
*Architecture note: Home PC path intentionally never involves GCP auth tokens — Ollama has no authentication. The backend acts purely as a RAG context injector and proxy for this use case.*
