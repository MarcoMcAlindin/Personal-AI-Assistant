---
issue: VOS-110
agent: Mr. Blue
pr: https://github.com/MarcoMcAlindin/Personal-AI-Assistant/pull/116
branch: feature/blue/110-email-whitelist-autocomplete-push-tokens
date: 2026-03-22
status: PR open, awaiting merge to staging
---

# VOS-110 Handoff -- Email Whitelist Autocomplete + Push Token Registration

## What was shipped

### Web (`/web`)

**`web/src/services/emailService.ts`**
Added five new methods to the `emailService` object:
- `searchContacts(q)` -- GET `/email/contacts?q=<q>` with auth
- `getWhitelist()` -- GET `/email/whitelist` with auth
- `addToWhitelist(email_address, contact_name)` -- POST `/email/whitelist` with auth
- `removeFromWhitelist(id)` -- DELETE `/email/whitelist/:id` with auth
- `registerPushToken(token)` -- POST `/users/push-token` with auth

**`web/src/components/cyan/EmailView.tsx`**
- Added "Manage Whitelist" button (Shield icon) in the email header, toggles `showWhitelist` state
- When `showWhitelist` is true the grid shifts from `lg:grid-cols-3` to `xl:grid-cols-4`, injecting the whitelist panel as the 4th column
- Whitelist panel: debounced (300ms) contact search input, suggestion dropdown (dismissed on outside click or Escape), "Add to whitelist" button, scrollable chip list with X remove buttons
- Contact search min 2 chars, results from `GET /email/contacts?q=...`
- On suggestion click: `addEmail` and `addName` set, query field shows formatted `Name <email>`
- On add: POSTs, then refreshes whitelist list from backend
- Replaced hardcoded `✕` with Lucide `X` icon throughout for consistency
- No em dashes anywhere; OLED palette throughout

### Mobile (`/mobile`)

**`mobile/src/services/api.js`**
Added five new exported async functions matching the web service layer:
`searchContacts`, `getWhitelist`, `addToWhitelist`, `removeFromWhitelist`, `registerPushToken`

**`mobile/src/screens/EmailScreen.jsx`**
- Added Shield button in header row (top-right, next to MobileHeader)
- Shield tap opens a React Native `Modal` (transparent, animationType="slide") as a bottom sheet
- Bottom sheet contains: drag handle, search TextInput, FlatList of suggestions, LinearGradient Add button, ScrollView of whitelist chips with X remove buttons
- `KeyboardAvoidingView` wraps the sheet for iOS keyboard handling
- Debounce (300ms) on search input, min 2 chars before API call
- All styles use palette tokens; OLED-consistent `#0D0D12` sheet background

**`mobile/src/App.jsx`**
- Imported `expo-notifications` and `registerPushToken` from `./services/api`
- Added `Notifications.setNotificationHandler` at module level for foreground display
- Added `registerForPushNotifications()` helper: requests permission, gets Expo push token, POSTs to backend
- Called after session is confirmed (both existing session and fresh sign-in paths)
- Added `useRef(null)` for `navigationRef`, passed to `NavigationContainer ref=`
- Added `useEffect` on `Notifications.useLastNotificationResponse()` -- navigates to 'Email' tab when `data.email_id` is present in notification payload

**`mobile/package.json`**
Added `"expo-notifications": "~0.29.0"` to dependencies.

## Backend dependencies (Green agent)

The following backend endpoints must exist before this UI is functional:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/email/contacts?q=<query>` | Returns `{ contacts: [{name, email}] }` -- see google-contacts-autocomplete SKILL.md |
| GET | `/email/whitelist` | Returns `{ whitelist: [{id, email_address, contact_name}] }` |
| POST | `/email/whitelist` | Body: `{ email_address, contact_name }` -- adds entry |
| DELETE | `/email/whitelist/:id` | Removes whitelist entry by id |
| POST | `/users/push-token` | Body: `{ token }` -- stores Expo push token in `users.settings.push_tokens[]` |

## Post-merge action required

Run in `/mobile` before testing on device or simulator:
```bash
npx expo install expo-notifications
```

The package.json entry is in place; the native build step requires `expo install` to download compatible binaries.

## Known pre-existing issue

`npm run lint` in `/web` fails with "ESLint couldn't find an eslint.config.js" -- this is a pre-existing misconfiguration, not introduced by VOS-110. Mobile lint passes cleanly.

## Files changed

- `web/src/services/emailService.ts`
- `web/src/components/cyan/EmailView.tsx`
- `mobile/src/services/api.js`
- `mobile/src/screens/EmailScreen.jsx`
- `mobile/src/App.jsx`
- `mobile/package.json`

- Mr. Blue
