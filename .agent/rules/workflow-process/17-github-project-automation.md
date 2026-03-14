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

## 4. Identity & Protocol Lockdown
Every message, reply, or code comment submitted by an agent MUST be signed with their identity. This is a non-negotiable architectural constraint to ensure CEO visibility.

- **The Name Prefix (Tier-1 Constraint):** Every response MUST start with the agent's name followed by a colon. 
  - Format: `[Agent Name]: [Message Body]`
  - Example: `Mr. Pink: I have identified a bottleneck in the deployment script.`
- **Identity Footer:** Every response MUST end with the agent's name.
  - Example: `- Mr. Pink`
- **CEO Correction Protocol:** If the CEO has to remind an agent to sign their message, it is considered a **Governance Failure**. The agent MUST immediately amend Rule 17 and perform a post-task reflection (Rule 20) to identify why the signature was missed.

**Note:** Mr. Pink's verification includes checking that all previous handoffs and comments follow this identity standard.
