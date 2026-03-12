# VibeOS Git Architecture & Branching Strategy

This document dictates the strict Git flow for the VibeOS monorepo. All agents must adhere to this structure.

## Permanent Branches
- `main`: Production code only. Strictly locked. Deployments to Cloud Run and Expo happen automatically from here.
- `staging`: The central integration hub. All agents merge completed feature branches here for the `/full-stack-test`.

## Ephemeral Branch Naming Convention
You must never work directly on `main` or `staging`. When starting a task, cut a new branch using this exact format:
`<type>/<agent-name>/<issue-number>-<short-description>`

**Allowed Types:**
- `feature/`: For brand new code or UI components.
- `fix/`: For patching bugs found in staging or production.
- `chore/`: For updating dependencies, configurations, or documentation.
- `hotfix/`: For critical production failures (branches directly off `main`).

**Examples:**
- `feature/blue/42-auth-ui`
- `fix/green/18-fastapi-cors`
- `chore/red/05-update-actions`

## The Merge Protocol
1. Push your branch to the remote repository.
2. Open a Pull Request targeting `staging`.
3. You must request a review from the human manager. Do not auto-merge.