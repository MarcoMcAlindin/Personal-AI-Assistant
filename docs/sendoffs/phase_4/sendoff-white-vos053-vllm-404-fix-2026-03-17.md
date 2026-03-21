# Sendoff Letter: Mr. White — Fix vLLM 404 (Chat Broken)

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. White (Data Layer & Infrastructure)
**Date:** 2026-03-17
**Priority:** CRITICAL — AI chat non-functional in production
**Issue:** VOS-053 — https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/68
**Skill:** `.agent/skills/vllm-model-name-resolver/SKILL.md`

---

## Why This Is Critical

Every single AI chat message on mobile and web returns `Error: chat failed: 404`. The app is effectively an AI assistant without AI. This must be resolved before any other task is considered relevant.

Mr. Pink has already diagnosed the root cause to 99% confidence. Your job is to confirm, fix, and verify with an end-to-end test.

---

## Root Cause (Confirmed by Mr. Pink)

**Model name mismatch between the backend request and the vLLM served model ID.**

Evidence gathered 2026-03-17:

```bash
# Status probe shows model loaded as:
curl .../api/v1/vllm/status
# → {"status":"online","model":"Qwen/Qwen3.5-9B","latency_ms":32}
#                               ^^^^^^^^^^^^^^^^^ NO "-Instruct" suffix

# Chat request the backend sends to vLLM:
# endpoints.py:218 → os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3.5-9B-Instruct")
#                                                                        ^^^^^^^^ HAS "-Instruct"

# Result: vLLM returns 404 "model does not exist"
```

vLLM's OpenAI-compatible server validates the `model` field in every `/v1/chat/completions` request against its loaded model IDs. If the name doesn't match exactly, it returns HTTP 404. The backend sends `Qwen/Qwen3.5-9B-Instruct`, but the running vLLM instance loaded/reports the model as `Qwen/Qwen3.5-9B`.

**No container rebuild is required.** This is an environment variable fix.

---

## Task Steps

### Step 1 — Prime your worktree

```bash
git worktree list
# If feature/white/053-vllm-fix doesn't exist:
git worktree add /home/marco/supercyan-worktrees/white feature/white/053-vllm-fix
cd /home/marco/supercyan-worktrees/white
```

### Step 2 — Confirm the live model ID

Run this to get the exact ID vLLM reports (requires gcloud auth):

```bash
TOKEN=$(gcloud auth print-identity-token \
  --audiences=https://supercyan-qwen-599152061719.europe-west1.run.app)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://supercyan-qwen-599152061719.europe-west1.run.app/v1/models" | python3 -m json.tool
```

Note the `id` field. Expected: `"Qwen/Qwen3.5-9B"` (or similar without `-Instruct`).

### Step 3 — Patch the backend env var (the actual fix)

```bash
gcloud run services update supercyan-backend \
  --region europe-west1 \
  --update-env-vars QWEN_MODEL_NAME="<exact-id-from-step-2>"
```

This deploys a new revision in ~60 seconds. Monitor:

```bash
gcloud run revisions list --service supercyan-backend --region europe-west1
```

### Step 4 — Verify end-to-end chat

You need a valid Supabase JWT for this. Get one by looking at `.env` or the Supabase dashboard:

```bash
# Test chat endpoint
curl -s -X POST "https://supercyan-backend-enffsru5pa-ew.a.run.app/api/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -d '{"message":"explain to me what supabase is used for"}' | python3 -m json.tool
```

Expected HTTP 200, `{"response": "Supabase is an open-source..."}`.

Also verify status still shows online:
```bash
curl -s "https://supercyan-backend-enffsru5pa-ew.a.run.app/api/v1/vllm/status"
# → {"status":"online","model":"Qwen/Qwen3.5-9B","latency_ms":...}
```

### Step 5 — Document the fix in `vllm_deployment/README.md`

Add a section "Model Name Contract" explaining that `QWEN_MODEL_NAME` on the backend Cloud Run service MUST match the exact model ID returned by `/v1/models` on the vLLM service. This prevents this incident from recurring after future vLLM redeploys.

### Step 6 — Commit and PR

```bash
# In your worktree:
git add vllm_deployment/README.md
git commit -m "[VOS-053][White] fix: patch QWEN_MODEL_NAME env var to match vLLM served model ID"
gh pr create --base staging --title "[VOS-053][White] Fix chat 404 — model name mismatch" \
  --body "Patches QWEN_MODEL_NAME on supercyan-backend Cloud Run to match the exact model ID served by vLLM. Resolves chat 404 without container rebuild."
```

---

## Acceptance Criteria

- [ ] `GET /api/v1/vllm/status` returns `"status":"online"` with the correct model ID
- [ ] `POST /api/v1/chat` with any message returns HTTP 200 with an AI-generated response
- [ ] Mobile app: typing a message and sending returns a real AI response (not a 404 error)
- [ ] `vllm_deployment/README.md` has the Model Name Contract section
- [ ] PR merged to `staging`

---

## Secondary Investigation (If Needed)

If Step 2 shows the model ID IS `Qwen/Qwen3.5-9B-Instruct` (matching what the backend sends), then the 404 has a different root cause. In that case:

1. Check Cloud Run logs for `supercyan-qwen`:
   ```bash
   gcloud run services logs read supercyan-qwen --region europe-west1 --limit 50
   ```
2. Look for: `"404"`, `"NotFoundError"`, `"does not exist"`, model loading errors
3. If the vLLM container is in a partial startup state: trigger a new deployment via `bash vllm_deployment/deploy.sh`

---

## Rules to Follow

- **Rule 30 (Git Worktree Isolation):** All changes in your worktree — `feature/white/053-vllm-fix`. Never edit on `staging` directly.
- **Rule 06 (Secrets Management):** Do NOT commit env var values. Only update via `gcloud run services update`.
- **Rule 08 (Scale-to-zero):** Do NOT change `--min-instances` on the vLLM service. Keep at 0.
- **Rule 10 (Definition of Done):** Live curl proof of HTTP 200 chat response required in your handoff letter.
- **Rule 11 (Handoff Standard):** Include the exact curl commands and their outputs in your `HANDOFF.md`.
- **Rule 27 (No AI Attribution):** Sign commits as `Mr. White`, not with AI tool names.

---

## Handoff Letter Template

Your `HANDOFF.md` must include:

1. The exact model ID vLLM reported (from `/v1/models`)
2. The `gcloud run services update` command you ran (with the env var value)
3. Curl output showing HTTP 200 chat response with the test prompt "explain to me what supabase is used for"
4. Confirmation the status endpoint still shows `"status":"online"`

---

**Mr. Pink** — SuperCyan Project Manager & Scout
*Audit doc: `docs/AUDIT_MOBILE_PINK_2026-03-17.md` — B-01*
