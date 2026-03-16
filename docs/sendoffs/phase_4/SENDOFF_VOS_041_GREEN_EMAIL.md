# SENDOFF: VOS-041 — Fix Email (Whitelist CRUD, Gmail OAuth & AI Rewrite)

## Header
- **Date:** 2026-03-16
- **From:** Mr. Pink (Scout & Auditor)
- **To:** Mr. Green (Cloud Backend & API Engineer)
- **Task:** VOS-041 — Fix Email Screen (Whitelist Management, Gmail OAuth & AI Rewrite)
- **Branch:** `feature/green/041-email-pipeline`
- **Priority:** HIGH
- **Depends on:** VOS-039 (CORS/auth), VOS-045 (model upgrade for AI rewrite — can be deferred)

---

## Context

The email service (`backend/app/services/email_service.py`) has working Gmail OAuth logic for fetching inbox and sending emails, plus a mock mode (`MOCK_GMAIL=true`). However, there are three major gaps:

1. **No whitelist management API** — The `email_whitelist` Supabase table exists (created in migration `20260314000000`), and `email_service.py` reads from it to filter inbox, but there are no endpoints for users to add/remove whitelisted addresses.
2. **Env var name mismatch** — `email_service.py` reads `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` but `config.py` defines `gmail_client_id`/`gmail_client_secret` (which map to `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`). This will cause Gmail OAuth to fail in production.
3. **No AI rewrite endpoint** — The PRD and handoff spec request a feature where users can send a draft email body to Qwen for AI-powered rewriting before sending.

The mobile app has a compose button with no `onPress` handler, and the web app has a working compose modal. Both frontends need the backend whitelist and rewrite endpoints to be built first.

---

## Mission

### Step 1: Fix Gmail OAuth Env Var Mismatch

**File:** `backend/app/services/email_service.py` (lines 49-50)

This was identified in VOS-039 but is critical for email specifically. If you already fixed it in VOS-039, verify it here.

**Current (broken):**
```python
client_id=os.environ.get("GOOGLE_CLIENT_ID"),
client_secret=os.environ.get("GOOGLE_CLIENT_SECRET")
```

**Fix — use the `settings` object from config.py:**
```python
from app.utils.config import settings

# In get_user_gmail_credentials() method:
client_id=settings.gmail_client_id,
client_secret=settings.gmail_client_secret
```

Also apply `settings` to the Supabase client init at the top of the class (lines 21-24) for consistency:
```python
class EmailService:
    def __init__(self):
        from app.utils.config import settings
        if settings.supabase_url and settings.supabase_service_role_key:
            self.supabase: Client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
        else:
            self.supabase = None
```

### Step 2: Add Whitelist CRUD Endpoints

**File:** `backend/app/api/v1/endpoints.py`

Add three new endpoints for managing the email whitelist. The `email_whitelist` table schema (from migration `20260314000000`) has columns: `id`, `user_id`, `email_address`, `contact_name`.

**2a. List Whitelisted Emails**

```python
@router.get("/email/whitelist")
async def get_email_whitelist(user_id: str = Depends(get_current_user)):
    """Return all whitelisted email addresses for the current user."""
    whitelist = await email_service.get_whitelisted_emails(user_id)
    return {"whitelist": whitelist}
```

But the existing `get_whitelisted_emails()` method only returns email addresses as strings. Extend it to return full objects:

**File:** `backend/app/services/email_service.py` — Add a new method:

```python
async def get_whitelist_entries(self, user_id: str) -> List[Dict]:
    """Fetch full whitelist entries (id, email, contact_name) for a user."""
    if not self.supabase:
        return []
    response = self.supabase.table("email_whitelist") \
        .select("id, email_address, contact_name") \
        .eq("user_id", user_id) \
        .order("contact_name", desc=False) \
        .execute()
    return response.data
```

Then update the endpoint:
```python
@router.get("/email/whitelist")
async def get_email_whitelist(user_id: str = Depends(get_current_user)):
    entries = await email_service.get_whitelist_entries(user_id)
    return {"whitelist": entries}
```

