---
vos: VOS-109
agent: Mr. Blue
pr: https://github.com/MarcoMcAlindin/Personal-AI-Assistant/pull/115
branch: feature/blue/113-google-oauth-integrations-ui
date: 2026-03-22
status: shipped
---

# VOS-109 Handoff - Frontend: Google OAuth Connect Flow

## What was built

### Web (`/web`)

**`web/src/services/emailService.ts`**
Added three new methods to the existing `emailService` object:
- `getGoogleAuthUrl()` - GET `/auth/google/authorize`, returns `authorization_url` string
- `getGoogleStatus()` - GET `/auth/google/status`, returns `{ connected: boolean, email: string | null }`
- `disconnectGoogle()` - DELETE `/auth/google/disconnect`

All three use a `getAuthHeaders()` helper (added alongside them) that reads the Supabase session token and injects it as `Authorization: Bearer <token>`. Pattern matches `campaignService.ts`.

**`web/src/components/cyan/IntegrationsView.tsx`**
Full rewrite. Key behaviours:
- On mount: calls `getGoogleStatus()` to hydrate `gmailConnected` + `gmailEmail` state
- On mount: checks `?connected=gmail` URL param via `useSearchParams` - if present, shows success banner and re-fetches status. Banner auto-dismisses after 4 seconds via `setTimeout` cleanup.
- Connect button: calls `getGoogleAuthUrl()` then sets `window.location.href` to redirect to Google
- Disconnect button: calls `disconnectGoogle()` then resets state
- When connected: account email rendered in cyan below the card title
- Stats cards: reflect real connected count (0 or 1)
- Outlook, Google Drive, Dropbox removed
- Google Calendar: rendered as disabled Coming Soon card (opacity-60, button disabled)

### Mobile (`/mobile`)

**`mobile/src/services/api.js`**
Added three exported functions following the existing authenticated endpoint pattern:
- `getGoogleAuthUrl()`
- `getGoogleStatus()`
- `disconnectGoogle()`

**`mobile/src/screens/SettingsScreen.jsx`**
Added an "Integrations" section between the Application card and the Terminate Session button:
- Shows Gmail row in the existing `MobileCard` / `connItem` pattern
- Connect: calls `getGoogleAuthUrl()` then `WebBrowser.openBrowserAsync(url)`, then `refreshGmailStatus()` after browser closes
- Disconnect: calls `disconnectGoogle()` then resets local state
- When connected: renders account email in cyan below card name
- Buttons styled as compact badge-style (CONNECT / DISCONNECT) to match existing Settings UI language

## Backend dependency

This PR is frontend-only. The three endpoints it calls must be deployed by the backend agent:
- `GET /auth/google/authorize`
- `GET /auth/google/status`
- `DELETE /auth/google/disconnect`

See `.agent/skills/google-oauth-per-user/SKILL.md` for the backend implementation spec. Until those endpoints are live, the Connect button will fail gracefully (error logged to console, loading state reset).

## Redirect URI requirement

The backend `GET /auth/google/callback` must redirect to `{FRONTEND_URL}/integrations?connected=gmail` for the success banner to trigger. This is already specified in the SKILL.md.

## Files changed

| File | Change |
|------|--------|
| `web/src/services/emailService.ts` | Added auth helpers + 3 OAuth methods |
| `web/src/components/cyan/IntegrationsView.tsx` | Full rewrite - real OAuth, 2 cards only |
| `mobile/src/services/api.js` | Added 3 OAuth functions |
| `mobile/src/screens/SettingsScreen.jsx` | Added Gmail section in Integrations block |

## Verification

- `npm run build` in `/web` - passes (362 insertions, build time 4.1s)
- `npm run lint` in `/mobile` - clean (module type warning only, pre-existing)

- Mr. Blue
