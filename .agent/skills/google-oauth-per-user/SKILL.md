---
name: google-oauth-per-user
description: Implements per-user Google OAuth 2.0 flow in FastAPI with token storage in Supabase users.oauth_tokens JSONB.
agent: Green
---

# Skill: Google OAuth Per-User Flow

## Context
SuperCyan stores per-user Google tokens in `users.oauth_tokens JSONB`. The column already exists.
All packages are already installed: `google-auth-oauthlib==1.2.*`, `google-api-python-client==2.160.*`.

## Required Scopes
```python
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",      # Read + mark emails
    "https://www.googleapis.com/auth/gmail.send",        # Send email
    "https://www.googleapis.com/auth/contacts.readonly", # Contacts autocomplete
]
```

## Endpoints to Implement

### GET /auth/google/authorize
- Builds `google_auth_oauthlib.flow.Flow` with `redirect_uri` = backend callback URL
- Returns `{"authorization_url": "<google-url>", "state": "<csrf-token>"}`
- Store `state` in Supabase `users.settings.google_oauth_state` for CSRF check

### GET /auth/google/callback?code=...&state=...
- Validates `state` against stored value
- Exchanges `code` for tokens via `flow.fetch_token(code=code)`
- Writes tokens to `users.oauth_tokens`:
  ```json
  {
    "google": {
      "access_token": "...",
      "refresh_token": "...",
      "token_expiry": "ISO-8601-datetime",
      "scopes": ["..."]
    }
  }
  ```
- Redirects browser to `{FRONTEND_URL}/integrations?connected=gmail`

### GET /auth/google/status
- Returns `{"gmail": {"connected": bool, "email": str|null}}`
- Reads `users.oauth_tokens.google` - connected if `refresh_token` present

## Token Loading Pattern (used in email_service.py)
```python
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

async def get_user_gmail_credentials(self, user_id: str) -> Credentials:
    row = self.supabase.table("users") \
        .select("oauth_tokens") \
        .eq("id", user_id).single().execute()
    tokens = row.data.get("oauth_tokens", {}).get("google", {})
    if not tokens.get("refresh_token"):
        raise Exception("Google not connected for this user")

    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get("GMAIL_CLIENT_ID"),
        client_secret=os.environ.get("GMAIL_CLIENT_SECRET"),
        scopes=tokens.get("scopes"),
    )
    # Auto-refresh if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Persist refreshed token
        self._save_google_tokens(user_id, creds)
    return creds
```

## Environment Variables Required
```
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://<backend-domain>/api/v1/auth/google/callback
FRONTEND_URL=https://<frontend-domain>
```

## Frontend OAuth Redirect Pattern (React SPA)
```typescript
// In IntegrationsView.tsx - Gmail connect handler
const handleGmailConnect = async () => {
  const res = await fetch(`${API_BASE}/auth/google/authorize`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const { authorization_url } = await res.json();
  window.location.href = authorization_url; // Full redirect to Google
};

// On /integrations?connected=gmail page load, refresh status
useEffect(() => {
  if (searchParams.get('connected') === 'gmail') {
    fetchGoogleStatus(); // poll /auth/google/status
  }
}, []);
```

## Security Rules
- NEVER log or expose `access_token` or `refresh_token` in API responses
- Always validate `state` param in callback before token exchange (CSRF)
- Use `SUPABASE_SERVICE_ROLE_KEY` (not anon key) when writing to `users.oauth_tokens`
- The `redirect_uri` in the callback MUST exactly match the one registered in Google Cloud Console
