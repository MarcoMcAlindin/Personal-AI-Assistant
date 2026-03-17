# SENDOFF: VOS-046 — Add vLLM Health Probe Endpoint & Chat Cold-Start Retry

## Header
- **Date:** 2026-03-16
- **From:** Mr. Pink (Scout & Auditor)
- **To:** Mr. Green (Cloud Backend & API Engineer)
- **Task:** VOS-046 — Add vLLM Health Probe Endpoint & Chat Cold-Start Retry
- **Branch:** `feature/green/046-vllm-status`
- **Priority:** HIGH
- **Depends on:** None (VOS-039 through VOS-042 already merged to staging)

---

## Context

The AI chat feature is unreliable from the user's perspective. When the vLLM Cloud Run instance is scaled to zero (which is the default — Rule 08), the first chat request triggers a 15-30 second cold start. During this time:

1. **No retry logic exists.** The `/chat` endpoint makes a single `httpx.post()` call with a 300s timeout (`endpoints.py:204`). If the connection is refused or times out during cold start ramp-up, the user gets an immediate HTTP 500 with `"AI Service Error: ..."`.

2. **No health probe exists.** The frontends (web Sidebar, mobile Settings) display hardcoded green dots saying "Active" — they never check whether vLLM is actually online. The web Sidebar (`Sidebar.tsx:110-122`) renders static text `"Cloud Run: Active"` with a permanently green `.dot` CSS class.

3. **No warmup mechanism exists.** Users cannot manually trigger a cold start before chatting. They must send a real message and wait.

The vLLM service already exposes `/v1/models` as its readiness probe (see `service.yaml:48`). This endpoint returns 200 with the model list only after the model is fully loaded. Before that, it returns an error. This is the perfect signal for a health check.

**Current vLLM URL pattern** (from `config.py`):
- Env var: `QWEN_ENDPOINT_URL` — set to something like `https://vibeos-qwen-599152061719.europe-west1.run.app/v1`
- Chat calls: `{QWEN_ENDPOINT_URL}/chat/completions` (already correct after VOS-039 fix)
- Models probe: The base URL without `/v1` + `/v1/models` — or simply `{QWEN_ENDPOINT_URL.rstrip('/')}/models` since the URL already ends in `/v1`

---

## Mission

### Step 1: Add the vLLM Status Endpoint (No Auth)

**File:** `backend/app/api/v1/endpoints.py`

Add a new section after the Chat Save/Pin block (after line 335). This endpoint requires NO authentication — server status is not sensitive and the frontends need to poll it frequently.

```python
# -- vLLM Status & Warmup ---------------------------------------------------

@router.get("/vllm/status")
async def vllm_status():
    """
    Probe the vLLM service to determine its readiness state.
    Returns: offline | warming | online
    No auth required -- status is not sensitive and frontends poll this.
    """
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"status": "offline", "model": None, "latency_ms": 0, "detail": "QWEN_ENDPOINT_URL not configured"}

    # Build the /v1/models URL from the configured endpoint
    # QWEN_ENDPOINT_URL typically ends with /v1, so append /models
    models_url = f"{qwen_url.rstrip('/')}/models"

    import time
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get GCP identity token for IAM-protected service
            headers = {}
            try:
                import google.auth.transport.requests
                import google.oauth2.id_token
                auth_req = google.auth.transport.requests.Request()
                qwen_base = qwen_url.rstrip("/v1").rstrip("/")
                identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
                headers["Authorization"] = f"Bearer {identity_token}"
            except Exception:
                pass

            response = await client.get(models_url, headers=headers)
            latency = round((time.monotonic() - start) * 1000)

            if response.status_code == 200:
                data = response.json()
                models = data.get("data", [])
                if models:
                    model_id = models[0].get("id", "unknown")
                    return {"status": "online", "model": model_id, "latency_ms": latency}
                else:
                    return {"status": "warming", "model": None, "latency_ms": latency, "detail": "Model loading"}
            else:
                return {"status": "warming", "model": None, "latency_ms": latency, "detail": f"vLLM returned {response.status_code}"}
    except httpx.ConnectError:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "offline", "model": None, "latency_ms": latency, "detail": "Connection refused"}
    except httpx.TimeoutException:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "warming", "model": None, "latency_ms": latency, "detail": "Probe timed out (instance likely starting)"}
    except Exception as e:
        latency = round((time.monotonic() - start) * 1000)
        return {"status": "offline", "model": None, "latency_ms": latency, "detail": str(e)}
```

**Key design decisions:**
- `timeout=10.0` — fast probe, not 300s like chat. If it takes >10s, the instance is starting up → return `"warming"`.
- `ConnectError` → `"offline"` (instance not running at all)
- `TimeoutException` → `"warming"` (instance is starting, not yet responding)
- HTTP 200 with empty model list → `"warming"` (vLLM server is up but model not loaded)
- HTTP 200 with models → `"online"`
- Non-200 status → `"warming"` (vLLM starting but not ready)

### Step 2: Add the Warmup Endpoint (No Auth)

Same file, right after the status endpoint:

