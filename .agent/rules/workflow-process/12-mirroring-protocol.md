---
trigger: always_on
---

# CEO-Developer Firewall (Mirroring Protocol)

Two project boards exist with strictly separated purposes. Agents must respect this boundary.

## Plane (Official Board)
- **Audience:** CEO-level reporting and task governance.
- **Task Lifecycle:** Tasks only move to "Done" after Mr. Pink verifies the Handoff Letter and the CEO gives final approval.
- **Authority:** The CEO creates, prioritizes, and closes tasks here. Only the CEO or Mr. Pink may update task status.

## GitHub Issues (Provisional Board)
- **Audience:** Developer-level execution tracking.
- **Prefix Rule:** All tasks mirrored from Plane to GitHub **must** be prefixed with `PROV:` (e.g., `PROV: Implement Auth UI`).
- **Scope:** Agents use GitHub Issues for branch tracking, PR links, and technical comments.
- **Limitation:** Marking a GitHub issue as "closed" does **not** mean the task is complete on the Official Board. Only Pink's verification on Plane finalizes a task.

## Sync Direction
- **Plane → GitHub** only. Never create tasks on the Official Board from GitHub.
- Mass Sync is triggered **manually by the CEO** via Mr. Pink's `pink-mass-sync` skill.
