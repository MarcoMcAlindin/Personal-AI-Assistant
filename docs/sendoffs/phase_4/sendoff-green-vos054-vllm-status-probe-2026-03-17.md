# Sendoff Letter: Mr. Green — Fix vLLM Status Probe False Positive

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. Green (Cloud Backend & API Engineer)
**Date:** 2026-03-17
**Priority:** HIGH — status chip actively misleads users when AI is broken
**Issue:** VOS-054 — https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/69
**Skill:** `.agent/skills/vllm-status-probe-hardening/SKILL.md`

---

## What You Are Fixing

The `/vllm/status` endpoint probes `/v1/models` to determine readiness. This returns HTTP 200 as soon as the vLLM HTTP server starts — even when `/v1/chat/completions` returns 404. Today, the mobile app showed a green "AI Online" chip while every chat message returned `Error: chat failed: 404`. The user had no indication AI was broken.

Your job is to harden the status probe so it validates actual inference capability, not just server liveness.

---

## Required Changes

**File:** `backend/app/api/v1/endpoints.py`

### 1. Upgrade `vllm_status()` to a dual-probe

The complete implementation is in `.agent/skills/vllm-status-probe-hardening/SKILL.md`. Summary:

- **Phase 1** — GET `/v1/models` (existing check). If fails → `offline` or `warming`.
- **Phase 2** — POST `/v1/chat/completions` with `max_tokens: 1` using the model ID discovered in Phase 1. If 404 → `"degraded"`. If 200 → `"online"`.

This adds a fourth status state: `"degraded"` — models list responds but completions return 4xx.

```python
# New return shape when completions return 404:
return {
    "status": "degraded",
    "model": model_id,
    "latency_ms": latency,
    "detail": f"completions 404 — model name mismatch? served as '{model_id}'"
}
```

### 2. Cache the live model ID for use in chat handler

Add a module-level cache:

```python
_cached_model_id: Optional[str] = None
```

In `vllm_status()`, after Phase 1 succeeds, set `_cached_model_id = model_id`.

In `chat_with_ai()`, replace:
```python
"model": os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3.5-9B-Instruct"),
```
With:
```python
model_name = _cached_model_id or os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3.5-9B-Instruct")
"model": model_name,
```

This makes the model name self-healing — it auto-corrects once the status endpoint has been polled (every 15 seconds from the mobile app).

### 3. Update the mobile frontend to handle the new `"degraded"` state

**File:** `mobile/src/screens/ChatScreen.jsx`

Add `"degraded"` to `VLLM_CHIP_COLORS` and `VLLM_CHIP_LABELS`:

```javascript
const VLLM_CHIP_COLORS = {
  offline: '#ef4444',
  warming: '#eab308',
  online: '#4ade80',
  degraded: '#f97316',   // orange
};

const VLLM_CHIP_LABELS = {
  offline: 'AI Offline',
  warming: 'AI Warming Up...',
  online: 'AI Online',
  degraded: 'AI Error',
};
```

The `tappable` condition in `VllmStatusChip` should also allow tapping on `"degraded"` (so the user can trigger warmup/retry):

```javascript
const tappable = (status === 'offline' || status === 'degraded') && !warming;
```

**File:** `mobile/src/screens/SettingsScreen.jsx` — same updates to `VLLM_STATUS_COLORS` and `VLLM_STATUS_LABELS`.

---

## Task Steps

### Step 1 — Prime your worktree

```bash
git worktree list
git worktree add /home/marco/vibeos-worktrees/green feature/green/054-vllm-status-probe
cd /home/marco/vibeos-worktrees/green
```

### Step 2 — Implement the dual-probe in `endpoints.py`

Follow the exact pattern in `.agent/skills/vllm-status-probe-hardening/SKILL.md`. The full code is there. Key constraints:
- Phase 2 probe timeout: `15.0` seconds max (keep the endpoint responsive)
- `max_tokens: 1` — do not generate more than 1 token in the probe
- Use the `model_id` from Phase 1 in the Phase 2 request, NOT the env var

