# SENDOFF: VOS-039 — Fix Backend CORS, Auth Flow & API Connectivity

## Header
- **Date:** 2026-03-16
- **From:** Mr. Pink (Scout & Auditor)
- **To:** Mr. Green (Cloud Backend & API Engineer)
- **Task:** VOS-039 — Fix Backend CORS, Auth Flow & API Connectivity
- **Branch:** `feature/green/039-cors-auth-connectivity`
- **Priority:** **P0 CRITICAL** — Blocks VOS-040, VOS-041, VOS-042, and all web E2E functionality

---

## Context

The web frontend builds and renders all 6 screens, but **nothing works end-to-end**. Every API call from the browser fails with CORS errors. Users are never prompted to log in. The mobile app has a hardcoded auto-login that bypasses real auth. This is the single highest-leverage task in the project — until CORS and auth work, the web app is a static mockup.

There are **uncommitted fixes already in the staging working tree** for `auth.py`, `config.py`, and `endpoints.py`. You must commit these first, verify they work, then complete the remaining gaps.

---

## Mission

### Step 0: Commit Existing Working-Tree Fixes

The following files have uncommitted changes on `staging` that contain partial fixes. Before touching anything, commit them to preserve the work:

```bash
cd /home/marco/supercyan-worktrees/green
git checkout -b feature/green/039-cors-auth-connectivity
git cherry-pick or merge from staging as needed
```

Files with uncommitted fixes:
- `backend/app/utils/auth.py` — ES256/JWKS JWT validation with HS256 fallback (already upgraded)
- `backend/app/utils/config.py` — Added `cors_origins`, `supabase_jwt_secret`, `gmail_*`, `ticketmaster_api_key` + `extra="ignore"`
- `backend/app/api/v1/endpoints.py` — Fixed double `/v1` in Qwen URL construction

### Step 1: Fix CORS Configuration

**File:** `backend/app/main.py` (lines 8-11)

Current state:
```python
_default_origins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", _default_origins).split(",") if o.strip()]
```

**Required changes:**
1. Add `http://localhost:3000` and `http://127.0.0.1:3000` to `_default_origins` (port 3000 is the Vite dev server per CLAUDE.md). Port 5173 is Vite's default but the project config uses 3000.
2. Add the production Cloud Run URL `https://supercyan-backend-enffsru5pa-ew.a.run.app` to defaults.
3. Ensure `allow_headers` includes `Authorization` explicitly (currently `["*"]` which should work, but verify).
4. Ensure `OPTIONS` is in `allow_methods` for preflight requests.

**Verification:**
```bash
# Start backend locally
cd backend && uvicorn app.main:app --reload --port 8000

# Test CORS preflight from another terminal
curl -X OPTIONS http://localhost:8000/api/v1/feeds/tech \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v 2>&1 | grep -i "access-control"

# Expected: Access-Control-Allow-Origin: http://localhost:3000
```

### Step 2: Fix Auth — Make Public Endpoints Truly Public

**File:** `backend/app/api/v1/endpoints.py`

**Problem:** The `/feeds/tech` and `/feeds/concerts` endpoints do NOT use `Depends(get_current_user)` — they are already public. But the web frontend's `feedService.ts` does NOT send auth headers, while `aiService.ts` sends `user_id: 'ceo_test'` in the JSON body instead of a Bearer token. The real auth issue is that authenticated endpoints (`/email/inbox`, `/chat`, `/health/*`) require a valid Supabase JWT, but:

1. The web app has **no login flow** — it never obtains a Supabase session token.
2. `aiService.ts` (line 15) sends `user_id: 'ceo_test'` as a body parameter, but the endpoint reads `user_id` from the JWT via `Depends(get_current_user)`. The body parameter is ignored.

**Required changes:**

a) **Do NOT add auth to feed endpoints** — they must remain public (no `Depends(get_current_user)`).

b) **Add a development bypass for auth** during local testing. In `backend/app/utils/auth.py`, add a dev-mode fallback that returns a default user ID when `VIBEOS_DEV_MODE=true`:

```python
import os

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    # Dev mode bypass for local testing
    if os.environ.get("VIBEOS_DEV_MODE") == "true":
        return os.environ.get("VIBEOS_DEV_USER_ID", "ceo-dev-user")

    # ... existing JWT validation logic ...
```

c) **For production:** The real fix is that frontends must send a valid Supabase JWT in the `Authorization: Bearer <token>` header. The mobile app already does this correctly in `mobile/src/services/api.js` (lines 8-16 — `getAuthHeaders()` reads from `supabase.auth.getSession()`). The web app needs the same pattern — but that's Blue's job. For now, ensure the backend auth works correctly when a valid JWT IS provided.

### Step 3: Fix the Chat Save/Pin Endpoint

**File:** `backend/app/api/v1/endpoints.py`

**Problem:** `PATCH /chat/save/:id` is listed in the API spec (CLAUDE.md) and both frontends call it (`mobile/src/services/api.js:63-71`, `web/src/services/aiService.ts:35-38`), but **the endpoint does not exist in the backend**.

**Implementation required:**

```python
@router.patch("/chat/save/{message_id}")
async def save_chat_message(message_id: str, user_id: str = Depends(get_current_user)):
    """Pin an AI response to permanent RAG memory by setting is_saved=true."""
    try:
        result = rag_service.supabase.table("chat_history") \
            .update({"is_saved": True}) \
            .eq("id", message_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Message not found")

        return {"saved": True, "message_id": message_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")
```

**Important:** The `.eq("user_id", user_id)` guard ensures users can only pin their own messages (RLS compliance).

### Step 4: Fix Chat History Storage

