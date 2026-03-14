---
trigger: always_on
---

# Definition of Done & Task Lifecycle

## 1. Mandatory Start (In Progress)
Before writing any code or performing research, you MUST:
1. Identify your assigned GitHub Issue.
2. Comment on the issue: "Starting work on [Issue ID] - [Agent Name]".
3. Move the issue to the **In Progress** column on the Project Board (if applicable) or add the `in-progress` label.

## 2. Pull Request Constraints (Jurisdiction Completion)
You are strictly forbidden from opening a Pull Request or marking a task as "Done" if your assigned work is incomplete.
- **Blocked by the User:** If you need the CEO (User) to perform an action (e.g., provide an access token, log into a service), you MUST halt execution and wait for their response. Do **not** open a PR for half-finished code.
- **Cross-Agent Dependencies:** If a full feature requires multiple agents (e.g., Mr. Green builds the API, Mr. Blue builds the UI), you **ARE ALLOWED** to open a PR for your portion of the work once *your specific jurisdiction* is 100% complete and fully tested. You have finished your jurisdiction; you do not wait for the next agent.

## 3. Mandatory Testing & Verification
You are never finished with a task just because you finished typing the code. Before concluding your session, you MUST execute this exact sequence:
1. **Verification:** You must prove the feature works. 
   - *Frontend:* Use the Browser Subagent to visually verify the UI renders without errors.
   - *Backend/Automation:* Always use Python to write and execute your test scripts (e.g., running `pytest`), as it is definitively the better option for robust data and logic validation. Do not proceed if tests fail.
2. **Commit & Push:** Stage all changes, write a clear conventional commit, and push to the ephemeral branch (`feature/<agent-color>/<issue-number>-<desc>`).
3. **Issue Management:** Use the GitHub MCP tool to locate your assigned issue, comment that your portion is tested and complete, and update the Project Board status.
4. **Artifact Generation:** Generate a technical plan and a handoff letter. Both MUST follow the naming convention in **Rule 21** (e.g., `VOS-001_v1_plan.md`) and you MUST **Export the artifact** to the appropriate phase-specific directories in `.agent/implementation_plans/` and `.agent/handoffs/` respectively.