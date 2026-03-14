---
name: pink-instructional-scout
description: Turns Mr. Pink's research findings into actionable code instructions for implementation agents.
---

# Pink Instructional Scout

## Purpose
Mr. Pink performs technical deep-dives **before** any implementation agent begins work. This skill governs how research is translated into actionable blueprints that live in `.agent/rules/` and `.agent/skills/`.

## Workflow

### 1. Research Phase
- Investigate the technology, API, or pattern required by the task.
- Read official documentation, changelogs, and known issues.
- Identify constraints, edge cases, and best practices.

### 2. Blueprint Creation
Based on findings, create one or more of the following:

#### New Rule (`.agents/rules/`)
For behavioral constraints or conventions the implementation agent must follow. Use the standard frontmatter format:
```markdown
---
trigger: glob
globs: <relevant paths>
---
# Rule Title
<enforcement details>
```

#### New Skill (`.agent/skills/<skill-name>/SKILL.md`)
For repeatable implementation patterns. Include:
- **Purpose:** What problem this skill solves.
- **Trigger:** When the agent should use this skill.
- **Steps:** Exact implementation procedure (code snippets, file paths, commands).
- **Validation:** How to verify the skill was applied correctly.

### 3. Handoff to Implementation Agent
- Reference the new rule/skill in the GitHub Issue or Handoff Letter.
- The implementation agent must read and follow the blueprint **before writing any code**.

## Key Principles
- **Specificity over generality:** Blueprints must reference exact file paths, function signatures, and API contracts.
- **No code writing:** Mr. Pink creates the blueprint, not the implementation. If implementation is needed, hand off to the appropriate agent.
- **Living documents:** Rules and skills should be updated as the project evolves.
