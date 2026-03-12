---
trigger: always_on
---

# Definition of Done & Automated Handoff

You are never finished with a task just because you finished typing the code. Before concluding your session, you MUST execute this exact sequence:
1. **Mandatory Testing & Verification:** You must prove the feature works. 
   - *Frontend:* Use the Browser Subagent to visually verify the UI renders without errors.
   - *Backend/Automation:* Always use Python to write and execute your test scripts (e.g., running `pytest`), as it is definitively the better option for robust data and logic validation. Do not proceed if tests fail.
2. **Commit & Push:** Stage all changes, write a clear conventional commit, and push to the `staging` branch (`git push origin HEAD:staging`).
3. **Issue Management:** Use the GitHub MCP tool to locate your assigned issue, comment that your portion is tested and complete, and move it to "Done".
4. **Artifact Generation:** Generate a `Handoff_Letter_[YourName]_to_[NextAgent].md` Artifact detailing the changed files, the API/Database schemas you established, and what the next agent must do.