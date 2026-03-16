# HANDOFF: VOS-036 -- Mobile Health Hub Screen UI Polish

## 1. Header Information
- **Date:** 2026-03-16
- **From:** Mr. Pink (Project Manager & Architectural Scout)
- **Recipient:** Mr. Blue (Frontend & Mobile Architect)
- **Task ID:** VOS-036
- **Branch:** `feature/blue/36-mobile-health-ui`

---

## 2. Summary

The Health screen skeleton exists at `mobile/src/screens/HealthScreen.jsx` with basic health data fetching from `GET /api/v1/health`. It needs to be pixel-matched to the ground truth at `docs/assets/ui_ground_truth/mobile_health_v1.png`. The design features an AI Morning Analysis card, 2x2 metric grid with delta indicators, and a water intake tracker.

---

## 3. Key Files to Modify

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `mobile/src/screens/HealthScreen.jsx` | Match health UI to ground truth |
| REFERENCE | `mobile/src/theme.ts` | Use palette colors exactly |
| REFERENCE | `mobile/src/services/api.js` | `fetchHealth()` already implemented |

---

## 4. Strict Testing Instructions

### Visual Verification
1. Run `cd mobile && npx expo start --tunnel --clear`
2. Open on physical Android device via Expo Go
3. Navigate to Health tab
4. Compare side-by-side with `docs/assets/ui_ground_truth/mobile_health_v1.png`
5. Verify: header with heart icon, AI Analysis card with left border, 2x2 metric grid, water tracker

### Key Visual Checks
- AI Analysis card has a **3px left cyan border** (not full border)
- Metric cards are arranged in a **2x2 grid** (Sleep + Avg HR top row, Deep Sleep + REM bottom row)
- Each metric card shows: label (top, muted), value (large, bold), delta (small, cyan for positive)
- Water intake: progress bar with -/+ circular buttons and "250ml per tap" label
- Heart icon in header has a **cyan circle border** around it

### Functional Verification
1. Pull-to-refresh should reload health data
2. Water +/- buttons should update the progress bar locally
3. If no health data, show empty state

### Android Padding
- Verify bottom content not obscured by Android system nav buttons

---

## 5. Environment Variable Changes
None.

---

## 6. API / Database Schema Changes
None. Uses existing `GET /api/v1/health` endpoint.

**Response shape:**
```json
{
  "date": "YYYY-MM-DD",
  "avg_heart_rate": number,
  "sleep_duration": number (hours, e.g. 7.38),
  "water_liters": number,
  "ai_analysis": "string"
}
```

---

## 7. Notes for Mr. Blue

- The mockup shows **4 metric cards** but the API only returns `avg_heart_rate`, `sleep_duration`, and `water_liters`. For Deep Sleep and REM, use placeholder values or derive from `raw_watch_data` if available. If neither is available, display "--" with no delta.
- Water intake tracker is **local state** -- the +/- buttons update a local counter. A future API call could persist this.
- The AI Analysis card is the most prominent element -- it should be a full-width card positioned directly below the header
- Delta values: use cyan (`accentPrimary`) for positive deltas, display as "+18m", "+12%", "-2" etc.
- Heart icon in header: inside a 40px circle with 1px `accentPrimary` border

---

## 8. Evolution & Self-Healing
- No rules amended. Standard UI polish task.
