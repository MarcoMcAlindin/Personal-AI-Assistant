# Email Feature Sprint — Phase 5 Completion Doc

**Sprint dates:** 2026-03-22 → 2026-03-23
**Branch:** `feature/blue/110-email-whitelist-autocomplete-push-tokens`
**Issues closed:** VOS-105, VOS-106, VOS-107, VOS-108, VOS-109, VOS-110
**Agents:** White (DB), Green (backend x3), Blue (frontend x2), Pink (orchestration)

---

## What Was Built

### 1. Google OAuth Per-User Integration (VOS-106)
- `/auth/google/authorize` → generates OAuth URL with CSRF state + user_id
- `/auth/google/callback` → exchanges code, stores tokens in `users.oauth_tokens.google` JSONB
- `/auth/google/status` → checks connection state and returns connected email
- `/auth/google/disconnect` → wipes `oauth_tokens.google` from Supabase
- Tokens auto-refresh on expiry via `google.auth.transport.requests.Request()`
- `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` baked into `backend/deploy.sh` overrides

### 2. Gmail Inbox with Whitelist + Job Filter (VOS-107)
- `fetch_inbox()` builds `in:inbox (from:a OR from:b)` Gmail query targeting whitelisted senders directly (`maxResults=50`)
- Case-insensitive sender matching (Gmail returns mixed-case addresses)
- Company domain filter: emails from domains matching any applied job company pass through with `source: "job_filter"`
- `Job Match` badge rendered on matching emails in the list panel

### 3. Google Contacts Autocomplete (VOS-107)
- `/email/contacts?q=` endpoint searches cached contacts
- 24-hour cache in `users.settings.contacts_cache` with stale detection (refresh if fewer than 10 items)
- Fetches both saved contacts (People API `connections()`) and other contacts (Gmail history `otherContacts()`)
- Debounced 300ms contact search in the whitelist drawer and compose window To field

### 4. Full Email Body Rendering (VOS-110 / email UI)
- `GET /email/{message_id}` fetches full MIME structure
- HTML emails rendered via `dangerouslySetInnerHTML` in a white-background iframe-like div
- Inline images: `cid:` references in HTML replaced with base64 data URIs fetched from Gmail attachments API
- Attachments listed in a separate section with filename + MIME type pill

### 5. Push Notification Infrastructure (VOS-105, VOS-108)
- `push_tokens JSONB DEFAULT '[]'` column added to `public.users` (migration `20260322000006_add_push_tokens.sql`)
- `POST /users/push-token` / `DELETE /users/push-token` endpoints
- `NotificationService.send_push_notification()` batches to Expo Push API via httpx
- Frontend registers Expo push token on mount in `EmailView`

### 6. Integrations Page — Real OAuth UI (VOS-109)
- `IntegrationsView.tsx` rewritten: real Gmail connect/disconnect flow
- Shows connected email address on card when linked
- `?connected=gmail` URL param triggers 4-second auto-dismiss success banner
- Google Calendar shown as "Coming Soon"

### 7. Gmail-Like Email UI (email UI sprint)
- Fixed-height two-panel layout: 35% list / 65% content, both independently scrollable
- Email list: avatar initials with colour hash, unread dot (left of avatar), sender/subject/snippet/relative date, Job Match badge
- Content pane: full sender block, subject, Reply/Forward buttons, HTML body, attachments
- Whitelist drawer: slide-in from right with contact search + approved senders list
- Compose: fixed bottom-right overlay window (680×86vh), Gmail-style compact To/Subject rows, body textarea, contacts autocomplete on To field

### 8. Qwen Compose Assist
- "Write with Qwen" toggle in compose toolbar opens inline Qwen panel
- Tone picker: Professional / Casual / Formal
- vLLM status indicator: green/amber/red dot + label (online / warming up / offline)
- Generate button only enabled when `vllmStatus === 'online'`
- "Wake up model" amber button when status is warming/offline — fires `/vllm/warmup`, polls every 5s for up to 60s
- Error banner with `AlertCircle` on generation failure

---

