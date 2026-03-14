---
description: Validates a HANDOFF.md or AUDIT.md against Project Rules 11, 18, and 21.
---

# Workflow: Audit Handoff Standards

This workflow ensures absolute traceability and organizational compliance for all agent submissions.

## Verification Steps

1. **Rule 21 (Strict Versioning) Check:**
   - Verify the filename follows: `[ISSUE-ID]_v[VERSION]_[DOC-TYPE].md`.
   - Ensure the version is incremented if a previous version exists.

2. **Rule 18 (Documentation Placement) Check:**
   - Verify the file is located in `.agent/handoffs/phase_X_description/`.
   - For plans, ensure it is in `.agent/implementation_plans/`.

3. **Rule 11 (Template Integrity) Check:**
   - **Header:** Contains Date, Recipient, and Task ID.
   - **Summary:** Concise description of changes.
   - **Files:** List of all created/modified/deleted files.
   - **Testing:** Contains literal commands to reproduce verification.
   - **Rule 20 (Self-Healing):** Contains a mandatory justification or a recorded rule change.

4. **Git State Verification:**
   - Confirm the document is committed to the correct feature branch.
   - Ensure the branch naming follows `feature/<agent>/<issue>-<desc>`.

## Execution
Run this workflow by pointing the agent to a specific handoff file:
`@current_agent audit this handoff: [.agent/handoffs/phase_3_frontends/VOS-012_v1_handoff.md]`
