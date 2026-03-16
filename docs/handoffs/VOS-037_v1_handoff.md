# HANDOFF: VOS-037 -- Mobile Planner Screen UI Polish

## 1. Header Information
- **Date:** 2026-03-16
- **From:** Mr. Pink (Project Manager & Architectural Scout)
- **Recipient:** Mr. Blue (Frontend & Mobile Architect)
- **Task ID:** VOS-037
- **Branch:** `feature/blue/37-mobile-planner-ui`

---

## 2. Summary

The Planner screen skeleton exists at `mobile/src/screens/PlannerScreen.jsx` with task CRUD via the `/api/v1/tasks` endpoints. It needs to be pixel-matched to the ground truth at `docs/assets/ui_ground_truth/mobile_planner_v1.png`. The design uses a flat task list with checkboxes, strikethrough for completed items, time/duration metadata, and a progress bar.

---

## 3. Key Files to Modify

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `mobile/src/screens/PlannerScreen.jsx` | Match planner UI to ground truth |
| REFERENCE | `mobile/src/theme.ts` | Use palette colors exactly |
| REFERENCE | `mobile/src/services/api.js` | `fetchTasks()`, `createTask()`, `updateTask()` already implemented |

---

## 4. Strict Testing Instructions

### Visual Verification
1. Run `cd mobile && npx expo start --tunnel --clear`
2. Open on physical Android device via Expo Go
3. Navigate to Plan tab (first tab)
4. Compare side-by-side with `docs/assets/ui_ground_truth/mobile_planner_v1.png`
5. Verify: header with date + auto-archive notice, Add Task button, progress bar, task list

### Key Visual Checks
- Header: calendar icon in rounded square (cyan border), title + date subtitle, "Add Task" button (teal)
- Header also has **list/grid toggle icons** and a **trash icon** between the subtitle and Add Task button
- Progress bar: "Progress" label left, "2/5 complete" right, cyan fill bar below
- Task rows: circle checkbox (22px), title, optional description (muted), time + duration row
- Completed tasks: filled cyan checkbox with checkmark, ~~strikethrough~~ title in muted color
- Flat list style (no cards), 1px border separators
- Time format: clock icon + "9:00 AM", duration: "45 min" or "1 hr" or "2 hr"

### Functional Verification
1. Tap checkbox to toggle task status (pending/completed)
2. Completed tasks should show strikethrough and muted color
3. Progress bar should update when tasks are toggled
4. "Add Task" button should reveal input field
5. Pull-to-refresh should reload tasks from API

### Android Padding
- Verify bottom content not obscured by Android system nav buttons

---

## 5. Environment Variable Changes
None.

---

## 6. API / Database Schema Changes
None. Uses existing endpoints.

**Task shape:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string | null",
  "time": "HH:MM | null",
  "duration": number | null (minutes),
  "status": "pending" | "completed" | "archived",
  "is_archived": boolean,
  "date": "YYYY-MM-DD"
}
```

---

## 7. Notes for Mr. Blue

- The mockup shows **list/grid toggle icons** and a **trash icon** in the header row -- these can be decorative/placeholder for now but must be visually present
- Time is stored as "HH:MM" (24h) in the database but should display as "9:00 AM" (12h) in the UI
- Duration is stored in minutes -- display as "45 min", "1 hr", "2 hr" etc.
- Description text appears below the title in smaller muted text -- only show if present
- The date in the subtitle should be dynamic (today's date), formatted as "Monday, March 16"
- Checkbox: 22px circle, 2px border, `textMuted` when pending, filled `accentPrimary` with white checkmark when completed

---

## 8. Evolution & Self-Healing
- No rules amended. Standard UI polish task.
