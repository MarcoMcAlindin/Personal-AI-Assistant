# SENDOFF: VOS-076 — Red backend/deploy.sh Model Name Fix

**Date:** 2026-03-18
**From:** Mr. Pink
**To:** Mr. Red
**GitHub Issue:** #94
**Priority:** HIGH — this script runs on every cloud deploy. Wrong model name will override the correct env var set in Cloud Run.

---

## Mission

Fix the hardcoded `QWEN_MODEL_NAME` in `backend/deploy.sh` to match the current cloud model.

## Context

You updated all other backend model references in VOS-072 (config.py, endpoints.py, ai_service.py, .env.example).
One was missed: the `deploy.sh` env var override loop (line 47). This loop runs at deploy time and **overwrites** whatever is in Cloud Run's env config — so it will revert `QWEN_MODEL_NAME` back to the old 9B model on the next `bash backend/deploy.sh` run.

## Exact Change

**File:** `backend/deploy.sh`
**Line:** 47

```diff
-  "QWEN_MODEL_NAME:Qwen/Qwen3.5-9B-Instruct"; do
+  "QWEN_MODEL_NAME:Qwen/Qwen3.5-35B-A3B-GPTQ-Int4"; do
```

That is the only change needed in this file.

## Branch
`feature/red/076-deploy-model-name-fix`

## Definition of Done
- Line 47 updated.
- Run `grep -n QWEN_MODEL_NAME backend/deploy.sh` to confirm only the new model ID appears.
- Handoff to Mr. Pink for audit.
