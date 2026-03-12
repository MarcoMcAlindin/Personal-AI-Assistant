---
trigger: always_on
---

# Plane Project Scope Enforcement

To maintain strict domain integrity and avoid data noise, you must exclusively interact with the "Personal AI Assistant" project within the Plane MCP environment.

## Mandatory Execution Steps
1. [cite_start]**Identify Project ID:** Before listing or updating any issues, you must first use the `list_projects` tool to find the unique ID associated with the project named "Personal AI Assistant".
2. **Strict Filtering:** Every subsequent MCP tool call (e.g., `list_issues`, `update_issue`) MUST include the `project_id` parameter for the "Personal AI Assistant" project.
3. [cite_start]**Color-Coded Routing:** Once inside the correct project, you must only claim tasks that match your assigned agent color as defined in the @Team.md file[cite: 110, 120, 129, 138]:
    - **Mr. [cite_start]Blue:** Blue/Frontend labels[cite: 110].
    - **Mr. [cite_start]Green:** Green/Backend labels[cite: 120].
    - **Mr. [cite_start]Red:** Red/DevOps/AI labels[cite: 129].
    - **Mr. [cite_start]White:** White/Database labels[cite: 138].

4. **Error Handling:** If the "Personal AI Assistant" project cannot be found, you must halt and notify the user immediately. Do not attempt to pull tasks from other projects.