```python
@router.post("/vllm/warmup")
async def vllm_warmup():
    """
    Send a lightweight request to vLLM to trigger Cloud Run cold start.
    Returns immediately -- the actual warmup happens in the background
    as Cloud Run spins up the container.
    No auth required -- triggering a cold start is not sensitive.
    """
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"status": "offline", "message": "QWEN_ENDPOINT_URL not configured"}

    models_url = f"{qwen_url.rstrip('/')}/models"

    try:
        # Fire-and-forget probe with a short timeout
        # This triggers Cloud Run to start the container
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {}
            try:
                import google.auth.transport.requests
                import google.oauth2.id_token
                auth_req = google.auth.transport.requests.Request()
                qwen_base = qwen_url.rstrip("/v1").rstrip("/")
                identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
                headers["Authorization"] = f"Bearer {identity_token}"
            except Exception:
                pass

            await client.get(models_url, headers=headers)
    except Exception:
        pass  # Expected to timeout on cold start -- that's fine

    return {"status": "warming", "message": "Warmup request sent — instance will be ready in 15-30 seconds"}
```

### Step 3: Add Retry Logic to the Chat Endpoint

**File:** `backend/app/api/v1/endpoints.py` — Modify the existing `/chat` endpoint (lines 180-233).

Replace the single `httpx.post()` call block with exponential backoff retry:

```python
@router.post("/chat")
async def chat_with_ai(request: ChatRequest, user_id: str = Depends(get_current_user)):
    import asyncio

    # 1. Build RAG Context
    context = await rag_service.build_context_block(user_id, request.message)

    # 2. Get Qwen Endpoint
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"response": f"[MOCK CONTEXT]: {context}\n\n[REPLY]: I am functioning in mock mode because QWEN_ENDPOINT_URL is missing."}

    # 3. Get GCP identity token for IAM-protected vLLM service
    qwen_base = qwen_url.rstrip("/v1").rstrip("/")
    headers = {"Content-Type": "application/json"}
    try:
        import google.auth.transport.requests
        import google.oauth2.id_token
        auth_req = google.auth.transport.requests.Request()
        identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
        headers["Authorization"] = f"Bearer {identity_token}"
    except Exception:
        pass  # Local dev without GCP credentials — skip auth

    # 4. Call vLLM Model with cold-start retry (3 attempts: 0s, 5s, 15s backoff)
    retry_delays = [0, 5, 15]  # seconds before each attempt
    last_error = None

    for attempt, delay in enumerate(retry_delays):
        if delay > 0:
            await asyncio.sleep(delay)

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                ai_response = await client.post(
                    f"{qwen_url.rstrip('/')}/chat/completions",
                    headers=headers,
                    json={
                        "model": os.environ.get("QWEN_MODEL_NAME", "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8"),
                        "messages": [
                            {"role": "system", "content": "You are VibeOS Assistant. Use the provided context to answer accurately."},
                            {"role": "user", "content": f"{context}\n\nUser Query: {request.message}"}
                        ],
                        "stream": False
                    }
                )
                ai_response.raise_for_status()
                data = ai_response.json()
                ai_content = data["choices"][0]["message"]["content"]

                # Store both user message and AI response in chat_history
                try:
                    now = datetime.now(timezone.utc).isoformat()
                    rag_service.supabase.table("chat_history").insert([
                        {"user_id": user_id, "role": "user", "message": request.message, "timestamp": now},
                        {"user_id": user_id, "role": "assistant", "message": ai_content, "timestamp": now},
                    ]).execute()
                except Exception:
                    pass  # Don't fail the chat response if storage fails

                return {"response": ai_content}

        except (httpx.ConnectError, httpx.RemoteProtocolError) as e:
            # Connection refused or reset — vLLM likely cold-starting, retry
            last_error = e
            continue
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 503:
                # Service unavailable — cold start in progress, retry
                last_error = e
                continue
            # Other HTTP errors (4xx, etc.) — don't retry
            raise HTTPException(status_code=e.response.status_code, detail=f"AI Service Error: {str(e)}")
        except httpx.TimeoutException as e:
            # 300s timeout exceeded — don't retry (already waited long enough)
            raise HTTPException(status_code=504, detail=f"AI Service Timeout: model did not respond within 300 seconds")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")

    # All retries exhausted
    raise HTTPException(status_code=503, detail=f"AI Service unavailable after {len(retry_delays)} attempts. The model may be cold-starting — try again in 30 seconds. Last error: {str(last_error)}")
```

**Retry strategy:**
- **Attempt 1:** Immediate (0s delay)
- **Attempt 2:** After 5s wait
- **Attempt 3:** After 15s wait
- **Total max wait before giving up:** 20s + inference time
- **Only retries on:** `ConnectError`, `RemoteProtocolError`, HTTP 503
- **Never retries on:** 4xx errors, `TimeoutException` (already waited 300s), other exceptions

### Step 4: Add `import time` at the Top

**File:** `backend/app/api/v1/endpoints.py`

Ensure `import time` and `import asyncio` are present at the top of the file. The `time` module is used in the status endpoint for latency measurement. `asyncio` is used for retry delays.

