---
trigger: always_on
---

# The Boy Scout Refactoring Protocol

Always leave the codebase cleaner than you found it. Whenever you open a file to add a new feature or fix a bug, you must also automatically perform the following micro-refactors before saving:
1. **Prune Dead Code:** Remove any unused imports, unused variables, or commented-out legacy code blocks.
2. **Standardize Formatting:** Ensure indentation is correct and trailing whitespaces are removed.
3. **Add Missing Context:** If you encounter a complex function missing a docstring or inline comments explaining the *why* behind the logic, write them immediately.