---
description: Provides a high-level snapshot of all agent activities and mission statuses.
---

1. Fetch the absolute current state of the Mission Board:
// turbo
```bash
gh project item-list 3 --owner MarcoMcAlindin --format json --limit 100 > /tmp/agent_sync_report.json
```

2. Generate the Agent Activity Matrix:
// turbo
```bash
jq -r '[.items[] | {title: .content.title, status: .status, assignee: (.content.title | capture("\\[(?<vos>VOS-\\d+)\\]\\[(?<agent>\\w+)\\]") | .agent)}] | group_by(.assignee) | .[] | {Agent: .[0].assignee, Tasks: [ .[] | {Title: .title, Status: .status} ]}' /tmp/agent_sync_report.json
```

3. Cross-reference with the Performance Log:
// turbo
```bash
cat "/home/marco/Personal AI Assistant/.agent/performance_log.md"
```

4. Summary Evaluation:
   - **Active:** Agents with cards in "In Progress".
   - **Waiting for Pink:** Agents with cards in "Mr. Pink Audit".
   - **On Standby:** Agents with no active "In Progress" cards (e.g., Mr. White after Phase 1).

5. Report Findings to the CEO using the Agent Identity Protocol.