Add after line 1:
```python
import asyncio
import time
```

---

## Response Schema Contract

### `GET /api/v1/vllm/status`

```json
{
  "status": "online",
  "model": "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8",
  "latency_ms": 145
}
```

```json
{
  "status": "warming",
  "model": null,
  "latency_ms": 10023,
  "detail": "Probe timed out (instance likely starting)"
}
```

```json
{
  "status": "offline",
  "model": null,
  "latency_ms": 52,
  "detail": "Connection refused"
}
```

### `POST /api/v1/vllm/warmup`

```json
{
  "status": "warming",
  "message": "Warmup request sent — instance will be ready in 15-30 seconds"
}
```

---

## API Contract (Complete)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/vllm/status` | No | Probe vLLM readiness → offline/warming/online |
| POST | `/api/v1/vllm/warmup` | No | Trigger Cloud Run cold start |
| POST | `/api/v1/chat` | Yes | AI chat (now with 3-attempt retry on cold-start) |

---

## Key Files

| File | What to Do |
|------|-----------|
| `backend/app/api/v1/endpoints.py` | Add `/vllm/status`, `/vllm/warmup` endpoints + retrofit `/chat` with retry |
| `backend/app/utils/config.py` | No changes needed |
| `backend/app/main.py` | No changes needed (router already includes all endpoints) |

---

## Definition of Done

- [ ] `GET /api/v1/vllm/status` returns `"offline"` when QWEN_ENDPOINT_URL is unset
- [ ] `GET /api/v1/vllm/status` returns `"offline"` when vLLM is scaled to zero and unreachable
- [ ] `GET /api/v1/vllm/status` returns `"warming"` when vLLM is starting (timeout or non-200)
- [ ] `GET /api/v1/vllm/status` returns `"online"` with model name when vLLM is ready
- [ ] `POST /api/v1/vllm/warmup` triggers a request to vLLM and returns immediately
- [ ] Both `/vllm/status` and `/vllm/warmup` work WITHOUT auth headers
- [ ] `/chat` retries up to 3 times on `ConnectError` / 503 with 0s, 5s, 15s backoff
- [ ] `/chat` does NOT retry on 4xx errors or timeout (300s already exceeded)
- [ ] `/chat` returns 503 with descriptive message after all retries exhausted
- [ ] `latency_ms` field is accurate in status response
- [ ] All changes committed and pushed to `feature/green/046-vllm-status`
- [ ] Handoff Letter submitted with curl test evidence

---

## Verification

```bash
# No token needed for these endpoints
BASE="http://localhost:8000/api/v1"

# Check status (should return offline in local dev without vLLM running)
curl "$BASE/vllm/status" | python -m json.tool

# Trigger warmup (returns immediately even without vLLM)
curl -X POST "$BASE/vllm/warmup" | python -m json.tool

# Test chat retry (with dev mode enabled, should still work for mock response)
TOKEN="your-supabase-jwt"
curl -X POST "$BASE/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, test cold start retry"}'
```

**Production test (after deploy):**
```bash
# Check live vLLM status
curl "https://vibeos-gateway-XXXXX.europe-west1.run.app/api/v1/vllm/status"

# Warm it up
curl -X POST "https://vibeos-gateway-XXXXX.europe-west1.run.app/api/v1/vllm/warmup"

# Wait 30s, check again
sleep 30
curl "https://vibeos-gateway-XXXXX.europe-west1.run.app/api/v1/vllm/status"
# Expected: {"status": "online", "model": "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8", ...}
```

---

## Worktree Setup

```bash
cd /home/marco/vibeos-worktrees/green
git fetch origin staging
git rebase origin/staging
git checkout -b feature/green/046-vllm-status
```

---

## Risk Notes

- **GCP IAM Token:** The status and warmup endpoints need the same GCP identity token as the chat endpoint to reach the IAM-protected vLLM service. The token-fetching logic is duplicated — consider extracting it into a helper in `auth.py` or a utility, but that's an optional cleanup, not a blocker.
- **Polling frequency:** The frontends will poll `/vllm/status` every ~15 seconds. At that rate with a 10s timeout, you could have overlapping requests. The 10s timeout is fine — httpx creates a new connection per request.
- **Cold start timing:** Rule 08 says 15-30s for the 9B model. The retry strategy (0s + 5s + 15s = 20s total) covers this window. If the cold start takes longer, the user gets a 503 with a clear "try again in 30 seconds" message.
- **Model name mismatch:** `config.py` defaults to `Qwen2.5-VL-7B-Instruct` but `service.yaml` deploys `Qwen3.5-9B-Instruct`. The status endpoint should report whatever model vLLM actually has loaded (from the `/v1/models` response), not the config default. This is already handled in the implementation above.
- **No auth on status/warmup:** These are intentionally public. Server state is not sensitive, and requiring auth would make polling from unauthenticated contexts impossible. Rate limiting could be added later if needed but is not required now.

---

*Mr. Pink — Scout & Auditor*
*"The best chat experience starts before the first message is sent."*
