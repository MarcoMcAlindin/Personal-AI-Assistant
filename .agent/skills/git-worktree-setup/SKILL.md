---
name: git-worktree-setup
description: One-time setup and session initialisation for agent-isolated git worktrees. Replaces all git checkout usage.
---

# Git Worktree Setup Skill

## Purpose
Provision and activate an isolated working directory for each agent so that multiple agents can work on their own branches simultaneously without contaminating each other's code. Implements Rule 30.

## Trigger
Use this skill during every prime-agent Step 4 instead of `git checkout`.

---

## One-Time Setup (First Session Only)

Run once per agent colour. Skip if the worktree directory already exists.

```bash
# Confirm you are inside the main repo first
cd "/home/marco/Personal AI Assistant"

# Check what worktrees already exist
git worktree list

# Create the worktree for your colour (replace <color> and <branch>)
git worktree add /home/marco/vibeos-worktrees/<color> feature/<color>/<branch>

# Example for Mr. Blue on current task:
git worktree add /home/marco/vibeos-worktrees/blue feature/blue/phase-4-logic

# Example for Mr. Green:
git worktree add /home/marco/vibeos-worktrees/green feature/green/25-fastapi-auth

# Example for Mr. Red:
git worktree add /home/marco/vibeos-worktrees/red feature/red/23-vllm-deploy

# Example for Mr. White:
git worktree add /home/marco/vibeos-worktrees/white feature/white/supabase-ops
```

If the branch does not exist yet, create it from staging first:
```bash
git fetch origin
git branch feature/<color>/<id>-<desc> origin/staging
git worktree add /home/marco/vibeos-worktrees/<color> feature/<color>/<id>-<desc>
```

---

## Every Session: Activate Your Worktree

```bash
# 1. Navigate to your worktree (NOT the main repo)
cd /home/marco/vibeos-worktrees/<color>

# 2. Confirm you are on the correct branch
git branch --show-current

# 3. Pull latest from remote
git pull origin feature/<color>/<branch>

# 4. Proceed with your task
```

---

## Committing and Pushing from a Worktree

Works exactly like a normal repo directory:
```bash
cd /home/marco/vibeos-worktrees/<color>
git add web/src/components/planner/index.tsx   # add specific files in your domain
git commit -m "feat(blue): Wire Add Task form [VOS-015]"
git push origin feature/<color>/<branch>
```

---

## Checking All Active Worktrees

From anywhere inside the repo (main or any worktree):
```bash
git worktree list
```
Expected output when all agents are set up:
```
/home/marco/Personal AI Assistant          abc1234 [feature/blue/phase-4-logic]
/home/marco/vibeos-worktrees/blue          abc1234 [feature/blue/phase-4-logic]
/home/marco/vibeos-worktrees/green         def5678 [feature/green/25-fastapi-auth]
/home/marco/vibeos-worktrees/red           ghi9012 [feature/red/23-vllm-deploy]
/home/marco/vibeos-worktrees/white         jkl3456 [feature/white/supabase-ops]
```

---

## Validation Checklist

Before beginning any file edits, confirm:
- [ ] `pwd` returns `/home/marco/vibeos-worktrees/<your-color>` (not the main repo)
- [ ] `git branch --show-current` returns your assigned feature branch
- [ ] `git worktree list` shows your worktree as a separate entry
- [ ] You have NOT run `git checkout` at any point during this session

---

## Removing a Stale Worktree (Only If Branch Is Merged)

```bash
cd "/home/marco/Personal AI Assistant"
git worktree remove /home/marco/vibeos-worktrees/<color>
```
Only do this after the branch has been merged to staging. Never remove an active worktree mid-task.