**2b. Add Email to Whitelist**

```python
class WhitelistAddRequest(BaseModel):
    email_address: str
    contact_name: Optional[str] = None

@router.post("/email/whitelist")
async def add_to_whitelist(
    request: WhitelistAddRequest,
    user_id: str = Depends(get_current_user)
):
    """Add an email address to the user's whitelist."""
    result = await email_service.add_to_whitelist(
        user_id, request.email_address, request.contact_name
    )
    return result
```

**File:** `backend/app/services/email_service.py` — Add method:

```python
async def add_to_whitelist(self, user_id: str, email_address: str, contact_name: str = None) -> dict:
    """Add an email to the user's whitelist. Returns the created entry."""
    if not self.supabase:
        return {"error": "Supabase not initialized"}

    # Check for duplicates
    existing = self.supabase.table("email_whitelist") \
        .select("id") \
        .eq("user_id", user_id) \
        .eq("email_address", email_address.lower().strip()) \
        .execute()

    if existing.data:
        return {"error": "Email already whitelisted", "id": existing.data[0]["id"]}

    result = self.supabase.table("email_whitelist") \
        .insert({
            "user_id": user_id,
            "email_address": email_address.lower().strip(),
            "contact_name": contact_name or email_address.split("@")[0]
        }) \
        .execute()

    return {"added": True, "entry": result.data[0] if result.data else None}
```

**2c. Remove Email from Whitelist**

```python
@router.delete("/email/whitelist/{entry_id}")
async def remove_from_whitelist(
    entry_id: str,
    user_id: str = Depends(get_current_user)
):
    """Remove an email from the user's whitelist."""
    result = await email_service.remove_from_whitelist(user_id, entry_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
```

**File:** `backend/app/services/email_service.py` — Add method:

```python
async def remove_from_whitelist(self, user_id: str, entry_id: str) -> dict:
    """Remove an entry from the user's whitelist by ID."""
    if not self.supabase:
        return {"error": "Supabase not initialized"}

    result = self.supabase.table("email_whitelist") \
        .delete() \
        .eq("id", entry_id) \
        .eq("user_id", user_id) \
        .execute()

    if not result.data:
        return {"error": "Whitelist entry not found"}

    return {"removed": True, "id": entry_id}
```

### Step 3: Add AI Email Rewrite Endpoint

**File:** `backend/app/api/v1/endpoints.py`

This endpoint takes a draft email body, sends it to Qwen for rewriting, and returns the improved text. It reuses the same vLLM call pattern as the `/chat` endpoint.

```python
class EmailRewriteRequest(BaseModel):
    body: str
    tone: Optional[str] = "professional"  # professional, casual, formal, concise

@router.post("/email/rewrite")
async def rewrite_email(
    request: EmailRewriteRequest,
    user_id: str = Depends(get_current_user)
):
    """AI-powered email rewrite using Qwen."""
    qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
    if not qwen_url:
        return {"rewritten": request.body, "note": "AI unavailable — returned original"}

    # Get GCP identity token
    headers = {"Content-Type": "application/json"}
    try:
        import google.auth.transport.requests
        import google.oauth2.id_token
        auth_req = google.auth.transport.requests.Request()
        qwen_base = qwen_url.rstrip("/v1").rstrip("/")
        identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
        headers["Authorization"] = f"Bearer {identity_token}"
    except Exception:
        pass

    system_prompt = (
        f"You are an email writing assistant. Rewrite the following email draft "
        f"to be more {request.tone}. Preserve the core message and intent. "
        f"Return ONLY the rewritten email body — no preamble, no explanation."
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{qwen_url.rstrip('/')}/chat/completions",
                headers=headers,
                json={
                    "model": os.environ.get("QWEN_MODEL_NAME", "RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8"),
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": request.body}
                    ],
                    "stream": False,
                    "max_tokens": 1024,
                    "temperature": 0.7
                }
            )
            response.raise_for_status()
            data = response.json()
            rewritten = data["choices"][0]["message"]["content"]
            return {"rewritten": rewritten}
    except Exception as e:
        return {"rewritten": request.body, "error": f"AI rewrite failed: {str(e)}"}
```

