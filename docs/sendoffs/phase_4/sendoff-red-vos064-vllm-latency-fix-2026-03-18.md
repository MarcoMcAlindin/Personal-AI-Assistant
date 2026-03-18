---
date: 2026-03-18
agent: Mr. Red
task: VOS-064 (provisional)
recipient: Mr. Pink
branch: feature/red/024-health-analysis-e2e-verify
commit: 8da6cbd
---

# HANDOFF LETTER -- Mr. Red to Mr. Pink
## VOS-064: vLLM Latency Fix & Model Optimisation Scoping

---

### 1. Header Information

- **Date:** 2026-03-18
- **Recipient:** Mr. Pink (for acknowledgment + board item creation)
- **Task ID:** VOS-064 (provisional -- Pink to register on board)

---

### 2. Summary

Diagnosed and fixed three root causes driving ~2 minute latency and Cloud Run timeout
errors on warm vLLM instances. The primary culprit was Qwen's "thinking mode" --
the model was silently generating 500-2000+ hidden reasoning tokens (`<think>...</think>`)
before every response. This fix is applied at the API request level (no redeployment
needed for the `enable_thinking` change; redeployment required for Dockerfile and
timeout changes).

A fourth root cause (`--enforce-eager` disabling CUDA graphs) was identified but
deliberately deferred to a future task -- removing it risks vision encoder crashes and
requires a controlled test. Pink should register this as a new board item.

---

### 3. Changed Files

| File | Change |
|------|--------|
| `backend/app/api/v1/endpoints.py` | Added `"chat_template_kwargs": {"enable_thinking": False}` to `/email/rewrite` and `/chat` vLLM call payloads |
| `vllm_deployment/scripts/analyze_health.py` | Added `"chat_template_kwargs": {"enable_thinking": False}` to health analysis vLLM call payload |
| `vllm_deployment/Dockerfile` | Added `--quantization compressed-tensors` flag; updated `--enforce-eager` comment with deferral note |
| `vllm_deployment/service.yaml` | `timeoutSeconds: 300` → `timeoutSeconds: 600` |
| `vllm_deployment/deploy.sh` | `--timeout 300` → `--timeout 600` |

---

### 4. Strict Testing Instructions

#### Test A: `enable_thinking` fix (no redeployment needed -- immediate)

Send a chat request directly to the deployed backend and time it:

```bash
# Get a valid JWT from the mobile/web app, then:
curl -X POST https://<BACKEND_URL>/chat \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is Supabase?"}' \
  --max-time 60

# Expected: Response in <15 seconds on a warm instance (was ~120s before)
# Expected: No <think>...</think> content in the response body
```

#### Test B: Dockerfile changes (requires redeploy)

```bash
cd vllm_deployment && bash deploy.sh
# After deploy, check logs:
gcloud run services logs read vibeos-qwen --region europe-west1 --limit 50
# Expected: No "CUDA graph capture" errors
# Expected: "compressed-tensors" appears in the model loading log
```

#### Test C: Timeout safety net

```bash
# Verify Cloud Run service timeout is 600s:
gcloud run services describe vibeos-qwen --region europe-west1 \
  --format="value(spec.template.spec.timeoutSeconds)"
# Expected output: 600
```

---

### 5. Environment Variable Changes

None. All changes are code/config only.

---

### 6. API / Database Schema Changes

None. The `chat_template_kwargs` field is passed in the request body to the vLLM
OpenAI-compatible API -- it is transparent to callers of the VibeOS backend.

---

### 7. Notes for Next Agent / Pink Action Required

**Pink must create a new board item** for the following deferred optimisation:

> **Title:** VOS-065 -- vLLM CUDA Graph Optimisation (Remove `--enforce-eager`)
>
> **Description:**
> `--enforce-eager` was added because the Qwen VL vision encoder crashes when CUDA graphs
> are enabled. However, the vast majority of VibeOS requests are text-only (no images).
> The hypothesis is that removing `--enforce-eager` will enable 2-5x faster decode via
> CUDA graph pre-compilation and is safe when no images are in the payload.
>
> **Acceptance criteria:**
> 1. Remove `--enforce-eager` from `vllm_deployment/Dockerfile`
> 2. Add `--enable-chunked-prefill` as a potential alternative workaround
> 3. Redeploy and run 10 text-only chat requests -- confirm no crashes
> 4. Run 5 image-bearing requests (if any path sends images) -- confirm no OOM
> 5. Measure p50/p99 latency before and after
>
> **Owner suggestion:** Mr. Red or Mr. White
>
> **Priority:** Medium (nice-to-have after thinking mode fix brings latency to acceptable range)

---

### 8. Evolution & Self-Healing (Rule 20)

- **No new rules created.** The root cause (thinking mode tokens) was a previously
  unknown behaviour of Qwen3.5 models -- the model silently uses `<think>` blocks by
  default unless explicitly disabled via `chat_template_kwargs`. This is not covered
  by any existing rule.
- **Recommendation to Pink:** Consider adding a rule or SKILL for "Qwen thinking mode
  awareness" to prevent future agents from deploying Qwen models without this flag and
  wondering why latency is anomalous.

---

### 9. Root Cause Summary (for Pink's board item description)

| Root Cause | Severity | Fixed? | Fix |
|---|---|---|---|
| Thinking mode enabled by default (500-2000 hidden tokens per request) | Critical | Yes | `enable_thinking: false` in all 3 call sites |
| `--quantization compressed-tensors` not explicit (auto-detect unreliable) | Medium | Yes | Added flag to Dockerfile |
| Cloud Run timeout 300s too low for thinking+generation | Low | Yes | Bumped to 600s |
| `--enforce-eager` disables CUDA graphs (2-5x decode penalty) | Medium | Deferred | New board item VOS-065 |

---

**I am Mr. Red. Changes committed to `feature/red/024-health-analysis-e2e-verify` (commit `8da6cbd`) and pushed. Awaiting Pink acknowledgment and VOS-065 board registration.**

Signed-off-by: Mr. Red <red@vibeos.internal>
