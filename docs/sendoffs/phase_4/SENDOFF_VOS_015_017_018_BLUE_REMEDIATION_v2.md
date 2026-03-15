# SENDOFF: VOS-015 / VOS-017 / VOS-018 — Frontend Logic Remediation (v2)

- **Agent:** Mr. Blue (Frontend Expert)
- **Phase:** 4 (Logic & Automation)
- **Issued By:** Mr. Pink — post Attempt 1 audit (2026-03-15)
- **Status:** REWORK REQUIRED — re-submit to Mr. Pink Audit column when complete

---

## Context

Attempt 1 of VOS-015, VOS-017, and VOS-018 was audited live via Chrome headless screenshot on 2026-03-15. All three screens render correctly with the OLED theme and routing is intact. However, all three failed on interactive functionality and documentation requirements.

Full audit report: `docs/AUDIT_VOS_015_017_018_BLUE_2026-03-15.md`

---

## Mission: Fix All Blockers

Work must be done on `feature/blue/phase-4-logic`. Do not create new branches for this remediation.

---

### 1. Daily Planner (VOS-015) — `web/src/components/planner/index.tsx`

#### Blocker A: Wire "Add Task" to a form
The "+ Add Task" button in the header must open an inline form or modal. On submit it must call `taskService.createTask()`.

Required fields per PRD 3.6 and `CreateTaskInput` type:
- `title` (text input, required)
- `description` (textarea, optional)
- `time` (time picker, optional — HH:mm format)
- `duration` (number input in minutes, optional)

After successful create, call `fetchTasks()` to refresh the list. On cancel, close the form without any API call.

#### Blocker B: List/Grid toggle
Either implement the Grid view layout (card grid instead of list rows) or remove the toggle buttons entirely. A button that does nothing violates the OLED interaction standard — every visible control must function.

#### Blocker C: Header Delete button
The trash icon in the header has no handler. Two options (pick one):
- Remove it — a global "delete all" is a dangerous pattern without confirmation.
- Implement it with a confirmation dialog: "Delete all tasks for today? This cannot be undone." on confirm, call `taskService.deleteTask()` per task.

#### Should Fix: Archive link
Add a small "View Archive" text link below the task list or in the header area. It does not need a full route yet — a `console.log` placeholder is acceptable for now as long as the UI element exists.

---

### 2. Email Client (VOS-017) — `web/src/components/email/index.tsx`

#### Blocker A: Compose modal
The "Compose" button must open a form. Minimum fields:
- `to` (text input)
- `subject` (text input)
- `body` (textarea)

On submit call `emailService.sendEmail({ to, subject, body })`. On cancel, close without API call. Basic error feedback if send fails.

#### Blocker B: Reply button
In the reading pane (`email-view`), add a Reply button below the email body. On click it must open the same compose form pre-filled with:
- `to`: the sender's address
- `subject`: `Re: {original subject}`
- `body`: blank (do not quote original — keep it simple)

#### Blocker C: Forward button
Add a Forward button alongside Reply. On click open the compose form pre-filled with:
- `to`: blank (user fills in)
- `subject`: `Fwd: {original subject}`
- `body`: blank

#### Should Fix
- Add `font-weight: 600` to sender name when `email.is_read === false`
- Add a small whitelist count line under "Personal Communication Hub": e.g. "Whitelist active • {N} approved senders" — `N` can be derived from `emails.filter(e => e.status === 'whitelisted').length` for now

---

### 3. Health Dashboard (VOS-018) — `web/src/components/health/index.tsx`

#### Blocker A: Fix "Generate Full Report" button — OLED violation
The current button style has a white/light background. This is a hard Rule 20 violation.

Replace the button style with a dark OLED-compliant variant:
```css
/* In Health.css — replace or add: */
.primary-btn {
  background: transparent;
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}
.primary-btn:hover {
  background: rgba(0, 212, 255, 0.1);
}
```

#### Blocker B: Create `web/src/services/healthService.ts`
Every module has a typed service file. Health is the only exception. Create the file now — even if the Supabase fetch returns empty until VOS-027 is complete.

Minimum interface:
```typescript
import { supabase } from './supabase';

export interface HealthMetric {
  date: string;
  water_liters: number;
  sleep_duration: number;
  avg_heart_rate: number;
  raw_watch_data: Record<string, unknown>;
  ai_analysis: string;
}

export const healthService = {
  getLatestMetrics: async (): Promise<HealthMetric | null> => {
    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[HealthService] Fetch Error:', error);
      return null;
    }
    return data;
  }
};
```

Then in `index.tsx`, call `healthService.getLatestMetrics()` in the `useEffect`. If result is `null` (VOS-027 not live yet), fall through to the existing hardcoded defaults — this preserves the demo state while the real service layer is in place.

#### Should Fix
- Add a Heart Rate metric item to the `main-metrics` card: label "Heart Rate", value from `stats.heartRate`, unit "bpm"
- The `heartRate` field already exists in the `HealthStats` interface — just add the JSX block matching the existing metric pattern

---

## Rules of Engagement

1. **GROUND TRUTH:** `docs/assets/ui_ground_truth/` remains the visual reference. Note: `planner_v1.png` and `email_inbox_v1.png` filenames are swapped — use content not filename.
2. **OLED First:** Every new UI element (modals, forms, buttons) must use design tokens. No hardcoded colours. No white or light backgrounds.
3. **No new branches:** All fixes go on `feature/blue/phase-4-logic`.
4. **Handoff required:** You MUST submit a single consolidated `HANDOFF.md` covering all three tasks. Save to `docs/handoffs/phase_4/HANDOFF_VOS_015_017_018_BLUE_v1.md`. No audit will be triggered without it.

---

## Handoff Checklist (include in your HANDOFF.md)

- [ ] Add Task form wired and tested
- [ ] List/Grid toggle resolved (implemented or removed)
- [ ] Delete button resolved (implemented with dialog or removed)
- [ ] Archive view link present
- [ ] Compose modal wired to `emailService.sendEmail()`
- [ ] Reply button wired in reading pane
- [ ] Forward button wired in reading pane
- [ ] Generate Full Report button OLED-compliant
- [ ] `healthService.ts` created with `getLatestMetrics()`
- [ ] Health component uses `healthService` in `useEffect`
- [ ] Heart Rate metric card added
- [ ] All three routes tested in browser (screenshot evidence in handoff)

---

*Signed,*
**Mr. Pink**
*Project Manager & Architectural Scout*
*2026-03-15*
