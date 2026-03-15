---
trigger: always_on
---

# Rule 30: Git Worktree Isolation Protocol

## The Problem This Solves

VibeOS is a monorepo. Running `git checkout <branch>` switches the **entire working directory** for all agents simultaneously. If Mr. Blue is mid-task and Mr. Green runs `git checkout feature/green/xxx`, Blue's uncommitted work is either wiped or causes a conflict. This is the "wrong branch" contamination bug.

## The Solution: Git Worktrees

`git worktree add` creates a **separate directory on disk** that is locked to a specific branch. The main repo stays untouched. Each agent operates in their own isolated folder. All worktrees share the same `.git` object store — commits, branches, and history remain unified.

```
/home/marco/Personal AI Assistant/   ← main repo (Mr. Pink / staging)
/home/marco/vibeos-worktrees/blue/   ← Mr. Blue's isolated directory
/home/marco/vibeos-worktrees/green/  ← Mr. Green's isolated directory
/home/marco/vibeos-worktrees/red/    ← Mr. Red's isolated directory
/home/marco/vibeos-worktrees/white/  ← Mr. White's isolated directory
```

## The Rule

**AGENTS MUST NEVER RUN `git checkout` TO SWITCH BRANCHES.**

Instead, every agent must operate inside their designated worktree directory. See the `git-worktree-setup` skill for the one-time setup command.

### On First Session (worktree does not exist yet)
```bash
git worktree add /home/marco/vibeos-worktrees/<color> feature/<color>/<branch>
```
Then open `/home/marco/vibeos-worktrees/<color>` as your working directory for the entire task.

### On Subsequent Sessions (worktree already exists)
```bash
cd /home/marco/vibeos-worktrees/<color>
git pull origin feature/<color>/<branch>
```
Never re-create an existing worktree. Check with `git worktree list` first.

### On Task Completion
Commit and push from the worktree directory. Do NOT run `git worktree remove` after each task — leave the worktree in place for the next session.

## Enforcement

- If an agent finds itself inside `/home/marco/Personal AI Assistant` on a non-Pink branch, it has violated this rule.
- The agent must immediately stop, commit any in-progress work, and migrate to the correct worktree before continuing.
- Mr. Pink will reject any Handoff Letter where the git log shows the branch was checked out from the main repo directory rather than committed from a worktree.

## VS Code Multi-Root Workspace

All worktrees are registered in `vibeos.code-workspace` at the repo root. Open this file in VS Code to see all agent domains simultaneously in the Explorer and Source Control panels — each with its own branch indicator and commit input.
