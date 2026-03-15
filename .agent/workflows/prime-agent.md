---
description: Establishes the project baseline, agent identity, and recent development history for the current session.
---

## Agent Priming Sequence (VibeOS GitHub-Native)
**Description:** Establishes the project baseline, agent identity, branching rules, and fetches the next actionable task directly from the GitHub Project Board.

### 1. Context Ingestion (Prompt Caching Optimized)
**Action:** Silently read the following files in order. Do not skip.
* `@PRD.md` & `@Tech_Doc.md`: To internalize the architecture and feature requirements.
* `@Team.md` & `@Git_Architecture.md`: To verify agent domains and branching protocols.
* `.agent/rules/` & `.agent/skills/`: To ensure adherence to Mr. Pink’s established "Scout" protocols.

### 2. Identity & Domain Affirmation
**Action:** Identify your specific persona (Mr. Blue, Mr. Green, Mr. Red, or Mr. White). 
* **Verification:** Confirm you have access to your assigned directory (e.g., `/backend` for Green, `/database` or `/infrastructure` for White).

### 3. Task Acquisition (GitHub Project V2)
**Action:** Interrogate the GitHub MCP or CLI to list issues in the **@MarcoMcAlindin's Personal AI Assistant** Project Board.
* **Filter:** Retrieve only issues tagged with your specific agent-color label.
* **Priority:** Identify the issue with the highest priority (or lowest ID) in the "Backlog" or "Assigned" column.
* **Python Logic:** If the GitHub JSON payload is complex, use **Python** to parse and filter the data structure to ensure 100% accuracy in task selection.

### 4. Git Environment & Worktree Activation (Rule 30)
**Action:** Before any file edits, activate your isolated worktree. NEVER run `git checkout` to switch branches — this contaminates the shared monorepo for all other agents.
* **Check existing worktrees:** Run `git worktree list` from the main repo.
* **If your worktree exists:** `cd /home/marco/vibeos-worktrees/<color>` then `git pull origin <your-branch>`.
* **If your worktree does NOT exist yet:** Run the `git-worktree-setup` skill to create it — `git worktree add /home/marco/vibeos-worktrees/<color> feature/<color>/<branch>`.
* **Verify:** Confirm `pwd` is your worktree path and `git branch --show-current` matches your task branch before touching any file.

### 5. The Readiness Pledge
**Action:** Output a structured acknowledgment containing:
* **Agent Identity:** Your Name and Technical Domain.
* **Target Task:** The Title and #ID of the GitHub Issue you are claiming.
* **Branch Strategy:** Confirmation of the exact branch name following the `feature/<color>/<id>-<desc>` convention.
* **Skill Check:** Confirmation that you have read the relevant `.agent/skills/SKILL.md` provided by Mr. Pink for this task.
* **Commitment:** "I am primed, synced with the GitHub Source of Truth, and ready to begin development."