**Problem:** The `/chat` endpoint (line 67-108) calls the AI and returns the response, but **never stores the conversation in `chat_history`**. This means the RAG service's `get_10_day_history()` will always return empty results because nothing is being written.

**Implementation required — add to the `/chat` endpoint, after getting the AI response:**

```python
# After line 106 (after getting the AI response content)
# Store both user message and AI response in chat_history
try:
    from datetime import datetime
    now = datetime.utcnow().isoformat()

    rag_service.supabase.table("chat_history").insert([
        {"user_id": user_id, "role": "user", "message": request.message, "timestamp": now},
        {"user_id": user_id, "role": "assistant", "message": data["choices"][0]["message"]["content"], "timestamp": now}
    ]).execute()
except Exception:
    pass  # Don't fail the chat response if storage fails
```

### Step 5: Fix Health Endpoint Graceful Empty Response

**Problem:** If `health_metrics` has no rows for a user, the health endpoints return empty arrays, which is correct. But `get_analysis()` returns `None` — ensure the endpoint serializes this as `{"analysis": null}` not a 500 error.

**Current code (line 125-128):**
```python
@router.get("/health/analysis")
async def get_health_analysis(user_id: str = Depends(get_current_user)):
    analysis = await health_service.get_analysis(user_id)
    return {"analysis": analysis}
```

This is actually correct. Verify it doesn't 500 with an empty table by testing:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/health/analysis
# Expected: {"analysis": null}
```

### Step 6: Fix Env Var Name Mismatch for Gmail

**File:** `backend/app/services/email_service.py` (lines 49-50)

**Problem:** `config.py` defines `gmail_client_id` / `gmail_client_secret` (which reads from `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` env vars). But `email_service.py` reads `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` directly via `os.environ.get()`.

**Fix:** Change `email_service.py` lines 49-50 to use the same env var names as `config.py`:

```python
# Line 49-50: Change from
client_id=os.environ.get("GOOGLE_CLIENT_ID"),
client_secret=os.environ.get("GOOGLE_CLIENT_SECRET")

# To:
client_id=os.environ.get("GMAIL_CLIENT_ID"),
client_secret=os.environ.get("GMAIL_CLIENT_SECRET")
```

Or better, import and use `settings`:
```python
from app.utils.config import settings

# Then in get_user_gmail_credentials():
client_id=settings.gmail_client_id,
client_secret=settings.gmail_client_secret
```

### Step 7: Add RAG Service Guard

**File:** `backend/app/services/rag_service.py`

**Problem:** If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, `self.supabase` is never assigned, and any method call raises `AttributeError`. Other services (email, health) handle this with `self.supabase = None` checks.

**Fix:** Add the same pattern:

```python
class RAGService:
    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase = None  # ADD THIS LINE

    async def get_10_day_history(self, user_id: str) -> str:
        if not self.supabase:  # ADD THIS GUARD
            return "No historical context available."
        # ... rest of method ...

    async def search_pinned_wisdom(self, user_id: str, query: str) -> str:
        if not self.supabase:  # ADD THIS GUARD
            return ""
        # ... rest of method ...
```

---

## Key Files (Complete Reference)

| File | What to Do |
|------|-----------|
| `backend/app/main.py` | Fix CORS origins (Step 1) |
| `backend/app/utils/auth.py` | Add dev-mode bypass (Step 2) |
| `backend/app/api/v1/endpoints.py` | Add `PATCH /chat/save/{message_id}`, add chat history storage (Steps 3-4) |
| `backend/app/services/email_service.py` | Fix env var names `GOOGLE_*` → `GMAIL_*` (Step 6) |
| `backend/app/services/rag_service.py` | Add `self.supabase = None` fallback + method guards (Step 7) |
| `backend/app/utils/config.py` | Already fixed in uncommitted work — commit it |

---

## Definition of Done

- [ ] Uncommitted working-tree fixes committed
- [ ] CORS preflight returns correct `Access-Control-Allow-Origin` for `localhost:3000`
- [ ] `GET /api/v1/feeds/tech` returns articles without auth
- [ ] `GET /api/v1/feeds/concerts` returns concerts without auth
- [ ] `POST /api/v1/chat` with valid JWT returns AI response
- [ ] `PATCH /api/v1/chat/save/{id}` sets `is_saved=true` in `chat_history`
- [ ] Chat messages (user + assistant) are stored in `chat_history` table
- [ ] `GET /api/v1/health/analysis` returns `{"analysis": null}` when no data exists (not 500)
- [ ] `GET /api/v1/email/inbox` works with valid Gmail OAuth credentials
- [ ] RAG service doesn't crash when Supabase env vars are missing
- [ ] All changes committed and pushed to `feature/green/039-cors-auth-connectivity`
- [ ] Handoff Letter submitted with curl test evidence

---

## Worktree Setup

```bash
cd /home/marco/supercyan-worktrees/green
git fetch origin staging
git rebase origin/staging
git checkout -b feature/green/039-cors-auth-connectivity
```

---

## Risk Notes

- The uncommitted changes on staging span multiple agent domains. Only commit the files in YOUR domain (`backend/`). Do not commit frontend or docs changes.
- The dev-mode auth bypass (`VIBEOS_DEV_MODE=true`) must NEVER be enabled in production Cloud Run. Ensure it is not set in `backend/deploy.sh`.
- The `email_service.py` env var fix is a one-line change but will break email if the `.env` file uses `GOOGLE_CLIENT_ID` — check `.env` and update the variable names there too if needed.

---

*Mr. Pink — Scout & Auditor*
*"This is the keystone. Fix CORS and auth, and the whole app comes alive."*