### Step 3 — Update mobile status colours/labels

Edit `ChatScreen.jsx` and `SettingsScreen.jsx` as described above. This is a mobile file — make sure you're editing in your worktree, not the main repo.

### Step 4 — Local backend test

```bash
cd /home/marco/vibeos-worktrees/green/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Then test (you'll need `QWEN_ENDPOINT_URL` set in your local `.env` pointing at the live vLLM service):

```bash
# With vLLM online + working:
curl -s http://localhost:8000/api/v1/vllm/status
# → {"status":"online","model":"Qwen/Qwen3.5-9B","latency_ms":...}

# Simulate degraded: temporarily set a wrong QWEN_MODEL_NAME
QWEN_MODEL_NAME="WrongModel" uvicorn app.main:app --port 8001
curl -s http://localhost:8001/api/v1/vllm/status
# → {"status":"degraded","model":"Qwen/Qwen3.5-9B","detail":"completions 404..."}
```

### Step 5 — Deploy backend

```bash
cd /home/marco/vibeos-worktrees/green/backend
bash deploy.sh
```

Monitor the deployment:
```bash
gcloud run revisions list --service vibeos-backend --region europe-west1
```

### Step 6 — End-to-end status validation

After deploy, from Mr. Pink's curl tests:

```bash
curl -s "https://vibeos-backend-enffsru5pa-ew.a.run.app/api/v1/vllm/status"
```

- If VOS-053 (White's fix) is merged: expect `"status":"online"`
- If VOS-053 not yet merged (model name still wrong): expect `"status":"degraded"` — this proves your probe is working correctly

### Step 7 — Commit and PR

```bash
git add backend/app/api/v1/endpoints.py mobile/src/screens/ChatScreen.jsx mobile/src/screens/SettingsScreen.jsx
git commit -m "[VOS-054][Green] feat: dual-probe vllm/status — validate completions not just /models"
gh pr create --base staging \
  --title "[VOS-054][Green] Harden /vllm/status — detect degraded inference state" \
  --body "Adds Phase 2 probe to /vllm/status that tests /v1/chat/completions with max_tokens:1. Adds 'degraded' status state. Caches live model_id to eliminate model name mismatch in chat handler."
```

---

## Acceptance Criteria

- [ ] `GET /api/v1/vllm/status` returns `"status":"degraded"` when `/v1/models` succeeds but completions return 404
- [ ] `GET /api/v1/vllm/status` returns `"status":"online"` ONLY when a 1-token test completion succeeds
- [ ] Mobile ChatScreen shows an orange "AI Error" chip when status is `"degraded"`
- [ ] Mobile ChatScreen still shows correct offline/warming/online states
- [ ] Chat handler uses `_cached_model_id` when available
- [ ] Backend deployed to Cloud Run, new revision active

---

## Rules to Follow

- **Rule 05 (API Contract):** The `status` response shape must remain backward-compatible. Adding `"degraded"` is additive — do not rename existing states.
- **Rule 30 (Git Worktree):** All work in `feature/green/054-vllm-status-probe`.
- **Rule 04 (Python Standard):** Type hints on the `_cached_model_id` variable. Use `Optional[str]` from `typing`.
- **Rule 10 (Definition of Done):** Curl proof of `"degraded"` state in your handoff.
- **Rule 11 (Handoff Standard):** Include both the `degraded` scenario test AND the `online` scenario test in your handoff letter.

---

## Dependency Note

VOS-053 (White) and VOS-054 (Green) are complementary. White's fix makes the model name correct so status goes `online → online`. Your fix makes the probe honest so when the model name is wrong, status shows `degraded` instead of `online`. They can be worked and deployed in parallel — your change will correctly show `degraded` until White's env var fix lands, then both together produce a fully working, accurately reported AI service.

---

**Mr. Pink** — VibeOS Project Manager & Scout
*Audit doc: `docs/AUDIT_MOBILE_PINK_2026-03-17.md` — B-02*
