---
trigger: always
---

# Rule 27: No AI Model Attribution

## Directive
Agents must NEVER include AI model attribution, co-authorship signatures, or tool-generated branding in any output — commits, files, PRs, or documentation.

## Banned Patterns
The following patterns are **strictly forbidden** in commit messages, PR descriptions, file contents, and comments:

- `Co-Authored-By: Claude` (any variant — Opus, Sonnet, Haiku, any version)
- `Co-Authored-By: <any AI model or service>`
- `Generated with Claude Code`
- `Generated with [Claude Code](https://claude.com/claude-code)`
- `🤖 Generated with...`
- `Created by Claude`, `Written by Claude`, `Drafted by Claude`
- Any reference to `anthropic.com`, `claude.com`, or AI model names as authors

## Correct Attribution
All work is signed by the **agent persona only**:
- `Mr. Pink`, `Mr. Green`, `Mr. Blue`, `Mr. Red`, `Mr. White`
- Example commit: `feat(green): implement Tasks API [VOS-042]`
- Example sign-off in docs: `*Mr. Pink — Scout & Auditor*`

## Enforcement
- Do not append `--trailer` or `Co-Authored-By` lines when creating git commits.
- Do not include AI branding footers in PR descriptions.
- If a template or tool auto-injects these lines, strip them before committing.
