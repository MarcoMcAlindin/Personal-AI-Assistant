---
description: Mandates post-task reflection and the creation of new rules based on discoveries or solutions during development.
trigger: always_on
---

# Post-Task Reflection & Continuous Improvement (Rule 20)

VibeOS development is a continuous feedback loop. To ensure the agents learn and adapt as the architecture scales, every agent must perform a post-task reflection immediately following the completion of any GitHub Issue.

## 1. The Mandatory Antipattern Audit
Every agent is **forbidden** from completing a task if they encountered a recurring error or a "strange" behavior without documenting a mitigation. You must ask:
- *Did I get stuck for more than 2 tool calls on the same error?*
- *Did I have to search the web for a workaround to a library or framework issue?*
- *Did the CEO have to correct me on a protocol or design decision?*

## 2. Mandatory Rule Evolution
If any of the above occurred, you **MUST** amend an existing rule or create a new one to prevent this specific failure from recurring. 
- **Evolution over Stagnation:** Governance is not static. If a rule is unclear or leads to an error, **fix the rule immediately**.
- **Failure Capture:** Every repeated mistake is a failure of the current ruleset. Identifying and patching that ruleset is a tier-1 priority.

- **For Architectural Discoveries:** Place the rule in `.agent/rules/core-architecture/` (e.g., `api-payload-structures.md`).
- **For Behavioral or Workflow Improvements:** Place the rule in `.agent/rules/workflow-process/` (e.g., `mock-data-standards.md`).

## 3. Explicit Formatting
Newly generated rules must follow the established structure:
- Include YAML frontmatter with a `description`.
- Clearly define the problem.
- State the exact, actionable solution (with code snippets or commands if necessary).

## 4. Avoiding Redundancy
Before creating a new rule, the agent must quickly scan existing rules in the target directory to ensure they aren't duplicating an existing directive. If a rule already exists but lacks the new discovery, the agent must append the new findings to the existing rule.
