# HANDOFF: VOS-038 -- Mobile Feeds/Concerts Screen UI Polish

## 1. Header Information
- **Date:** 2026-03-16
- **From:** Mr. Pink (Project Manager & Architectural Scout)
- **Recipient:** Mr. Blue (Frontend & Mobile Architect)
- **Task ID:** VOS-038
- **Branch:** `feature/blue/38-mobile-feeds-ui`

---

## 2. Summary

The Feeds screen skeleton exists at `mobile/src/screens/FeedsScreen.jsx` with tech/concerts fetching from `/api/v1/feeds/tech` and `/api/v1/feeds/concerts`. It needs to be pixel-matched to the ground truth design, particularly the concerts layout from `docs/assets/ui_ground_truth/concerts_v1.png` (adapted for mobile).

---

## 3. Key Files to Modify

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `mobile/src/screens/FeedsScreen.jsx` | Match feeds UI to ground truth |
| REFERENCE | `mobile/src/theme.ts` | Use palette colors exactly |
| REFERENCE | `mobile/src/services/api.js` | `fetchTechFeeds()`, `fetchConcerts()` already implemented |

---

## 4. Strict Testing Instructions

### Visual Verification
1. Run `cd mobile && npx expo start --tunnel --clear`
2. Open on physical Android device via Expo Go
3. Navigate to Feeds tab
4. Compare concerts tab side-by-side with `docs/assets/ui_ground_truth/concerts_v1.png`
5. Verify: tab switcher, concert rows with genre badges, prices, ticket buttons

### Key Visual Checks
- Tab switcher: "Tech Feed" and "Concerts" buttons, active = teal bg + black text
- Concerts subtitle: "Scotland Concerts . Metal . Rock . Hard Rock" (muted)
- Each concert row:
  - Artist name (16px, bold, white)
  - Pin icon + venue, city (13px, muted)
  - Calendar icon + date (12px, muted) + genre badge (purple pill, white text, 10px)
  - Price right-aligned (cyan, bold, 16px) -- e.g. "45", "38"
  - "Tickets" button (purple pill, right-aligned below price)
- Tech feed: flat list, title + source (cyan) + timestamp (muted) per row
- Rows separated by 1px borders, no card wrappers

### Functional Verification
1. Switch between Tech Feed and Concerts tabs
2. Pull-to-refresh should reload both feeds
3. Tapping a tech article should open its URL
4. Tapping "Tickets" button should open the ticket URL
5. Genre badges display correctly with purple background

### Android Padding
- Verify bottom content not obscured by Android system nav buttons

---

## 5. Environment Variable Changes
None.

---

## 6. API / Database Schema Changes
None. Uses existing endpoints.

**Tech article shape:**
```json
{
  "title": "string",
  "url": "string",
  "source": "string",
  "published_at": "string",
  "time": "string (e.g. '2h ago')"
}
```

**Concert shape:**
```json
{
  "artist": "string",
  "venue": "string",
  "city": "string",
  "date": "string",
  "genre": "string | null",
  "price": "string | null (e.g. '45')",
  "ticket_url": "string"
}
```

---

## 7. Notes for Mr. Blue

- The web mockup shows prices with a pound sign (e.g. "45") -- if `price` field is available from the API, display it. If not, omit the price column
- Genre badge colors: use `palette.accentSecondary` (#7b5ea7) for all genre badges
- The "Tickets" button is also purple (`accentSecondary`) -- same as genre badges
- Concert list should feel like a proper event listing, not generic cards
- If the API returns no concerts/articles, show "No feeds available" centered empty state
- Adapt the web layout (which has a sidebar) to single-column mobile layout

---

## 8. Evolution & Self-Healing
- No rules amended. Standard UI polish task.
