# Dashboard & Nav Restructure — Design Spec

## Goal

Restructure the SuperCyan web app navigation: rename "Todo List" → "Tasks", move the full task manager to `/tasks`, and introduce a new Dashboard at `/` showing rich visual summary cards for all 6 feature areas (Tasks, Email, Health, News, Money, Jobs).

## Architecture

### Route changes (`web/src/App.tsx`)
| Before | After |
|--------|-------|
| `/` → `<TaskDashboard />` | `/` → `<DashboardView />` |
| `/todolist` → `<TodoListView />` | `/tasks` → `<TaskDashboard />` |
| — | `/todolist` → `<Navigate to="/tasks" replace />` |

`TodoListView.tsx` is not deleted — only its route is redirected.

### Nav changes (`web/src/components/cyan/Sidebar.tsx`)
- "Dashboard" at `/` — unchanged (icon: `LayoutDashboard`)
- "Todo List" at `/todolist` → renamed **"Tasks"** at `/tasks` (icon: `CheckSquare`, unchanged)

### New component: `web/src/components/cyan/DashboardView.tsx`
Single file, no sub-components. Fetches from existing services on mount. 2×3 card grid. Uses inline style with GlassCard pattern (not the `<GlassCard>` wrapper component, to keep all card-specific border colours self-contained).

---

## Card Specs

All cards share: `background: rgba(26,26,26,0.8)`, `backdrop-filter: blur(24px)`, `border-radius: 16px`, `padding: 18px`. Border and glow colour varies per card.

### Tasks — border `rgba(0,255,255,0.2)`, glow `rgba(0,255,255,0.05)`
**Data:** Both `taskService.getTasksForToday()` and `taskService.getOverdueTasks()` are called in parallel as two entries in the top-level `Promise.allSettled` array. Results are merged in the component — overdue tasks may overlap with today's tasks; dedup by `id` if needed.
- SVG progress ring (cyan gradient): `done / total` as percentage
- Urgency bars: count of HIGH / MED / LOW tasks as horizontal bars with red/amber/blue fills
- Overdue badge (amber) if overdue count > 0
- Pills: "X today", "X done"

### Email — border `rgba(0,153,204,0.2)`, glow `rgba(0,153,204,0.05)`
**Data:** `emailService.fetchInbox()` → `Email[]` where unread = `email.is_read === false` (treat `undefined` as read)
- Unread count as large cyan number
- Stacked bar: unread (cyan) vs read (dark) ratio with "X% unread of N" label
- Latest email subject (`email.subject`) as truncated preview row; sort by `email.timestamp` or `email.date` descending

### Health — border `rgba(76,175,80,0.2)`, glow `rgba(76,175,80,0.05)`
**Data:** `healthService.getLatestMetrics()` → `{ sleep_duration, avg_heart_rate, ai_analysis, raw_watch_data }`
- Steps from `raw_watch_data.step_count` (fallback `0`) as large green number with "goal 10k" label
- Heart rate ring (red, `avg_heart_rate / 180`) + steps goal ring (green, `steps / 10000`)
- 7-day step sparkline bar chart (7 bars from `raw_watch_data.weekly_steps[]` or static opacity gradient if unavailable)
- Divider line
- Sleep: `sleep_duration` formatted as `Xh Xm`, progress bar vs 8h goal
- AI analysis block: cyan "AI ANALYSIS" label + `ai_analysis` text truncated to 2 lines

### News — border `rgba(217,119,6,0.2)`, glow `rgba(217,119,6,0.05)`
**Data:** `feedService.getTechFeeds()` → first 3 articles
- Headline list: 3 items with amber left-accent bar (opacity fades: 1 → 0.6 → 0.35) and article title
- "+N more" footer (N = total - 3). The "updated Xm ago" timestamp is stored as a local `Date` at fetch time and displayed as relative elapsed time (e.g. "updated 4m ago") — there is no server-side timestamp for this.

### Money — border `rgba(167,139,250,0.2)`, glow `rgba(167,139,250,0.05)`
**Data:** none (placeholder — no Money backend yet)
- Static placeholder: purple donut ring, "Coming soon" label
- No fetch attempt; no loading state needed

### Jobs — border `rgba(255,68,68,0.2)`, glow `rgba(255,68,68,0.05)`
**Data:** `campaignService.getApplications()` → returns `Application[]` with `inbox_items` joined (backend query: `select("*, inbox_items(*)")`), sorted by `created_at` descending. Filter to `app.applied_at != null` for confirmed applications.
- Total applied count (`apps.length`) as large red number (top-right of header row)
- List of 3 most recent applications:
  - `job_title`: `app.cover_letter_metadata?.job_snapshot?.job_title ?? app.inbox_items?.job_title ?? "Unknown Role"`
  - `company_name`: `app.cover_letter_metadata?.job_snapshot?.company_name ?? app.inbox_items?.company_name ?? "Unknown Company"`
  - Date: `app.applied_at` formatted as relative date ("Today", "21 Mar", etc.) — same `relativeDate()` helper used in JobsView
- Dividers between rows
- "+N more applications" footer (N = total - 3)

---

## Loading & Error States

Each card independently manages its own loading state. While fetching:
- Show a muted placeholder skeleton (single `#2A2A2A` rounded rect, 60% width, 20px height)

On error or empty data:
- Show a short muted message: "No data available" in `#BBC9CD` at 10px

Cards never block each other — all 6 fetches fire in parallel via `Promise.allSettled`.

---

## Files Changed

| File | Change |
|------|--------|
| `web/src/App.tsx` | Add `/tasks` route for TaskDashboard; change index route to DashboardView; redirect `/todolist` → `/tasks`; remove TodoListView import |
| `web/src/components/cyan/Sidebar.tsx` | Rename "Todo List" → "Tasks", change path `/todolist` → `/tasks` |
| `web/src/components/cyan/DashboardView.tsx` | **New file** — full dashboard with 6 cards |

`TodoListView.tsx` is **not** modified or deleted.

---

## Out of Scope

- Money backend / real finance data
- Sleep stage breakdown (light/deep/REM) — not in current DB schema; only total `sleep_duration` shown
- 7-day historical health trend from DB — sparkline uses `raw_watch_data.weekly_steps` if present, otherwise renders a static visual placeholder
- Clicking a card to navigate to its feature page (can be added later)
