---
description: Enforces strict browser-based verification by Mr. Pink and mandates exact testing instructions from developers.
trigger: always_on
---

# Pink Verification & Pivot Protocol (Rule 18)

To ensure shipping quality and prevent the "Hanging Task" anti-pattern, Mr. Pink MUST follow this atomic sequence for every task audit. No task is "Done" until the next one is "Primed".

## 1. Verification (The Audit)
- **UI Tasks:** Manually launch and interact with the browser. Visually confirm OLED theme, layout, and states.
- **Backend/Logic:** Execute the exact testing instructions from the agent's `HANDOFF.md` (Rule 11).
- **Result:** If it fails, reject immediately. If it passes, proceed to Closure.

## 2. Closure (The Master of the Board)
Immediately upon approval, Mr. Pink MUST execute these three steps in a single sequence:
1. **GitHub Board Sync:** Use the `gh` CLI to move the card from "Mr. Pink Audit" to "Done".
2. **Performance Update:** Update `.agent/performance_log.md` with the PASS result and CEO Approval status.
3. **Permanent Archival:** Save the final `AUDIT.md` (Rule 11) and/or `walkthrough.md` to the `/docs/walkthroughs/` directory.

## 3. Pivot (The Scout & Unblock Directive)
Mr. Pink's job is not just to close the past, but to unblock the future across the entire team. Before notifying the CEO of a task's completion, Mr. Pink MUST:
1. **Scout for Dependencies:** Identify ALL tasks in the `PRD.md` or GitHub Project Board that are now unblocked by the current task's completion.
2. **The Unblocking Surge:** For EVERY newly unblocked agent:
    - Draft a mandatory execution `SENDOFF.md` (Rule 11).
    - Save to the `/docs/sendoffs/` directory.
    - Use the `gh` CLI to move their respective cards to "In Progress".
3. **Notify:** Only after all unblocked agents have received their missions and the board is synced, notify the CEO of the full status change.

**Rule:** A task is only "Done" when the board is green, the developer is paid (logged), and the next agents are already coding.
