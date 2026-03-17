# HANDOFF: VOS-035 -- Mobile Email Screen UI Polish

## 1. Header Information
- **Date:** 2026-03-16
- **From:** Mr. Pink (Project Manager & Architectural Scout)
- **Recipient:** Mr. Blue (Frontend & Mobile Architect)
- **Task ID:** VOS-035
- **Branch:** `feature/blue/35-mobile-email-ui`

---

## 2. Summary

The Email screen skeleton exists at `mobile/src/screens/EmailScreen.jsx` with basic inbox fetching from `GET /api/v1/email/inbox`. It needs to be pixel-matched to the ground truth at `docs/assets/ui_ground_truth/mobile_email_v1.png`. The design uses star icons for priority, a flat list layout (no cards), and a Compose button.

---

## 3. Key Files to Modify

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `mobile/src/screens/EmailScreen.jsx` | Match email UI to ground truth |
| REFERENCE | `mobile/src/theme.ts` | Use palette colors exactly |
| REFERENCE | `mobile/src/services/api.js` | `fetchInbox()` and `sendEmail()` already implemented |

---

## 4. Strict Testing Instructions

### Visual Verification
1. Run `cd mobile && npx expo start --tunnel --clear`
2. Open on physical Android device via Expo Go
3. Navigate to Mail tab
4. Compare side-by-side with `docs/assets/ui_ground_truth/mobile_email_v1.png`
5. Verify: star icons (gold filled vs outline), sender/subject/preview layout, Compose button, whitelist subtitle

### Functional Verification
1. Pull-to-refresh should reload inbox from API
2. Compose button should be visible (functionality can be placeholder for now)
3. Star icons: gold filled (`#FFD700`) for unread, outline for read
4. Timestamps: "9:15 AM" for today, "Yesterday", "2 days ago" for older

### Android Padding
- Verify bottom content not obscured by Android system nav buttons

---

## 5. Environment Variable Changes
None.

---

## 6. API / Database Schema Changes
None. Uses existing `GET /api/v1/email/inbox` returning `{ emails: [...] }`.

**Response shape per email:**
```json
{
  "id": "string",
  "from": "string",
  "subject": "string",
  "body": "string",
  "timestamp": "ISO string",
  "is_read": boolean,
  "status": "whitelisted" | "pending"
}
```

---

## 7. Notes for Mr. Blue

- The mockup shows a **flat list** (no Card wrappers) -- rows separated by subtle 1px borders
- Star icon is the **first element** in each row, before sender name
- The header has a small mail icon before the "Whitelist active" subtitle text
- Compose button: teal bg, black text, right-aligned in header
- If the API returns no emails, show a centered empty state
- Use gold `#FFD700` for filled stars, `palette.textMuted` for outline stars
- Each row: star | sender+timestamp row | subject row | preview row (3 text lines per email)

---

## 8. Evolution & Self-Healing
- No rules amended. Standard UI polish task.
