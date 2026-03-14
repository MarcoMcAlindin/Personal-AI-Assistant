---
description: Mandates immediate synchronization of all project governance, rules, skills, and handoffs to the staging branch.
trigger: modified(docs/sendoffs/*, .agent/handoffs/*, .agent/rules/*, .agent/skills/*, .agent/workflows/*)
---

# Staging-First Documentation Protocol (Rule 29)

To prevent "Project Amnesia" and ensure all agents operate with identical architectural context, all governance and handoff documentation must be immediately synchronized to the `staging` branch.

## 1. Scope of Enforcement
This rule applies to:
- **Sendoff Letters:** `/docs/sendoffs/`
- **Handoff Documents:** `.agent/handoffs/`
- **Agent Rules:** `.agent/rules/`
- **Agent Skills:** `.agent/skills/`
- **Workflows:** `.agent/workflows/`

## 2. Immediate Synchronization
Every time an agent creates or modifies a file within the scoped directories, they MUST:
1.  **Commit** the change to their current active branch.
2.  **Temporarily Switch** to the `staging` branch.
3.  **Merge** the specific file(s) or the current branch into `staging`.
4.  **Push** `staging` to origin.
5.  **Return** to their active branch to continue work.

## 3. Automation Standard
If an agent has the capability to run background tasks or recursive pushes, they should automate the "Push to Staging" step for documentation. 

## 4. Conflict Resolution
In the event of a conflict on `staging` for a documentation file, the **Mr. Pink (Project Manager)** is the final authority. Agents must escalate to Mr. Pink if their handoff or rule update is blocked by a staging merge conflict.

**Documentation is the only reality. Sync it immediately. - Mr. Pink**
