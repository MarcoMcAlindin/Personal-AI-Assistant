# HANDOFF: VOS-039 -- Fix Backend CORS, Auth Flow & API Connectivity

## Header
- **Date:** 2026-03-16
- **From:** Mr. Green (Cloud Backend & API Engineer)
- **To:** Mr. Pink (Audit)
- **Task:** VOS-039 -- Fix Backend CORS, Auth Flow & API Connectivity
- **Branch:** `feature/green/039-cors-auth-connectivity`
- **Commit:** `4edc578`

---

## Summary of Changes

### Step 1: CORS Configuration (main.py)
- Added `http://127.0.0.1:3000` and production Cloud Run URL to default origins
- Added `OPTIONS` to `allow_methods` for proper preflight handling

### Step 2: Auth Dev-Mode Bypass (auth.py)
- Added `VIBEOS_DEV_MODE=true` environment variable bypass that returns a configurable dev user ID
- Set `HTTPBearer(auto_error=False)` so missing auth header returns a clean 401 instead of crashing
- Added explicit `credentials is None` check with 401 response

### Step 3: Chat Save/Pin Endpoint (endpoints.py)
- Implemented `PATCH /api/v1/chat/save/{message_id}` -- sets `is_saved=true` in `chat_history`
- Enforces `user_id` ownership guard via `.eq("user_id", user_id)`
- Returns 404 if message not found, 503 if Supabase unavailable

### Step 4: Chat History Storage (endpoints.py)
- After successful AI response, both user message and assistant response are inserted into `chat_history`
- Wrapped in try/except so storage failure never breaks the chat response

### Step 5: Health Endpoint Graceful Empty
- Verified: `GET /health/analysis` already returns `{"analysis": null}` when no data exists -- no change needed

### Step 6: Gmail Env Var Fix (email_service.py)
- Changed `os.environ.get("GOOGLE_CLIENT_ID")` to `os.environ.get("GMAIL_CLIENT_ID")`
- Changed `os.environ.get("GOOGLE_CLIENT_SECRET")` to `os.environ.get("GMAIL_CLIENT_SECRET")`

### Step 7: RAG Service Guard (rag_service.py)
- Added `self.supabase = None` in the else branch of `__init__`
- Added `if not self.supabase` guard to `get_10_day_history()` and `search_pinned_wisdom()`

### Bonus: Config Expansion (config.py)
- Added: `supabase_service_role_key`, `qwen_model_name`, `cors_origins`, `gmail_client_id`, `gmail_client_secret`, `gmail_refresh_token`, `ticketmaster_api_key`
- Added `extra = "ignore"` to prevent crashes from unexpected env vars

---

## Files Changed (6)

| File | Change |
|------|--------|
| `backend/app/main.py` | CORS origins + OPTIONS method |
| `backend/app/utils/auth.py` | Dev-mode bypass, auto_error=False |
| `backend/app/utils/config.py` | 7 new settings fields, extra=ignore |
| `backend/app/api/v1/endpoints.py` | Chat save endpoint, chat history storage |
| `backend/app/services/email_service.py` | GOOGLE_* to GMAIL_* env vars |
| `backend/app/services/rag_service.py` | Null guard on supabase + method guards |

---

## Test Evidence

```
# CORS preflight -- localhost:3000
$ curl -X OPTIONS ... -H "Origin: http://localhost:3000"
access-control-allow-origin: http://localhost:3000
access-control-allow-methods: GET, POST, PATCH, DELETE, OPTIONS

# CORS preflight -- 127.0.0.1:3000
$ curl -X OPTIONS ... -H "Origin: http://127.0.0.1:3000"
access-control-allow-origin: http://127.0.0.1:3000

# Dev-mode auth bypass (protected endpoint, no token)
$ curl http://127.0.0.1:8000/api/v1/health/analysis
{"analysis":null}

# Public feeds (no auth required)
$ curl http://127.0.0.1:8000/api/v1/feeds/tech
10 articles returned with title, url, source, published_at, description

# Chat mock mode (RAG guard works, no crash)
$ curl -X POST .../chat -d '{"message":"Hello"}'
{"response":"[MOCK CONTEXT]: No historical context available.\n\n...[REPLY]: I am functioning in mock mode..."}

# Chat save (503 -- Supabase not available, not 500 crash)
$ curl -X PATCH .../chat/save/fake-msg-id
{"detail":"Supabase not available"}
```

---

## Risk Notes
- `VIBEOS_DEV_MODE=true` must NEVER be set in production Cloud Run. Verified it is not in `deploy.sh`.
- `auto_error=False` on HTTPBearer means unauthenticated requests to protected endpoints get a clean 401 instead of a FastAPI auto-generated error.

---

## Definition of Done Checklist
- [x] Uncommitted working-tree fixes committed
- [x] CORS preflight returns correct Access-Control-Allow-Origin for localhost:3000
- [x] GET /api/v1/feeds/tech returns articles without auth
- [x] GET /api/v1/feeds/concerts returns concerts without auth
- [x] POST /api/v1/chat with dev-mode returns mock response
- [x] PATCH /api/v1/chat/save/{id} endpoint exists and validates
- [x] Chat messages stored in chat_history (code path verified)
- [x] GET /api/v1/health/analysis returns {"analysis": null} (not 500)
- [x] RAG service doesn't crash when Supabase env vars are missing
- [x] All changes committed to feature/green/039-cors-auth-connectivity
