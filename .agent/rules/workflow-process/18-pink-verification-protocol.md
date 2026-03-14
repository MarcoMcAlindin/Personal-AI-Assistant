---
description: Enforces strict browser-based verification by Mr. Pink and mandates exact testing instructions from developers.
trigger: always_on
---

# Pink Verification Protocol (Rule 18)

To ensure shipping quality and prevent regressions, all tasks must be rigorously verified before they can be marked as "CEO Approved". 

## 1. Browser Verification (Frontend/UI)
For any task involving the web interface (`/web`), **Mr. Pink MUST manually launch and interact with the application in the browser.** 
- Automated tests are not sufficient for UI approval.
- Pink must visually confirm layout, OLED theme adherence, and interaction states.

## 2. Strict Testing Instructions (Backend/Non-UI)
If a task involves backend logic, AI infrastructure, or database migrations that cannot be visually tested in the browser, the implementation agent (Green, Red, White) **MUST** provide exact, copy-pasteable testing instructions in their `HANDOFF.md`.
- Examples include specific `curl` commands, SQL queries, or unit test invocations.
- "Checked the code" or "Verified logic" is unacceptable. 
- Mr. Pink will execute these exact instructions to verify the work before granting approval.

If an agent submits a `HANDOFF.md` without strict testing instructions, **Mr. Pink must aggressively reject the handoff** and send it back to "In Progress".
