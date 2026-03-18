---
name: vllm-model-name-resolver
description: Diagnoses and fixes vLLM 404 errors caused by model name mismatches between the backend API client and the served model ID. Also covers Cloud Run env var patching without container rebuilds.
---

# vLLM Model Name Resolver

## When to use this skill

- When `POST /api/v1/chat` returns HTTP 404 with `"Client error '404 Not Found' for url '.../v1/chat/completions'"`
- When the backend sends a `model` field that doesn't match what vLLM reports in `/v1/models`
- When you need to patch a Cloud Run service env var without triggering a full container rebuild

## Background: Why vLLM Returns 404 on Completions

vLLM's OpenAI-compatible server validates the `model` field in every `/v1/chat/completions` request against the set of loaded model IDs. If the name doesn't match exactly, it returns:

```json
HTTP 404 Not Found
{"object":"error","message":"The model `X` does not exist.","type":"NotFoundError","code":404}
```

The served model ID is determined by the `--model` flag passed to the vLLM entrypoint (or `--served-model-name` if set separately). The HuggingFace Hub path normalises differently on different vLLM versions — e.g., `Qwen/Qwen3.5-9B-Instruct` vs `Qwen/Qwen3.5-9B`.

## Diagnostic Steps

### Step 1 — Query the live served model ID

```bash
# Must use a GCP identity token (service is IAM-protected)
TOKEN=$(gcloud auth print-identity-token --audiences=https://vibeos-qwen-599152061719.europe-west1.run.app)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://vibeos-qwen-599152061719.europe-west1.run.app/v1/models" | python3 -m json.tool
```

Note the exact `id` field in the response data array — this is the canonical model name vLLM will accept.

### Step 2 — Compare against backend env var

```bash
gcloud run services describe vibeos-backend \
  --region europe-west1 \
  --format "value(spec.template.spec.containers[0].env)"
```

Look for `QWEN_MODEL_NAME`. If it's absent, the backend falls back to the hardcoded default in `endpoints.py:218`:
```python
"model": os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3.5-9B-Instruct"),
```

If the live model ID (Step 1) differs from the env var value — that IS the 404 root cause.

### Step 3 — Patch the env var (no rebuild required)

```bash
gcloud run services update vibeos-backend \
  --region europe-west1 \
  --update-env-vars QWEN_MODEL_NAME="<exact-id-from-step-1>"
```

This triggers a new revision deploy in ~60 seconds. No Docker rebuild needed.

### Step 4 — Verify the fix

```bash
# Test via backend chat endpoint (requires valid Supabase JWT)
curl -s -X POST "https://vibeos-backend-enffsru5pa-ew.a.run.app/api/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -d '{"message":"hello, what model are you?"}'
```

Expected: HTTP 200 with `{"response": "...AI text response..."}`.

## Long-Term Fix: Dynamic Model Name Resolution

To prevent future mismatches, the backend `/vllm/status` logic already extracts the model ID:
```python
model_id = models[0].get("id", "unknown")
```

This value should be cached and reused as the `model` field in chat completions requests, instead of a hardcoded env var. See VOS-054 sendoff for the companion fix.

## Known vLLM Model Name Patterns

| Dockerfile `--model` arg | vLLM reports as |
|--------------------------|-----------------|
| `Qwen/Qwen3.5-9B-Instruct` | `Qwen/Qwen3.5-9B` (version-dependent) |
| `RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8` | `RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8` |
| Custom `--served-model-name foo` | `foo` |

Always trust the `/v1/models` response over any config assumption.

## Forbidden Patterns

- **Do NOT rebuild and redeploy the Docker container** to fix a model name mismatch. It is always an env var change.
- **Do NOT hardcode model names** as string literals in application code. Always read from env var with a fallback.
- **Do NOT assume** the `--model` arg equals the served ID. Always query `/v1/models` to confirm.
