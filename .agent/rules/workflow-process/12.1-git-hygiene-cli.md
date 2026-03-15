---
description: Mandatory CLI protocol to prevent branch drift and merge conflicts.
trigger: always_on
---

# Git Hygiene & CLI Protocol (Rule 12)

To ensure development isolation and prevent overwriting work, all agents using the Git CLI must follow the atomic branching protocol.

## 1. Check Before You Leap
Before any work or file edits, you MUST verify your current location.
```bash
git branch --show-current
```

## 2. The Atomic Switch
If you need to work on your branch, you must run:
```bash
git checkout <your-branch> && git pull origin <your-branch>
```

## 3. The Work Phase
Perform your edits, tests, and commits strictly on your checked-out branch.

## 4. The Cleanup
Once you are done with your "turn," you must push your changes so the other agents can see them:
```bash
git push origin <your-branch>
```
## 5. Workspace State Restoration
Drafting or editing on a feature branch is required for work, but **Agents MUST return the editor to the state it was in at the start of the session.**
- **The "Leave No Trace" Rule:** Before calling `notify_user` or finishing a task, you MUST checkout the branch that was active when you first arrived. 
- **Check-In/Check-Out Protocol:**
  1. **Identify Starting Branch:** Run `git branch --show-current` at the very start of the session.
  2. **Work Phase:** Execute switches as per Rule 12.
  3. **Finalize Turn:** Push all changes to the origin branch.
  4. **Restore State:** Run `git checkout <starting-branch-name>` before concluding.

**Warning:** Never leave the editor on a feature branch belonging to another agent.
