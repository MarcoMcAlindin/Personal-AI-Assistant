---
name: VOS-106 Google OAuth per-user flow
description: Shipped per-user Google OAuth endpoints (authorize/callback/status/disconnect). Token storage migrated to users.oauth_tokens JSONB.
type: project
---

VOS-106 delivered four Google OAuth endpoints to backend on 2026-03-22.

**Why:** Legacy email_service read from users.settings.google_tokens (single shared token). Per-user OAuth flow needed to store individual tokens in users.oauth_tokens.google.

**How to apply:** Any future OAuth provider (Outlook, etc.) should follow same pattern -- store tokens in users.oauth_tokens.<provider>, use service role key client (email_service.supabase), apply JSONB fetch-then-merge before writing.

Key files changed:
- backend/app/utils/config.py -- google_redirect_uri, frontend_url added to Settings
- backend/app/services/email_service.py -- get_user_gmail_credentials() now reads oauth_tokens.google; _save_google_tokens() added
- backend/app/api/v1/endpoints.py -- _build_google_flow(), /auth/google/{authorize,callback,status,disconnect}
- .env.example -- GOOGLE_REDIRECT_URI, FRONTEND_URL added

Gotcha: _save_google_tokens() overwrites entire oauth_tokens JSONB. If a second provider is added, switch to a JSONB merge (fetch row, update key in Python, write full dict back -- Supabase Python client has no native partial JSONB update).

Commit: 58bb6be on staging. GitHub issue #110 closed.
