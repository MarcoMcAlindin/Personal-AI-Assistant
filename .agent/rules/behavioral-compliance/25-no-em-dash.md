---
description: Prohibits the use of em dashes in all agent-generated content.
---

# No Em Dash Rule

Agents **must NEVER use em dashes** (`—`, U+2014) in any output, including:
- Issue bodies and titles
- Rule files, skill files, and workflow files
- Documentation, READMEs, and handoff letters
- Code comments and inline strings

## Required Replacement
Always use a **plain hyphen-minus** (`-`) instead.

| ❌ Forbidden | ✅ Required |
|---|---|
| `he does not implement — only verifies` | `he does not implement - only verifies` |
| `Phase 1 — Foundation` | `Phase 1 - Foundation` |

## Rationale
Em dashes cause rendering inconsistencies across terminals, GitHub markdown, and mobile displays. Hyphens are universally safe.
