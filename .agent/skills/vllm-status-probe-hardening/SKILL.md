---
name: vllm-status-probe-hardening
description: Upgrades the /vllm/status backend endpoint to detect inference failures (not just model load), eliminating false-positive "online" states where /v1/models returns 200 but /v1/chat/completions returns 4xx.
---

# vLLM Status Probe Hardening

## When to use this skill

- When the mobile/web status chip shows "AI Online" but chat requests fail with 4xx errors
- When modifying `backend/app/api/v1/endpoints.py` `vllm_status()` function
- When adding a new status level beyond `offline / warming / online`

## The Problem

The current probe (`endpoints.py:379`) GETs `/v1/models`. This endpoint returns 200 as soon as the vLLM HTTP server starts — even if the model isn't fully serving inference. Result: false positive "online" status.

The actual inference endpoint is `/v1/chat/completions`. A lightweight probe against it gives a definitive answer.

## The Solution: Dual-Probe Pattern

### Status States (expanded)

| State | Meaning | Frontend display |
|-------|---------|-----------------|
| `offline` | vLLM unreachable (ConnectError, timeout) | Red dot "AI Offline" |
| `warming` | `/v1/models` responds but completions are 4xx or slow | Yellow "AI Warming Up..." |
| `online` | Both `/v1/models` AND a test completion succeed | Green "AI Online" |
| `degraded` | Models list OK but completions return 4xx (model name mismatch etc.) | Orange "AI Error" |

### Implementation Pattern

```python
@router.get("/vllm/status")
async def vllm_status():
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"status": "offline", "model": None, "latency_ms": 0}

    headers = _get_gcp_headers(qwen_url)
    base = qwen_url.rstrip("/")

    # Phase 1: Check /v1/models (fast, lightweight)
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{base}/models", headers=headers)
            if r.status_code != 200:
                latency = round((time.monotonic() - start) * 1000)
                return {"status": "warming", "model": None, "latency_ms": latency}

            models = r.json().get("data", [])
            if not models:
                latency = round((time.monotonic() - start) * 1000)
                return {"status": "warming", "model": None, "latency_ms": latency}

            model_id = models[0]["id"]
    except httpx.TimeoutException:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "warming", "model": None, "latency_ms": latency, "detail": "probe timed out"}
    except Exception as e:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "offline", "model": None, "latency_ms": latency, "detail": str(e)}

    # Phase 2: Probe completions with minimal request
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            probe = await client.post(
                f"{base}/chat/completions",
                headers={**headers, "Content-Type": "application/json"},
                json={
                    "model": model_id,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                    "temperature": 0.0,
                },
            )
            latency = round((time.monotonic() - start) * 1000)

            if probe.status_code == 200:
                return {"status": "online", "model": model_id, "latency_ms": latency}
            elif probe.status_code == 404:
                return {"status": "degraded", "model": model_id, "latency_ms": latency,
                        "detail": f"completions 404 — model name mismatch? served as '{model_id}'"}
            else:
                return {"status": "warming", "model": model_id, "latency_ms": latency,
                        "detail": f"completions returned {probe.status_code}"}
    except httpx.TimeoutException:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "warming", "model": model_id, "latency_ms": latency,
                "detail": "completions probe timed out — inference loading"}
    except Exception as e:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "warming", "model": model_id, "latency_ms": latency, "detail": str(e)}
```

### Key design decisions

- **Phase 1 is cheap** (10s timeout, read-only). If it fails, we never hit Phase 2.
- **Phase 2 uses `max_tokens: 1`** — generates exactly one token, proving the pipeline works end-to-end in minimal time/cost.
- **Phase 2 uses the live `model_id` from Phase 1** — eliminates the env var mismatch problem entirely.
- **`degraded` state** specifically captures the 404-but-models-up scenario that was causing the false positive.

## Frontend Changes Required

After this backend change, update `ChatScreen.jsx` and `SettingsScreen.jsx` to handle the new `"degraded"` state:

```javascript
const VLLM_CHIP_COLORS = {
  offline: '#ef4444',
  warming: '#eab308',
  online: '#4ade80',
  degraded: '#f97316',  // orange
};

const VLLM_CHIP_LABELS = {
  offline: 'AI Offline',
  warming: 'AI Warming Up...',
  online: 'AI Online',
  degraded: 'AI Error',
};
```

## Also: Propagate `model_id` to Chat Handler

The `/vllm/status` probe now knows the exact model ID. Cache it module-level so the chat handler can use it:

```python
_cached_model_id: Optional[str] = None

# In vllm_status(), after Phase 1 succeeds:
global _cached_model_id
_cached_model_id = model_id

# In chat_with_ai():
model_name = _cached_model_id or os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF")
```

This makes the model name self-healing — it auto-corrects on the next status poll.

## Forbidden Patterns

- **Do NOT remove Phase 1** — the `/v1/models` check is still needed to get the canonical model ID.
- **Do NOT set `max_tokens` > 5** in the probe — this is a health check, not a real inference request.
- **Do NOT add auth to this endpoint** — it must remain public so the mobile app can poll without a session.
