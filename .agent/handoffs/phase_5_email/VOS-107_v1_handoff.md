# VOS-107 Handoff: Backend Contacts API + Job Company Email Filter

**Agent:** Mr. Green
**Commit:** 62af41c on `staging`
**Issue:** #111 (closed)
**Date:** 2026-03-22

---

## What Was Built

### 1. GET /email/contacts endpoint (`backend/app/api/v1/endpoints.py`)

New route under `# -- Email Contacts --` section:

```
GET /email/contacts?q=<query>
```

- Requires auth via `get_current_user`
- Delegates entirely to `email_service.get_contacts(user_id, q)`
- Returns `{"contacts": [{"name": str, "email": str}, ...]}`
- Empty `q` returns first 20 contacts (for initial dropdown populate on focus)
- Non-empty `q` returns up to 10 substring-matched contacts

### 2. New EmailService methods (`backend/app/services/email_service.py`)

**`get_contacts(user_id, query)`**
- Reads `users.settings.contacts_cache` for the user
- If cache is absent or older than 24 hours, calls `_refresh_contacts_cache()`
- Filters contacts by substring match on name or email

**`_refresh_contacts_cache(user_id, settings)`**
- Builds a People API v1 client using the user's existing Google OAuth credentials
- Calls `people().connections().list()` with `pageSize=1000`, `personFields="names,emailAddresses"`
- Flattens to `[{"name": str, "email": str}]`
- Writes result back to `users.settings.contacts_cache = {"items": [...], "fetched_at": float}`
- Returns the new cache dict; on failure returns `{"items": [], "fetched_at": 0}`

**`_get_applied_company_names(user_id)`**
- Queries `applications.select("inbox_items(company_name)").eq("user_id", user_id)`
- Returns deduplicated list of lowercase company name strings
- Returns `[]` silently on any error (non-fatal)

**`_matches_company(sender_email, company_names)`**
- Extracts domain from sender email via `split("@")[-1].lower()`
- Returns `True` if any company name is a substring of the domain
- Example: "google" in "mail.google.com" is True

### 3. fetch_inbox() extended

Previously: only whitelisted emails were returned.

Now: a second `elif` branch passes through emails from applied-company domains:

```python
if clean_sender in whitelist:
    filtered_emails.append({..., "source": "whitelist"})
elif self._matches_company(clean_sender, company_names):
    filtered_emails.append({..., "source": "job_filter"})
```

The `source` field is also added to the mock response for consistency.

---

## Scope Notes

- No new Python packages required (`google-api-python-client` already installed)
- `contacts.readonly` OAuth scope was already included in the combined Google OAuth flow (verified in `endpoints.py` line ~349)
- No database migrations required; `users.settings` is an existing JSONB column
- The `applications` -> `inbox_items` join uses the FK `inbox_item_id` on `applications`; Supabase PostgREST resolves this automatically via the foreign key relationship

---

## Follow-on Work (Blue's Responsibility)

- Wire up the `GET /email/contacts?q=` endpoint in the web whitelist UI
- Implement the debounced autocomplete input and suggestion dropdown
- Use the `source` field in the inbox email list to render a "Job Application" badge on `job_filter` emails

---

- Mr. Green
