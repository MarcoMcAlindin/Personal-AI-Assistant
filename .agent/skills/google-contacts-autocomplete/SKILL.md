---
name: google-contacts-autocomplete
description: Fetches Google contacts via People API and caches them for autocomplete in the whitelist UI. No extra packages needed.
agent: Green, Blue
---

# Skill: Google Contacts Autocomplete

## Architecture
- Backend: `GET /email/contacts?q=<query>` fetches and caches contacts in `users.settings.contacts_cache`
- Frontend: Debounced input calls this endpoint and renders suggestion dropdown
- Cache refreshed on demand (not every call) to avoid People API rate limits

## Backend (Green - FastAPI)

### Endpoint: GET /email/contacts?q=query
```python
from googleapiclient.discovery import build

@router.get("/email/contacts")
async def search_contacts(
    q: str = Query("", min_length=0),
    user_id: str = Depends(get_current_user),
):
    """
    Return up to 10 contacts matching the query string.
    Uses cached contact list in users.settings.contacts_cache.
    Refreshes cache if empty or older than 24 hours.
    """
    contacts = await email_service.get_contacts(user_id, q)
    return {"contacts": contacts}
```

### Service Method: get_contacts()
```python
import time

async def get_contacts(self, user_id: str, query: str) -> list[dict]:
    # Load cache from settings
    row = self.supabase.table("users") \
        .select("settings") \
        .eq("id", user_id).single().execute()
    settings = row.data.get("settings", {})
    cache = settings.get("contacts_cache", {})
    cached_at = cache.get("fetched_at", 0)

    # Refresh if cache is older than 24 hours or empty
    if not cache.get("items") or (time.time() - cached_at) > 86400:
        cache = await self._refresh_contacts_cache(user_id, settings)

    contacts = cache.get("items", [])
    if not query:
        return contacts[:20]

    # Client-side substring filter
    q_lower = query.lower()
    return [
        c for c in contacts
        if q_lower in c.get("name", "").lower()
        or q_lower in c.get("email", "").lower()
    ][:10]

async def _refresh_contacts_cache(self, user_id: str, settings: dict) -> dict:
    try:
        creds = await self.get_user_gmail_credentials(user_id)
        service = build("people", "v1", credentials=creds)
        results = service.people().connections().list(
            resourceName="people/me",
            pageSize=1000,
            personFields="names,emailAddresses",
        ).execute()

        items = []
        for person in results.get("connections", []):
            names = person.get("names", [])
            emails = person.get("emailAddresses", [])
            if emails:
                name = names[0].get("displayName", "") if names else ""
                for e in emails:
                    items.append({
                        "name": name,
                        "email": e.get("value", ""),
                    })

        new_cache = {"items": items, "fetched_at": time.time()}
        self.supabase.table("users") \
            .update({"settings": {**settings, "contacts_cache": new_cache}}) \
            .eq("id", user_id).execute()
        return new_cache
    except Exception as e:
        print(f"[ContactsCache] Refresh failed: {e}")
        return {"items": [], "fetched_at": 0}
```

## Frontend Autocomplete Pattern (Blue - React / React Native)

### Web (TypeScript)
```typescript
// Debounced contact search hook
import { useState, useEffect } from 'react';

export function useContactSearch(query: string) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`${API_BASE}/email/contacts?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { contacts } = await res.json();
      setSuggestions(contacts);
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [query]);

  return suggestions;
}
```

### Suggestion Dropdown (renders below input)
- Show: contact name (bold) + email address (muted)
- On click: populate whitelist `email_address` field with selected email, `contact_name` with name
- Dismiss on blur or Escape key
- Style consistent with OLED theme: `bg-[#1A1A1A]`, `border-[#00FFFF]/20`, `text-[#DAE2FD]`

## Scope Required
Ensure the Google OAuth flow (see `google-oauth-per-user` skill) includes:
```python
"https://www.googleapis.com/auth/contacts.readonly"
```

## Notes
- People API is quota-limited (15 requests/min per user) - caching is essential
- `contacts.readonly` scope requires OAuth consent; it is included in the combined flow
- Empty query returns first 20 contacts (useful for initial dropdown populate on focus)
