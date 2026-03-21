# HANDOFF: VOS-025 -- FastAPI Authentication Middleware

## 1. Header Information
- **Date:** 2026-03-15
- **From:** Mr. Green (Cloud Backend & API Engineer)
- **Recipient:** Mr. Pink (Audit) / CEO Review
- **Task ID:** VOS-025
- **Branch:** `feature/green/25-auth-middleware`

---

## 2. Summary

Implemented Supabase JWT authentication middleware for the FastAPI gateway. Every endpoint that previously used `user_id: str = "placeholder_user_id"` now validates a real `Authorization: Bearer <token>` header, decodes the Supabase JWT using HS256 + `audience="authenticated"`, and extracts the verified user UUID from the `sub` claim. The security gap that allowed unauthenticated access to all user data is now closed.

---

## 3. Changed Files

| Action | File | Description |
|--------|------|-------------|
| CREATE | `backend/app/utils/auth.py` | JWT validation logic with `get_current_user` dependency |
| CREATE | `backend/tests/__init__.py` | Test package init |
| CREATE | `backend/tests/test_auth.py` | 4 pytest cases covering valid, missing, expired, and wrong-secret tokens |
| MODIFY | `backend/requirements.txt` | Added `python-jose[cryptography]==3.3.*` |
| MODIFY | `backend/app/api/v1/endpoints.py` | Replaced all `placeholder_user_id` with `Depends(get_current_user)` across 4 endpoints |
| MODIFY | `backend/app/utils/config.py` | Added `Settings` class with `supabase_jwt_secret` field |
| MODIFY | `backend/.env.example` | Added `SUPABASE_JWT_SECRET` variable |

---

## 4. Strict Testing Instructions

### Automated Tests
```bash
cd /home/marco/supercyan-worktrees/green/backend
source .venv/bin/activate
pytest tests/test_auth.py -v
```

**Expected result:** All 4 tests pass:
- `test_valid_token_returns_200` -- PASSED
- `test_missing_token_returns_403` -- PASSED
- `test_expired_token_returns_401` -- PASSED
- `test_wrong_secret_returns_401` -- PASSED

### Grep Verification
```bash
grep -r "placeholder_user_id" backend/
```
**Expected result:** Empty output (zero matches).

### Manual curl Tests (with local server running)
```bash
# Start the server
cd /home/marco/supercyan-worktrees/green/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Test 1: No token -- should return 403
curl -s http://localhost:8000/api/v1/email/inbox | python3 -m json.tool
# Expected: {"detail": "Not authenticated"}

# Test 2: Invalid token -- should return 401
curl -s -H "Authorization: Bearer fake-token" http://localhost:8000/api/v1/email/inbox | python3 -m json.tool
# Expected: {"detail": "Invalid or expired token: ..."}

# Test 3: Valid token (generate with python-jose)
python3 -c "
from jose import jwt; import time
token = jwt.encode(
    {'sub': 'test-uuid', 'aud': 'authenticated', 'exp': int(time.time()) + 3600},
    'YOUR_SUPABASE_JWT_SECRET', algorithm='HS256'
)
print(token)
"
# Then:
curl -s -H "Authorization: Bearer <token_from_above>" http://localhost:8000/api/v1/email/inbox
# Expected: 200 or upstream service error (NOT 401/403)
```

---

## 5. Environment Variable Changes

| Variable | Value Source | Added To |
|----------|-------------|----------|
| `SUPABASE_JWT_SECRET` | Supabase Dashboard > Project Settings > API > JWT Secret | `backend/.env.example` |

**Action required:** Add `SUPABASE_JWT_SECRET` to GitHub Repository Secrets (Settings > Secrets > Actions) for CI/CD.

---

## 6. API / Database Schema Changes

### API Changes
No new endpoints were added. Existing endpoint signatures changed:

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /email/inbox` | `user_id` query param (default: placeholder) | JWT-authenticated, `user_id` from token `sub` |
| `POST /email/send` | `user_id` query param (default: placeholder) | JWT-authenticated, `user_id` from token `sub` |
| `POST /chat` | `user_id` in `ChatRequest` body (default: placeholder) | JWT-authenticated, `user_id` from token `sub`; removed from request body |
| `POST /health-sync` | No auth, no user context | JWT-authenticated, `user_id` from token `sub` |

**Breaking change for frontends:** All authenticated endpoints now require `Authorization: Bearer <supabase_jwt>` header. Mr. Blue must update API clients in `/web` and `/mobile` to include the Supabase session token.

### Database Schema Changes
None.

---

## 7. Notes for Next Agent

### Mr. Blue (Frontend)
- All API calls to `/email/*`, `/chat`, and `/health-sync` now require `Authorization: Bearer <token>` header
- The Supabase JS client provides the JWT via `supabase.auth.getSession()` -- pass `session.access_token` in the Authorization header
- `ChatRequest` body no longer accepts `user_id` -- remove it from the request payload

### Mr. Green (Self -- VOS-026 & VOS-027)
- `get_current_user` is ready to import: `from app.utils.auth import get_current_user`
- All new endpoints in VOS-026 (Tasks) and VOS-027 (Health) must use `user_id: str = Depends(get_current_user)`
- The `Settings` class in `config.py` is established -- add new env vars there as needed

---

## 8. Evolution & Self-Healing (Rule 20)

No new rules were created or amended during this task. Justification:

- The implementation followed Mr. Pink's blueprint (`VOS-025_v1_plan.md`) exactly as specified -- no deviations, no retries, no unexpected errors
- The only friction was a missing `beautifulsoup4` dependency in the venv (not in `requirements.txt`), which is a pre-existing gap unrelated to this task and outside Green's domain to fix (it is used by `feed_service.py` but was already listed as an implicit dependency)
- All 4 tests passed on first run after resolving the venv dependency

---

*Submitted by Mr. Green -- 2026-03-15*
