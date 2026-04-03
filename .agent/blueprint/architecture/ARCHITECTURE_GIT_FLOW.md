# SuperCyan Git Architecture & Branching Strategy
**References:** [[../TEAM_STRUCTURE|Team Structure]] | [[../PRODUCT_REQUIREMENTS_DOCUMENT|PRD]]

This document dictates the strict Git flow for the SuperCyan monorepo. All agents must adhere to this structure.

## Core Principles
- **Source of Truth:** All work begins and ends in GitHub.
- **Project Board:** Link all Issues to the `@MarcoMcAlindin's Personal AI Assistant` project.
- **Status Flow:** Backlog -> In Progress -> [[Mr. Pink]] Audit -> CEO Approved.

## Permanent Branches
- `main`: Production code only. Strictly locked. Deployments to Cloud Run and Expo happen automatically from here.
- `staging`: The central integration hub. All agents merge completed feature branches here for the `/full-stack-test`.

## Ephemeral Branch Naming Convention
You must never work directly on `main` or `staging`. When starting a task, cut a new branch using this exact format:
`feature/<agent-color>/<issue-number>-<short-description>`
(e.g., `feature/green/12-api-setup`)

> **Note:** All feature branches are considered **"Provisional"** until [[Mr. Pink]] has verified the associated `HANDOFF.md` and the CEO gives final approval.

**Allowed Types:**
- `feature/`: For brand new code or UI components.
- `fix/`: For patching bugs found in staging or production.
- `chore/`: For updating dependencies, configurations, or documentation.
- `hotfix/`: For critical production failures (branches directly off `main`).

**Examples:**
- `feature/blue/42-auth-ui`
- `fix/green/18-fastapi-cors`
- `chore/red/05-update-actions`

## The Merge Protocol (Handoff Rule)
1. Push your branch to the remote repository.
2. Open a Pull Request targeting `staging`.
3. Attach a verified `HANDOFF.md` to the PR description or as a file in the branch.
4. **[[Mr. Pink]]** audits the Handoff Letter against the PRD and confirms the work is complete.
5. The CEO gives final approval. Only then is the branch merged.
6. Branches without a Pink-verified `HANDOFF.md` are **never merged** to `staging`.
