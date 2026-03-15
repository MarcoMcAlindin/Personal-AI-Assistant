---
description: Implementation blueprint for FastAPI Supabase JWT authentication middleware (VOS-025).
---

# Implementation Plan: VOS-025 — FastAPI Authentication Middleware

- **Date:** 2026-03-15
- **Drafted By:** Mr. Pink (Architectural Scout)
- **Assigned To:** Mr. Green (Cloud Backend & API Engineer)
- **Priority:** 🔴 CRITICAL — Security gap. No production deploy until complete.
- **Deadline:** 2026-03-25 EOD
- **Branch:** `feature/green/25-auth-middleware`

---

## Context

Every FastAPI endpoint currently uses `user_id: str = "placeholder_user_id"` — meaning any unauthenticated HTTP request has unrestricted access to all user data. Supabase RLS (VOS-003) is correctly locked at the database level, but the gateway never validates incoming tokens. This task wires Supabase JWT validation into FastAPI so that `user_id` is always a real, verified UUID.

---

## Dependency Chain

VOS-025 is a **hard blocker** for:
- **VOS-026** (Tasks API) — all task endpoints require `get_current_user`
- **VOS-027** (Health Metrics API) — same dependency
- Do NOT start VOS-026 or VOS-027 until VOS-025 is merged and verified.

---

## Step-by-Step Implementation

### Step 1 — Add Dependency to `requirements.txt`

Add the following line to `/backend/requirements.txt` (after `pydantic-settings`):

```
python-jose[cryptography]==3.3.*
```

> `httpx` is already present — no duplicate needed.

---

### Step 2 — Create `/backend/app/utils/auth.py`

Create this file exactly as follows:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import os

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """
    Validates a Supabase-issued JWT and returns the verified user UUID (str).
    Raises HTTP 401 on any validation failure.
    """
    token = credentials.credentials
    secret = os.environ.get("SUPABASE_JWT_SECRET")

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: SUPABASE_JWT_SECRET not set.",
        )

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload missing 'sub' field.",
            )
        return user_id
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
        )
```

**Notes:**
- `HTTPBearer()` automatically extracts the `Authorization: Bearer <token>` header and returns a 403 if the header is absent (FastAPI default behaviour for `HTTPBearer`).
- Supabase JWTs use `HS256` algorithm and `audience="authenticated"` — this is non-negotiable.
- `sub` is the Supabase user UUID — this becomes `user_id` throughout the app.

---

### Step 3 — Update `/backend/app/api/v1/endpoints.py`

Replace every `user_id: str = "placeholder_user_id"` pattern with `Depends(get_current_user)`.

**Add to the import block at the top:**
```python
from app.utils.auth import get_current_user
```

**Endpoints to update:**

| Endpoint | Old signature | New signature |
|---|---|---|
| `GET /email/inbox` | `user_id: str = "placeholder_user_id"` | `user_id: str = Depends(get_current_user)` |
| `POST /email/send` | `user_id: str = "placeholder_user_id"` | `user_id: str = Depends(get_current_user)` |
| `POST /chat` | `user_id: str = "placeholder_user_id"` inside `ChatRequest` | Move to function param: `user_id: str = Depends(get_current_user)` |

**For `/chat`:** The `ChatRequest` model currently embeds `user_id`. Remove it from the model and add it as a function dependency instead:

```python
class ChatRequest(BaseModel):
    message: str
    # user_id REMOVED — now comes from JWT via Depends

@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    context = await rag_service.build_context_block(user_id, request.message)
    # ... rest unchanged
```

**For `/health-sync`:** This endpoint is currently a placeholder. Add `user_id: str = Depends(get_current_user)` to its signature now so it is auth-ready for VOS-027.

**Verification after edit:** Run a grep to confirm zero `placeholder_user_id` strings remain:
```bash
grep -r "placeholder_user_id" backend/
# Must return empty
```

---

### Step 4 — Update `/backend/app/utils/config.py`

The config file is currently empty. Add Pydantic Settings for the new secret:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_jwt_secret: str = ""
    qwen_endpoint_url: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
```

> Other services may already load env vars directly via `os.environ.get()`. Do not refactor them — only establish the Settings class here. The `auth.py` utility reads `SUPABASE_JWT_SECRET` via `os.environ.get()` directly for simplicity.

---

### Step 5 — Update `/backend/.env.example`

Add the following line (place it in the Supabase block):

```
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
```

**Where to find this value:**
Supabase Dashboard → Project Settings → API → `JWT Secret` (under "Project API keys")

Also add `SUPABASE_JWT_SECRET` to the **GitHub Repository Secrets** (Settings → Secrets → Actions) so the CI/CD pipeline can use it.

---

### Step 6 — Write Tests in `/backend/tests/`

Create `/backend/tests/test_auth.py`:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from jose import jwt
import os
import time

client = TestClient(app)
TEST_SECRET = "test-secret-for-unit-tests-only"


def _make_token(secret: str, sub: str = "test-user-uuid", exp_offset: int = 3600) -> str:
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + exp_offset,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_valid_token_returns_200(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    token = _make_token(TEST_SECRET)
    response = client.get("/api/v1/email/inbox", headers={"Authorization": f"Bearer {token}"})
    # 200 or 500 (upstream service error) — NOT 401 or 403
    assert response.status_code != 401
    assert response.status_code != 403


def test_missing_token_returns_403(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    response = client.get("/api/v1/email/inbox")
    assert response.status_code == 403


def test_expired_token_returns_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    token = _make_token(TEST_SECRET, exp_offset=-1)  # already expired
    response = client.get("/api/v1/email/inbox", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_wrong_secret_returns_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    token = _make_token("wrong-secret")
    response = client.get("/api/v1/email/inbox", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
```

Run tests with:
```bash
cd backend
pytest tests/test_auth.py -v
```

All 4 tests must pass before submitting the Handoff.

---

## Files to Create / Modify

| Action | File |
|---|---|
| CREATE | `backend/app/utils/auth.py` |
| CREATE | `backend/tests/test_auth.py` |
| MODIFY | `backend/requirements.txt` — add `python-jose[cryptography]` |
| MODIFY | `backend/app/api/v1/endpoints.py` — replace all `placeholder_user_id` |
| MODIFY | `backend/app/utils/config.py` — add Settings class |
| MODIFY | `backend/.env.example` — add `SUPABASE_JWT_SECRET` |

---

## Environment Variables

| Variable | Where to Get It | Where to Add It |
|---|---|---|
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Project Settings → API → JWT Secret | `backend/.env`, `backend/.env.example`, GitHub Repository Secrets |

---

## Definition of Done (Pink Verification Checklist)

- [ ] `backend/app/utils/auth.py` exists with correct `get_current_user` function
- [ ] All 4 affected endpoints use `Depends(get_current_user)` — zero hardcoded `placeholder_user_id` strings
- [ ] `SUPABASE_JWT_SECRET` added to `.env.example` and documented
- [ ] All 4 pytest cases pass: valid token 200, missing token 403, expired token 401, wrong secret 401
- [ ] Handoff Letter includes `grep` output confirming zero `placeholder_user_id` strings remain
- [ ] Branch `feature/green/25-auth-middleware` pushed to origin

---

## Pink Audit Notes

During audit, Mr. Pink will:
1. Run `grep -r "placeholder_user_id" backend/` — must return empty
2. Run `pytest tests/test_auth.py -v` — all 4 must pass
3. Confirm `SUPABASE_JWT_SECRET` is in `.env.example`
4. Confirm no application logic was changed outside of the 6 files listed above

*Drafted by Mr. Pink — 2026-03-15*
