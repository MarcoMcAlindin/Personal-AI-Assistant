# HANDOFF: VOS-034 -- Mobile Chat Screen UI Polish

## 1. Header Information
- **Date:** 2026-03-16
- **From:** Mr. Pink (Project Manager & Architectural Scout)
- **Recipient:** Mr. Blue (Frontend & Mobile Architect)
- **Task ID:** VOS-034
- **Branch:** `feature/blue/34-mobile-chat-ui`

---

## 2. Summary

The Chat screen skeleton has been built at `mobile/src/screens/ChatScreen.jsx` with basic functionality (send/receive messages via `/api/v1/chat`). It needs to be pixel-matched to the ground truth design at `docs/assets/ui_ground_truth/mobile_chat_v1.png`. The backend chat endpoint is live and returning responses.

---

## 3. Key Files to Modify

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `mobile/src/screens/ChatScreen.jsx` | Match chat UI to ground truth |
| MODIFY | `mobile/src/navigation/TabNavigator.jsx` | Ensure tab bar matches mockup (5 tabs: Plan, Feeds, AI, Mail, Health) |
| MODIFY | `mobile/src/App.jsx` | Add footer text "SuperCyan Mobile -- React Native (Expo)" if needed |
| REFERENCE | `mobile/src/theme.ts` | Use palette colors exactly |
| REFERENCE | `mobile/src/components/Themed.tsx` | Reuse Text/View/Card components |

---

## 4. Strict Testing Instructions

### Visual Verification
1. Run `cd mobile && npx expo start --tunnel --clear`
2. Open on physical Android device via Expo Go
3. Compare Chat screen side-by-side with `docs/assets/ui_ground_truth/mobile_chat_v1.png`
4. Verify: header branding, avatar colors, bubble shapes, timestamps, input bar, tab bar

### Functional Verification
1. Type a message and send -- user bubble should appear right-aligned with "M" avatar
2. AI response should appear left-aligned with purple sparkle avatar
3. Timestamps should appear between messages
4. Send button should be teal when text is present, muted when empty

### Android Padding
- Verify bottom content is not obscured by Android system navigation buttons

---

## 5. Environment Variable Changes
None. Existing `.env` with `CLOUD_GATEWAY_URL` is sufficient.

---

## 6. API / Database Schema Changes
None. Uses existing `POST /api/v1/chat` endpoint.

---

## 7. Notes for Mr. Blue

- The ground truth shows a **footer line** below the tab bar: "SuperCyan Mobile -- React Native (Expo)" -- add this
- User avatar is a teal circle with "M" initial, AI avatar is purple circle with sparkle
- The chat header has two small icon buttons (save + link) -- these are decorative for now
- Use `SafeAreaView` edges carefully -- `['top']` only, with manual bottom padding for Android
- The backend returns `{ response: "..." }` from the chat endpoint -- the current code handles this correctly
- Theme colors are in `mobile/src/theme.ts` -- use `palette.accentPrimary` (#00D4FF) for teal, `palette.accentSecondary` (#7b5ea7) for purple

---

## 8. Evolution & Self-Healing
- No rules amended. This is a new UI polish phase task following established patterns from the ground truth design system.
