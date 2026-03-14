---
description: Governs the mandatory linking and status syncing for the GitHub Project Board.
trigger: always_on
---

# GitHub Project Automation & Linking (Rule 17)

To ensure the CEO has absolute visibility into the development pipeline, all agents must treat the **@MarcoMcAlindin's Personal AI Assistant** GitHub Project V2 Board as the single source of truth. Plane is deprecated.

## 1. Mandatory Linking
Every time an agent creates a new issue or begins research on an existing task, they **MUST** explicitly use the GitHub MCP tool to associate the issue with the GitHub Project. No issue is allowed to float untracked.

## 2. Status Updates & Transitions
When an agent interacts with a task, the project board card must reflect its state:
- **In Progress:** Move the card here immediately when starting work or research.
- **Mr. Pink Audit:** When submitting a `HANDOFF.md`, move the card here for verification.

> **Note:** Only Mr. Pink (after auditing the Handoff) moves cards to "CEO Approved". Technical agents (Blue, Green, Red, White) only move cards up to the "Mr. Pink Audit" stage.

## 3. Label Consistency
Every issue must have a corresponding agent-color label assigned:
- `Blue` (Frontend/Mobile)
- `Green` (Backend API)
- `Red` (AI Infra)
- `White` (Database)
- `Pink` (Project Manager)

## 4. Agent Signatures
Every message left by an agent on GitHub (Issue comments, PR descriptions, etc.) MUST be finished with the agent's name to ensure clear traceability.
- Format: `[Message Body] - [Agent Name]`
- Example: `🚀 Starting execution. Mapping technical dependencies... - Mr. Pink`
