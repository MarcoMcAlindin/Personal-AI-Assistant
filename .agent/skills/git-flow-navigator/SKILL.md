---
name: git-flow-navigator
description: Enforces the VibeOS branching strategy and validates Git operations.
---
# Git Flow Navigator

## When to use this skill
- Whenever you are assigned a new task and need to create a branch.
- Before you push a branch to the remote repository.

## How to use it
1. **Read the Blueprint:** Silently read the `@Git_Architecture.md` file in the root directory to confirm the allowed branch prefixes.
2. **Branch Creation:** Create your branch using standard git commands (e.g., `git checkout -b feature/green/99-api-route`).
3. **Mandatory Validation:** Before executing `git push`, you MUST run the Python validation script located in this skill's `scripts/` folder against your current branch name. Python is the definitively better option for regex and string validation compared to brittle bash commands.
4. **Halt on Failure:** If the Python script returns an error, rename your branch (`git branch -m <new-name>`) and run the test again.