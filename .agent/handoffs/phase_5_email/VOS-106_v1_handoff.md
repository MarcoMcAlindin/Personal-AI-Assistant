# Handoff Letter -- VOS-106

- **Date:** 2026-03-22
- **Recipient:** Mr. Pink (Audit) / Next Agent
- **Task ID:** VOS-106
- **Author:** Mr. Green

---

## Summary

Implemented a complete per-user Google OAuth 2.0 flow in the FastAPI backend. Users can now connect their Gmail account through four dedicated endpoints. Token storage migrated from the legacy `users.settings.google_tokens` path to the canonical `users.oauth_tokens.google` JSONB column. Auto-refresh logic with Supabase persistence is included in the credential loading path.

---

## Changed Files

| File | Change |
|------|--------|
| `backend/app/utils/config.py` | Added `google_redirect_uri` and `frontend_url` to `Settings` |
| `backend/app/services/email_service.py` | Replaced `get_user_gmail_credentials()` with oauth_tokens-backed implementation; added `_save_google_tokens()` helper |
| `backend/app/api/v1/endpoints.py` | Added `_build_google_flow()` factory and four new routes under `# -- Google OAuth --` block |
| `.env.example` | Added `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` |

---

## Strict Testing Instructions

### 1. Confirm new endpoints are registered

```bash
curl http://localhost:8000/openapi.json | python3 -m json.tool | grep "/auth/google"
```
Expected: four paths visible (`/authorize`, `/callback`, `/status`, `/disconnect`).

### 2. Test /auth/google/authorize (requires valid JWT or dev mode)

```bash
# With VIBEOS_DEV_MODE=true in .env
curl -s http://localhost:8000/api/v1/auth/google/authorize | python3 -m json.tool
```
Expected: `{"authorization_url": "https://accounts.google.com/o/oauth2/auth?...", "state": "<user_id>:<token>"}`.

### 3. Test /auth/google/status -- not connected

```bash
curl -s http://localhost:8000/api/v1/auth/google/status | python3 -m json.tool
```
Expected: `{"gmail": {"connected": false, "email": null}}`.

### 4. Test /auth/google/status -- connected (seed tokens in Supabase first)

```sql
UPDATE users
SET oauth_tokens = '{"google": {"access_token": "fake", "refresh_token": "fake_refresh", "token_expiry": null, "scopes": []}}'::jsonb
WHERE id = '<test_user_id>';
```
Then re-run status endpoint. Expected: `{"gmail": {"connected": true, "email": "<user_email>"}}`.

### 5. Test /auth/google/disconnect

```bash
curl -s -X DELETE http://localhost:8000/api/v1/auth/google/disconnect | python3 -m json.tool
```
Expected: `{"disconnected": true}`. Confirm `oauth_tokens` in Supabase no longer contains `google` key.

### 6. Full E2E OAuth flow (requires real Google Cloud Console credentials)

1. Set `GOOGLE_REDIRECT_URI`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `FRONTEND_URL` in `.env`.
2. Hit `/auth/google/authorize` -- copy `authorization_url`.
3. Open URL in browser, sign in with Google, grant scopes.
4. Google redirects to `/auth/google/callback?code=...&state=...`.
5. Confirm redirect lands on `{FRONTEND_URL}/integrations?connected=gmail`.
6. Run status endpoint -- expect `connected: true`.

---

## Environment Variable Changes

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_REDIRECT_URI` | Exact callback URL registered in Google Cloud Console | `http://localhost:8000/api/v1/auth/google/callback` |
| `FRONTEND_URL` | Base URL for post-OAuth browser redirect | `http://localhost:3000` |

Both must be added to `.env` (and Cloud Run secrets for production).

**Important for production deployment:** `GOOGLE_REDIRECT_URI` must exactly match the Authorized Redirect URI registered in the Google Cloud Console OAuth 2.0 Client ID.

---

## API Changes

### New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/auth/google/authorize` | JWT required | Returns Google authorization URL |
| GET | `/api/v1/auth/google/callback` | None (browser redirect) | Exchanges code, stores tokens, redirects to frontend |
| GET | `/api/v1/auth/google/status` | JWT required | Returns `{gmail: {connected, email}}` |
| DELETE | `/api/v1/auth/google/disconnect` | JWT required | Clears `users.oauth_tokens.google` |

### Supabase Schema Usage

No new tables or migrations. Uses two existing JSONB columns:
- `users.oauth_tokens` -- stores `{"google": {access_token, refresh_token, token_expiry, scopes}}`
- `users.settings` -- temporarily stores `{"google_oauth_state": "<csrf_token>"}` during OAuth flow (cleared after callback)
- `users.email` -- read by `/status` to surface the connected Gmail address

---

## Notes for Next Agent

The frontend counterpart (VOS-107 or similar) needs to:
1. Add a "Connect Gmail" button that calls `GET /auth/google/authorize` and redirects to `authorization_url`.
2. On the `/integrations` page, detect `?connected=gmail` query param on load and call `/auth/google/status` to refresh UI.
3. Add a "Disconnect" button that calls `DELETE /auth/google/disconnect`.

The `users.oauth_tokens` column must exist on the `users` table as a JSONB column. If it does not exist in the target environment, a migration is needed: `ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_tokens JSONB DEFAULT '{}'::jsonb;`

The email_service `_save_google_tokens` method overwrites the entire `oauth_tokens` JSONB. If other OAuth providers are added later (Outlook, etc.), this method should be updated to do a JSONB merge rather than a full overwrite.

---

## Evolution and Self-Healing (Rule 20)

No existing rules were amended. One pattern was identified and applied proactively:

**Pattern -- JSONB fetch-then-merge before update:** When writing a single key into a JSONB column in Supabase (Python client), always read the current value first, mutate in Python, then write the full dict back. Supabase's Python client does not support partial JSONB key updates natively without raw SQL. This pattern was applied consistently in all four endpoints and in `_save_google_tokens`.
