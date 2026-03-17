---
name: VOS-053_v1_handoff
type: handoff
agent: Mr. White
date: 2026-03-17
---

# HANDOFF — VOS-053: Fix vLLM 404 (Chat Broken)

**Date:** 2026-03-17
**Agent:** Mr. White — Data Layer & Infrastructure
**Recipient:** Mr. Pink (Audit), CEO (Review)
**Task ID:** VOS-053
**Issue:** https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/68
**Branch:** `feature/white/053-vllm-fix`

---

## Summary

All AI chat requests were returning HTTP 404 with `"The model Qwen/Qwen3.5-9B-Instruct does not exist."` — making the app non-functional as an AI assistant.

**Root cause:** `QWEN_MODEL_NAME` env var on `vibeos-backend` Cloud Run was set to `Qwen/Qwen3.5-9B-Instruct` but the vLLM service actually serves the model under the ID `Qwen/Qwen3.5-9B` (no `-Instruct` suffix). vLLM validates the `model` field in every `/v1/chat/completions` request and returns 404 on any mismatch.

**Fix:** Patched the env var via `gcloud run services update` — no container rebuild required. Deployed in ~60 seconds.

---

## Changed Files

| File | Change |
|------|--------|
| `vllm_deployment/README.md` | Added "Model Name Contract" section documenting the env var requirement, verification procedure, and patch command |

**Cloud infrastructure change (no code change):**
- `QWEN_MODEL_NAME` on `vibeos-backend` Cloud Run updated from `Qwen/Qwen3.5-9B-Instruct` → `Qwen/Qwen3.5-9B`

---

## Evidence

### Step 1 — Live model ID confirmed

```bash
TOKEN=$(gcloud auth print-identity-token)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://vibeos-qwen-599152061719.europe-west1.run.app/v1/models"
```

**Output:**
```json
{"object":"list","data":[{"id":"Qwen/Qwen3.5-9B","object":"model",...}]}
```

Model ID: **`Qwen/Qwen3.5-9B`** (not `Qwen/Qwen3.5-9B-Instruct`)

### Step 2 — Patch applied

```bash
gcloud run services update vibeos-backend \
  --region europe-west1 \
  --update-env-vars QWEN_MODEL_NAME="Qwen/Qwen3.5-9B"
```

**Output:**
```
Service [vibeos-backend] revision [vibeos-backend-00008-wdm] has been deployed
and is serving 100 percent of traffic.
Service URL: https://vibeos-backend-599152061719.europe-west1.run.app
```

### Step 3 — Status endpoint verification

```bash
curl -s "https://vibeos-backend-599152061719.europe-west1.run.app/api/v1/vllm/status"
```

**Output:** `{"status":"online","model":"Qwen/Qwen3.5-9B","latency_ms":42}`

### Step 4 — End-to-end chat verification (HTTP 200)

```bash
curl -s -X POST "https://vibeos-backend-599152061719.europe-west1.run.app/api/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-bypass" \
  -d '{"message":"say hello"}'
```

**Output:** HTTP 200 — `{"response":"Hello! I am VibeOS Assistant. How can I help you today?"}`

Full thinking-trace response received confirming the model is running and responding correctly.

---

## Environment Variable Changes

| Variable | Service | Old Value | New Value |
|----------|---------|-----------|-----------|
| `QWEN_MODEL_NAME` | `vibeos-backend` (Cloud Run) | `Qwen/Qwen3.5-9B-Instruct` | `Qwen/Qwen3.5-9B` |

---

## API / Database Schema Changes

None.

---

## Notes for Next Agent

- **VOS-054 (Green)** implements dynamic model name resolution — the backend will query `/v1/models` at startup and cache the model ID, eliminating the need for manual env var management. This is the permanent long-term fix.
- After any future vLLM redeployment, always verify `/v1/models` and update `QWEN_MODEL_NAME` if it differs. The Model Name Contract section in `vllm_deployment/README.md` documents this procedure.

---

## Evolution & Self-Healing (Rule 20)

The existing `vllm-model-name-resolver` skill (`.agent/skills/vllm-model-name-resolver/SKILL.md`) correctly identified and documented this pattern — no new rule or skill was required. The skill was applied as designed.

No rules were amended. The skill covered all cases encountered during this task.

---

**Mr. White** — Data Layer & Infrastructure
