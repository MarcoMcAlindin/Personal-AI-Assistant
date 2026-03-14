---
description: Enforces structured placement of all documentation to ensure organized tracking of development progress.
trigger: always_on
---

# Documentation Placement & Organization (Rule 18)

To ensure the CEO and all agents can effectively track the progress of development, any piece of documentation created by an agent MUST be placed in its appropriate, logical directory.

## 1. No Floating Files
Documentation (`.md` files) must **never** be dumped loosely in the root directory or in random folders. Every piece of documentation must have a designated home based on its operational purpose.

## 2. Designated Documentation Zones
- **Project Blueprints & PRDs:** `/docs/`
  - High-level architectural plans, feature specs, and full system manuals.
- **Agent Rules & Directives:** `.agent/rules/`
  - Instructions that dictate how an agent operates or governs the global workflow.
- **Agent Skills:** `.agent/skills/`
  - Actionable capabilities or specific instructions developed by Mr. Pink for implementation agents.
- **Component Manuals:** `<component>/README.md`
  - Implementation details strictly localized to their codebase territory (e.g., `/web/README.md`, `/backend/README.md`, `/mobile/README.md`, `/vllm_deployment/README.md`).
- **Temporary / One-Off Outputs:** `/tmp/`
  - Scratchpads, temporary analysis, or debug files that do not need to be permanently tracked in version control.

## 3. Handoffs & Audits
When an agent creates a `HANDOFF.md` or an `AUDIT.md` to prove completion of a task, it MUST be **Exported as an artifact** and stored in a phase-specific subdirectory within `.agent/handoffs/`. This allows the CEO to track development step-by-step and perform historical analysis.

**Mandatory Subdirectories:**
- `.agent/handoffs/phase_1_foundation/`
- `.agent/handoffs/phase_2_backend_ai/`
- `.agent/handoffs/phase_3_frontends/`
- `.agent/handoffs/phase_4_polish/`

## 4. Why This Matters
By strictly organizing documentation, we prevent repository bloat and ensure that any agent (or the CEO) dropping into a specific folder instantly knows what features have been implemented and how they work.