**Note:** The rewrite endpoint uses a shorter timeout (60s vs 300s for chat) and returns the original body on failure rather than raising an HTTP error — this is intentional so the compose UI doesn't break.

### Step 4: Verify Mock Mode Still Works

The existing mock mode (`MOCK_GMAIL=true`) is a critical dev/demo tool. After your changes, verify:

```bash
MOCK_GMAIL=true uvicorn app.main:app --reload

# Test inbox
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/email/inbox
# Expected: {"emails": [{"id": "mock_msg_1", ...}]}

# Test send
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"to":"test@test.com","subject":"Test","body":"Hello"}' \
  http://localhost:8000/api/v1/email/send
# Expected: {"message": "Email sent successfully"}
```

---

## API Contract (Complete)

After this task, the email API surface will be:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/email/inbox` | Yes | Filtered inbox (whitelist only) |
| POST | `/api/v1/email/send` | Yes | Send email via Gmail proxy |
| GET | `/api/v1/email/whitelist` | Yes | List whitelist entries |
| POST | `/api/v1/email/whitelist` | Yes | Add email to whitelist |
| DELETE | `/api/v1/email/whitelist/{id}` | Yes | Remove from whitelist |
| POST | `/api/v1/email/rewrite` | Yes | AI rewrite of draft body |

---

## Key Files

| File | What to Do |
|------|-----------|
| `backend/app/api/v1/endpoints.py` | Add 4 new endpoints (whitelist CRUD + rewrite) |
| `backend/app/services/email_service.py` | Fix env vars, add whitelist management methods |
| `backend/app/utils/config.py` | Already has `gmail_*` fields — no change needed |
| `backend/.env` | Verify `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` are set |

---

## Definition of Done

- [ ] `GET /api/v1/email/whitelist` returns user's whitelisted emails
- [ ] `POST /api/v1/email/whitelist` adds email (with duplicate check)
- [ ] `DELETE /api/v1/email/whitelist/{id}` removes entry (with user_id guard)
- [ ] `GET /api/v1/email/inbox` filters correctly against whitelist
- [ ] `POST /api/v1/email/send` works with valid Gmail OAuth
- [ ] `POST /api/v1/email/rewrite` returns AI-rewritten text (or original on failure)
- [ ] Env var mismatch fixed (`GMAIL_*` used consistently)
- [ ] Mock mode (`MOCK_GMAIL=true`) still works for inbox and send
- [ ] All changes committed and pushed to `feature/green/041-email-pipeline`
- [ ] Handoff Letter submitted with curl test evidence

---

## Worktree Setup

```bash
cd /home/marco/vibeos-worktrees/green
git fetch origin staging
git rebase origin/staging  # Ensure VOS-039 and VOS-040 are included
git checkout -b feature/green/041-email-pipeline
```

---

## Risk Notes

- The AI rewrite endpoint depends on the vLLM service being available. If VOS-045 (model upgrade) hasn't landed yet, it will still work with the current `Qwen3.5-9B-Instruct` model. The rewrite feature is model-agnostic — it just needs a chat completions endpoint.
- Gmail OAuth token refresh is handled by `google-auth` automatically when the `refresh_token` is valid. If the refresh token has been revoked (user revoked app access in Google settings), the service will fail with a 401 from Google. Handle this gracefully with a clear error message.
- The whitelist `DELETE` endpoint uses `entry_id` (the row UUID), not the email address string. This prevents URL encoding issues with email addresses containing special characters.
- RLS on `email_whitelist` ensures users can only see/modify their own entries — but since we're using the `service_role_key`, RLS is bypassed. The `user_id` guard in the service methods provides the access control instead.

---

*Mr. Pink — Scout & Auditor*
*"Whitelist, send, rewrite. Make the email screen worth opening."*
