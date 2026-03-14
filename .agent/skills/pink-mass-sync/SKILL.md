---
name: pink-mass-sync
description: Mirrors tasks from Plane (Official Board) to GitHub Issues (Provisional Board) with PROV: prefix.
---

# Pink Mass Sync

## Purpose
Populate GitHub Issues based on Plane project data. This creates a developer-facing mirror of the CEO's Official Board for execution tracking.

## Trigger
This skill is executed **only upon CEO command**. Mr. Pink must never auto-sync.

## Sync Procedure

### 1. Fetch Plane Tasks
- Use the Plane MCP tool to list all tasks in the "Personal AI Assistant" project.
- Filter by status: only sync tasks marked as "Todo" or "In Progress".

### 2. Map to GitHub Issues
For each Plane task, create a corresponding GitHub Issue with the following mapping:

| Plane Field   | GitHub Field   | Transform                          |
|---------------|----------------|------------------------------------|
| Title         | Issue Title    | Prepend `PROV: ` prefix           |
| Description   | Issue Body     | Copy verbatim + add Plane link     |
| Priority      | Labels         | Map to `priority:high/med/low`     |
| Assignee Color| Labels         | Map to agent color (e.g., `green`) |
| Status        | Issue State    | Todo → Open, Done → Closed         |

### 3. Deduplication
- Before creating a new issue, search existing GitHub Issues for matching `PROV:` titles.
- If a match exists, **update** the issue instead of creating a duplicate.

### 4. Confirmation
- Output a summary table of all synced issues (created vs. updated).
- Log the sync event in `.agent/performance_log.md`.

## Constraints
- **Direction:** Plane → GitHub only. Never reverse-sync.
- **Prefix:** All synced issues must have the `PROV:` prefix. Omitting it violates the Mirroring Protocol.
