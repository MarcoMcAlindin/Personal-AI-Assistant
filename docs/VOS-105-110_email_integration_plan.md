# Email Integration & Notifications - Execution Plan
**Issues:** VOS-105 through VOS-110
**Planned:** 2026-03-22
**Planner:** Mr. Pink

---

## Feature Scope

This sprint delivers a fully functional email system:

| # | What | Details |
|---|------|---------|
| 1 | Real Google OAuth per user | Each user connects their own Gmail via OAuth 2.0 |
| 2 | Integrations page wired | Real connect/disconnect, show connected email |
| 3 | Contact autocomplete | People API - type name/email, get suggestions |
| 4 | Whitelist management UI | Full add/remove with autocomplete on web + mobile |
| 5 | Job company email filter | Emails from applied companies pass through automatically |
| 6 | Push notifications | All qualifying emails trigger phone notification |

---

## Execution Order (dependency-aware)

```
VOS-105 [White]  -- DB migration (push_tokens column)
       |
       v
VOS-106 [Green]  -- OAuth flow endpoints (authorize/callback/status/disconnect)
       |
       +-------> VOS-107 [Green]  -- Contacts API + company email filter
       |
       +-------> VOS-108 [Green]  -- Push notification service + email polling
                       |
                       v
              VOS-109 [Blue]  -- Integrations page OAuth UI  (depends on 106)
              VOS-110 [Blue]  -- Whitelist autocomplete + push registration (depends on 107, 108)
```

**Blue tasks (109 + 110) can run in parallel once Green tasks (106, 107, 108) are done.**

---

## Agent Assignments

| VOS | Agent | Domain | Issue |
|-----|-------|--------|-------|
| VOS-105 | Mr. White | `/supabase` | #109 |
| VOS-106 | Mr. Green | `/backend` | #110 |
| VOS-107 | Mr. Green | `/backend` | #111 |
| VOS-108 | Mr. Green | `/backend` | #112 |
| VOS-109 | Mr. Blue | `/web` + `/mobile` | #113 |
| VOS-110 | Mr. Blue | `/web` + `/mobile` | #114 |

---

## New Skills Created

| Skill | Purpose | Primary Agent |
|-------|---------|---------------|
| `google-oauth-per-user` | Per-user OAuth flow, token storage, auto-refresh | Green |
| `expo-push-notifications` | Expo Push API, mobile token registration | Blue + Green |
| `google-contacts-autocomplete` | People API, contact cache, autocomplete pattern | Green + Blue |

---

## Key Technical Decisions

### Google OAuth Tokens
- Stored in `users.oauth_tokens JSONB` under key `"google"` (column already exists)
- Structure: `{ access_token, refresh_token, token_expiry, scopes }`
- Auto-refresh on every API call if expired

### Push Notifications
- Expo Push Service (no Firebase needed)
- Tokens stored in `users.push_tokens JSONB` (new column via VOS-105 migration)
- Backend polls Gmail on `POST /email/poll` - called by mobile background fetch
- No new Python packages needed (uses existing `httpx`)

### Contact Autocomplete
- Cached in `users.settings.contacts_cache` JSONB (no schema change)
- Cache TTL: 24 hours
- Frontend debounce: 300ms

### Company Email Filter
- Source: `applications JOIN inbox_items ON inbox_item_id = inbox_items.id`
- Match: `company_name.lower() in sender_domain.lower()` (simple substring, no fuzzy)

---

## Environment Variables Added

```
GOOGLE_REDIRECT_URI=https://<backend>/api/v1/auth/google/callback
FRONTEND_URL=https://<frontend-domain>
EXPO_ACCESS_TOKEN=<optional>
```

---

## DoD Checklist (per VOS)

All tasks must satisfy Rule 10 (Definition of Done):
- [ ] Code runs locally (MOCK_GMAIL=true for backend tests)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] No Python linting errors
- [ ] Handoff letter written to `.agent/handoffs/`
- [ ] GitHub card moved to "Mr. Pink Audit"
- [ ] No em dashes in any new UI text (Rule 25)
- [ ] OLED theme enforced (Rule 20)

- Mr. Pink