## Bugs Fixed During Sprint

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Inbox always empty | Case-sensitive email comparison; only 20 msgs fetched with generic query | `.lower()` normalisation + direct `from:email` Gmail query |
| Contacts suggestions empty | People API disabled in GCP; cache built with 3 items | User enabled API; stale cache threshold (refresh if <10 items) |
| `/email/contacts` returning email body | `GET /email/{message_id}` wildcard registered before `/email/contacts` | Moved parameterised route after all specific routes |
| Qwen generate pastes prompt | Backend returned `{"rewritten": request.body}` on failure; frontend used `data.rewritten ?? body` | Backend returns `null` on failure; frontend throws if falsy |
| Unread dot wrong side | Was `absolute right-3` | Changed to flex sibling left of avatar with `pl-3` padding |
| Names wrapped in `""` | `parseSenderName` didn't strip surrounding quotes | `.replace(/^["']|["']$/g, '')` in both `parseSenderName` and `getInitials` |
| Whitelist add not refreshing inbox | `getWhitelist()` and `fetchEmails()` ran in parallel; inbox refetched before whitelist saved | Changed to sequential: add → getWhitelist → fetchEmails |
| Chat 500 error | `_gcp_auth_headers` raised `RuntimeError` when GCP token fetch failed | Changed to return `{}` on failure |
| Chat/email rewrite 500 | `fetch_id_token` uses `GOOGLE_APPLICATION_CREDENTIALS` file, not metadata server | Replaced with direct GCP metadata server call (`metadata.google.internal`) |
| Wrong vLLM URL | `QWEN_ENDPOINT_URL` pointed to `supercyan-qwen` (doesn't exist) | Updated to `vibeos-qwen-enffsru5pa-ew.a.run.app` |
| vLLM 403 on backend calls | Backend service account not granted `run.invoker` on `vibeos-qwen` | `gcloud run services add-iam-policy-binding vibeos-qwen --role=roles/run.invoker` |
| aiService no auth headers | `aiService.ts` sent `user_id: 'ceo_test'` in body, no JWT | Added `getAuthHeaders()` using Supabase session, same pattern as all other services |

---

## Architecture Notes

### GCP Cloud Run Auth (important for future work)
`google.oauth2.id_token.fetch_id_token()` does **not** work in Cloud Run — it falls back to `GOOGLE_APPLICATION_CREDENTIALS` file lookup which isn't set. Use the metadata server directly:

```python
import urllib.request as _req
meta_url = f"http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience={audience}"
r = _req.Request(meta_url, headers={"Metadata-Flavor": "Google"})
token = _req.urlopen(r, timeout=3).read().decode()
```

### vLLM Scale-to-Zero Behaviour
- Service: `vibeos-qwen` (not `supercyan-qwen`)
- URL: `https://vibeos-qwen-enffsru5pa-ew.a.run.app/v1`
- Cold start: ~2-3 minutes to load 30B GGUF model
- Status: `warming` when `/v1/models` returns 404 or times out
- Wake-up: `POST /vllm/warmup` then poll `/vllm/status` every 5s

### Route Ordering in FastAPI
Specific routes must be registered **before** parameterised routes sharing the same prefix:
```python
# CORRECT — contacts registered before {message_id}
GET /email/contacts
GET /email/{message_id}
```

---

## Files Changed

### Backend
- `backend/app/api/v1/endpoints.py` — OAuth routes, contacts route, email body route, rewrite fix, GCP header helper
- `backend/app/services/email_service.py` — full rewrite: Gmail fetch, contacts cache, body parsing, token management
- `backend/app/services/ai_service.py` — `_gcp_auth_headers` metadata server fix
- `backend/app/services/notification_service.py` — new: Expo push notification service
- `backend/app/utils/config.py` — `google_redirect_uri`, `frontend_url` settings
- `backend/deploy.sh` — `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `QWEN_ENDPOINT_URL` overrides

### Frontend (Web)
- `web/src/services/emailService.ts` — full rewrite: auth headers, all new endpoints
- `web/src/services/aiService.ts` — Supabase JWT auth headers, 503 warming error handling
- `web/src/components/cyan/EmailView.tsx` — full rewrite: two-panel layout, Qwen compose, whitelist drawer
- `web/src/components/cyan/IntegrationsView.tsx` — real OAuth flow

### Database
- `supabase/migrations/20260322000006_add_push_tokens.sql` — push_tokens JSONB column + GIN index

### Docs & Handoffs
- `.agent/skills/google-oauth-per-user/SKILL.md`
- `.agent/skills/expo-push-notifications/SKILL.md`
- `.agent/skills/google-contacts-autocomplete/SKILL.md`
- `.agent/handoffs/phase_5_email/VOS-105_v1_handoff.md`
- `.agent/handoffs/phase_5_email/VOS-106_v1_handoff.md`
- `.agent/handoffs/phase_5_email/VOS-107_v1_handoff.md`
- `.agent/handoffs/phase_5_email/VOS-110_v1_handoff.md`
- `.agent/handoffs/phase_5_email/VOS-email-ui-v1_handoff.md`
