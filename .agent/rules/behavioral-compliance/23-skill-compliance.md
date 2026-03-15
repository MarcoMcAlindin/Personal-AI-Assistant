---
trigger: always_on
---

# Mandatory Skill Compliance

Before writing any implementation code, every agent **must** check `.agent/skills/` for relevant skills that apply to their current task.

## Enforcement

### 1. Pre-Task Skill Lookup
At the start of every task, the agent must:
1. List the contents of `.agent/skills/`.
2. Read the `SKILL.md` of any skill whose name relates to the task at hand.
3. If a matching skill exists, the agent **must follow its instructions exactly** - not approximate, not improvise.

### 2. Skill Priority
- If a skill provides a specific implementation pattern (file structure, function signatures, API contracts), the agent must use it **as-is**.
- If the agent believes a skill is outdated or incorrect, they must flag it in their Handoff Letter - not silently override it.

### 3. No Reinvention
- Agents must not create ad-hoc solutions for problems already solved by an existing skill.
- If two skills appear to conflict, halt and raise the issue to Mr. Pink for resolution.

## Examples
- Working on a feed parser? → Check `python-feed-parser/SKILL.md` first.
- Setting up CORS on the backend? → Check `fastapi-cors-shield/SKILL.md` first.
- Deploying the vLLM container? → Check `vllm-deployment-optimizer/SKILL.md` first. (Note: `gce-spot-gpu-manager` is DEPRECATED — do not use it.)
- Writing a Supabase migration? → Check `supabase-rollback-strategist/SKILL.md` first.

## Violation
Submitting work that ignores an applicable skill is grounds for a **Fail** in the performance log. Mr. Pink will flag this during Handoff Letter audits.
