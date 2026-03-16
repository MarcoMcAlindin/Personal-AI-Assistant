# HANDOFF: VOS-046 -- vLLM Health Probe, Warmup & Chat Cold-Start Retry

## Header
- **Date:** 2026-03-16
- **From:** Mr. Green (Cloud Backend & API Engineer)
- **To:** Mr. Pink (Audit)
- **Task:** VOS-046 -- Add vLLM Health Probe Endpoint & Chat Cold-Start Retry
- **Branch:** `feature/green/046-vllm-status`
- **Commit:** `fb43e35`

---

## Summary of Changes

### New: `GET /api/v1/vllm/status` (No Auth)
- Probes vLLM `/v1/models` endpoint with 10s timeout
- Returns tri-state: `offline` | `warming` | `online`
- Includes `model` name (from vLLM response), `latency_ms`, and `detail` string
- `ConnectError` -> offline, `TimeoutException` -> warming, HTTP 200 with models -> online
- No authentication required (frontends poll this frequently)

### New: `POST /api/v1/vllm/warmup` (No Auth)
- Sends lightweight probe to trigger Cloud Run cold start
- Returns immediately with `{"status": "warming", "message": "..."}`
- 5s timeout, swallows all errors (fire-and-forget by design)
- No authentication required

### Modified: `POST /api/v1/chat` (Retry Logic)
- 3-attempt exponential backoff: 0s, 5s, 15s delays
- Only retries on: `ConnectError`, `RemoteProtocolError`, HTTP 503
- Never retries on: 4xx errors, `TimeoutException` (already waited 300s)
- Returns 503 with descriptive "try again in 30 seconds" after all retries exhausted
- Returns 504 on timeout (clearer than generic 500)

### New: `_get_gcp_headers()` Helper
- Extracted GCP identity token fetching into reusable function
- Used by both `/vllm/status` and `/vllm/warmup` endpoints
- Reduces code duplication across endpoints

---

## Files Changed (1)

| File | Change |
|------|--------|
| `backend/app/api/v1/endpoints.py` | 2 new endpoints, chat retry, GCP headers helper, `asyncio`/`time` imports |

---

## Test Evidence

```
# vLLM status (no QWEN_ENDPOINT_URL -- offline)
$ curl http://127.0.0.1:8000/api/v1/vllm/status
{
    "status": "offline",
    "model": null,
    "latency_ms": 0,
    "detail": "QWEN_ENDPOINT_URL not configured"
}

# vLLM warmup (no QWEN_ENDPOINT_URL -- offline)
$ curl -X POST http://127.0.0.1:8000/api/v1/vllm/warmup
{
    "status": "offline",
    "message": "QWEN_ENDPOINT_URL not configured"
}

# Chat mock mode (retry logic doesn't interfere with mock path)
$ curl -X POST .../chat -d '{"message":"test retry"}'
{
    "response": "[MOCK CONTEXT]: No historical context available.\n\n[REPLY]: I am functioning in mock mode..."
}

# Both /vllm/* endpoints confirmed public (no auth header needed)
# All routes registered in OpenAPI:
  POST    /api/v1/chat
  PATCH   /api/v1/chat/save/{message_id}
  GET     /api/v1/vllm/status
  POST    /api/v1/vllm/warmup
```

---

## API Contract

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/vllm/status` | No | Probe vLLM readiness -> offline/warming/online |
| POST | `/api/v1/vllm/warmup` | No | Trigger Cloud Run cold start |
| POST | `/api/v1/chat` | Yes | AI chat (now with 3-attempt cold-start retry) |

---

## Response Schema

### `GET /vllm/status`
```json
{"status": "online", "model": "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8", "latency_ms": 145}
{"status": "warming", "model": null, "latency_ms": 10023, "detail": "Probe timed out (instance likely starting)"}
{"status": "offline", "model": null, "latency_ms": 52, "detail": "Connection refused"}
```

### `POST /vllm/warmup`
```json
{"status": "warming", "message": "Warmup request sent -- instance will be ready in 15-30 seconds"}
```

---

## Definition of Done Checklist
- [x] `GET /api/v1/vllm/status` returns "offline" when QWEN_ENDPOINT_URL is unset
- [x] `POST /api/v1/vllm/warmup` triggers request and returns immediately
- [x] Both `/vllm/status` and `/vllm/warmup` work WITHOUT auth headers
- [x] `/chat` retry logic implemented (3 attempts, 0s/5s/15s backoff)
- [x] `/chat` does NOT retry on 4xx or timeout
- [x] `/chat` returns 503 with descriptive message after retries exhausted
- [x] `latency_ms` field present in status response
- [x] Chat mock mode unaffected by retry changes
- [x] All changes committed to feature/green/046-vllm-status
