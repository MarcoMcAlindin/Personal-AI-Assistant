---
trigger: always_on
---

# Handoff & Audit Standard

No task is considered complete without a properly formatted `HANDOFF.md` (for developers) or `AUDIT.md` (for Mr. Pink). This is a **hard requirement** enforced across all agents to ensure absolute traceability.

## When to Generate
- **Developers (Blue, Green, Red, White):** A `HANDOFF.md` must be generated at the end of every task before submission.
- **Auditor (Mr. Pink):** An `AUDIT.md` must be generated after every successful verification before moving a task to "CEO Approved". Mr. Pink must follow the **Verification & Pivot Protocol (Rule 18)** to finalize the closure and next-task priming.
Both are delivered as markdown artifacts, saved to the project history (including permanent archival in `/docs/`), and MUST follow the naming convention in **Rule 21**.

## Required Contents (Standardized)

Every `HANDOFF.md` or `AUDIT.md` must include the following:

### 1. Header Information
- **Date:** [YYYY-MM-DD]
- **Recipient:** [Next Agent Name / CEO Review]
- **Task ID:** [VOS-XXX]

### 2. Summary
A brief description of what was implemented or changed.

### 3. Changed Files
A complete list of files that were created, modified, or deleted.

### 4. Strict Testing Instructions
Exact commands run and their results (pass/fail). The agent **MUST** provide strict, explicit instructions on how to test this feature to ensure it works. 
- If this is a UI task, provide instructions on what to click/look for in the browser.
- If this is a backend task, provide exact `curl` commands, SQL scripts, or test execution commands.
- Mr. Pink will use these instructions during the final audit.

### 5. Environment Variable Changes
Any new or modified environment variables, secrets, or configuration values introduced by this task.

### 6. API / Database Schema Changes
Any new endpoints, modified request/response shapes, or database migration files.

### 7. Notes for Next Agent
Clear instructions on what the **next agent** in the pipeline must do to continue the work. Reference specific files, functions, or contracts.

### 8. Evolution & Self-Healing (Rule 20)
**Mandatory:** List any rules (by number/title) that you amended or created during this task to prevent recurring errors.
- If no rules were updated, you MUST justify why no novel patterns or errors were encountered during the entire duration of the task. 
- "No changes needed" is an unacceptable justification if tool call retries or web research were required.

## Verification
Mr. Pink will audit every Handoff Letter against the PRD before the task can be marked "Done" on the Official Board (Plane).
