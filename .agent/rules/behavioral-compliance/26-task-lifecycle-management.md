---
description: Governs the mandatory transition of tasks through the GitHub Project Board.
---

# Task Lifecycle Management (Project Board Hygiene)

All implementation agents (Blue, Green, Red, White) must strictly manage the state of their assigned tasks to ensure the CEO has real-time visibility into development velocity.

## 1. Task States

| State | Agent Action | Definition |
|---|---|---|
| **To Do** | None | The task has been created and assigned but work has not begun. |
| **In Progress** | `update_issue` | Transitioned as soon as an agent begins research or coding (Rule 10). |
| **Verification** | `update_issue` | Work is complete but awaiting automated/manual verification (Rule 10). |
| **Done** | `update_issue` | Verified, committed, pushed, Handoff Letter created, and AUDIT.md filed. |

## 2. GitHub Issue Interaction
When moving a task from **To Do** to **In Progress**, the agent MUST use the GitHub MCP tool and GraphQL as follows:

1. **GitHub Issue:** Add a comment (`add_issue_comment`) signed with your name and set labels (`update_issue`).
2. **Project Board:** Update the ProjectV2 item status field.

### Project Board Automation IDs
- **Project ID:** `PVT_kwHOBbRvPs4BRsYm`
- **Status Field ID:** `PVTSSF_lAHOBbRvPs4BRsYmzg_cna0`
- **Option IDs:**
  - Todo: `f75ad846`
  - In Progress: `47fc9ee4`
  - Done: `98236657`

Agents should use `curl` with the GraphQL endpoint to move cards:
```bash
mutation { 
  updateProjectV2ItemFieldValue(input: { 
    projectId: "PVT_kwHOBbRvPs4BRsYm", 
    itemId: "ITEM_ID", 
    fieldId: "PVTSSF_lAHOBbRvPs4BRsYmzg_cna0", 
    value: { singleSelectOptionId: "OPTION_ID" } 
  }) { projectV2Item { id } }
}
```

## 3. Finalization
A task is only "Done" when the Handoff Letter is generated and the GitHub issue is commented with the link to the verification proof.
