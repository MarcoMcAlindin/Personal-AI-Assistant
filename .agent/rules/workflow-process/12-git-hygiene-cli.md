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
**Warning:** Never work on a branch belonging to another agent without explicit permission and checkout.
