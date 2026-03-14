---
description: Mandates strict naming conventions and versioning for all task-related documentation.
trigger: always_on
---

# Strict Documentation Versioning (Rule 21)

To maintain an immutable and traceable history of development decisions, all task documentation (Handoffs, Audits, and Implementation Plans) MUST follow a standardized versioning protocol.

## 0. The Export Mandate
Drafts or "brain artifacts" generated during an AI session are temporary. **A task is not considered documented until the artifact has been "Exported" (written as a file) to the appropriate directory in the repository.** No documentation should remain solely in the session logs.

## 1. Mandatory Naming Convention
Every file must follow this exact character-sequence:
`[ISSUE-ID]_v[VERSION]_[DOC-TYPE].md`

- **ISSUE-ID:** The standard VibeOS issue ID (e.g., `VOS-001`).
- **VERSION:** An incrementing number starting at `1` (e.g., `v1`, `v2`, `v3`).
- **DOC-TYPE:** One of the following: `plan`, `handoff`, or `audit`.

**Examples:**
- `VOS-001_v1_plan.md`
- `VOS-001_v1_handoff.md`
- `VOS-001_v1_audit.md`
- `VOS-001_v2_plan.md` (If the initial plan was revised after feedback).

## 2. No Overwrites Policy
Agents are strictly forbidden from overwriting an existing documentation file. 
- If a plan is updated based on CEO feedback, a new file with an incremented version number (`v2`) must be created.
- If a handoff is revised, a new version must be saved.
- This ensures that "Step-by-Step" analysis can be performed on the evolution of a feature.

## 3. Directory Integration
This rule works in conjunction with **Rule 18 (Documentation Placement)**. Files must be saved in their respective phase-specific subdirectories within:
- `.agent/handoffs/`
- `.agent/implementation_plans/`
