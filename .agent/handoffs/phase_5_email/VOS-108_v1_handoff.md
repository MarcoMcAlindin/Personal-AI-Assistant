---
ticket: VOS-108
agent: Mr. Green
phase: phase_5_email
status: Done
commit: 122188b (staging)
date: 2026-03-22
---

# VOS-108 Handoff -- Push Notification Service + Email Polling

## What Was Built

Two new files touched, one new file created:

### New: `backend/app/services/notification_service.py`
- `NotificationService` class with a single async method `send_push_notification(tokens, title, body, data)`
- POSTs a batch of Expo-format messages to `https://exp.host/--/api/v2/push/send`
- Uses `httpx.AsyncClient(timeout=15.0)`
- Errors are caught, logged, and swallowed -- push delivery is best-effort per Expo docs

### Modified: `backend/app/api/v1/endpoints.py`
Three new routes under `# -- Push Notifications --` section at the bottom:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/push-token` | Append Expo push token to `users.push_tokens` JSONB array (idempotent) |
| DELETE | `/users/push-token` | Remove a specific token from `users.push_tokens` |
| POST | `/email/poll` | Gmail inbox diff + push notification dispatch |

Also added:
- Import of `NotificationService`
- `notification_service = NotificationService()` singleton at top of file
- `PushTokenRequest(BaseModel)` with a single `token: str` field

## Data Storage Notes

`push_tokens` is a **top-level JSONB column** on the `users` table, not nested inside `settings`. This was added by migration `20260322000006_add_push_tokens.sql`. The skill.md incorrectly suggests `users.settings.push_tokens` -- the actual schema uses a dedicated column.

`last_email_id` is stored inside `users.settings` JSONB (string, the Gmail message ID).

## Email Poll Logic

Gmail returns emails newest-first. The algorithm:
1. Fetch all inbox emails via `email_service.fetch_inbox(user_id)`
2. Build list of IDs in order
3. If `last_email_id` is found in the list, everything before its index is "new"
4. If not found (first poll, or message has aged out of the 20-result window), treat all as new
5. Fire one push notification per new email
6. Update `users.settings.last_email_id` to `emails[0]["id"]` (newest this batch)

## Supabase Access Pattern

All Supabase reads/writes in the push token endpoints reuse `email_service.supabase` (the service-role client already initialised in `EmailService.__init__`). No new client or abstraction layer was added.

## What the Mobile Side Needs (Blue)

Per `SKILL.md`:
- Install `expo-notifications`
- Call `registerForPushNotifications()` on app start, POST token to `/users/push-token`
- Set up a periodic background fetch or foreground timer calling `POST /email/poll`
- Handle notification tap to navigate to the Email tab with `emailId` from `data`

## Integration Points to Watch

- If a user reinstalls the app their Expo token changes. The register endpoint appends (never overwrites) so old dead tokens can accumulate. A periodic cleanup (e.g., remove tokens that Expo reports as invalid) is out of scope for this ticket.
- `/email/poll` only sends one notification per email even if the user has multiple devices, because we iterate over `new_emails` and pass the full `push_tokens` list to a single `send_push_notification()` call per email. The Expo batch API handles multi-device fan-out.
- `MOCK_GMAIL=true` env var will cause `fetch_inbox` to return a single mock message; polling still works in dev.

## Files Changed

- `/backend/app/services/notification_service.py` (new)
- `/backend/app/api/v1/endpoints.py` (modified)

- Mr. Green
