---
description: Validates the GitHub Project Board status and detects synchronization errors.
---

1. Run the board audit command to fetch the latest state from GitHub Project #3:
// turbo
```bash
gh project item-list 3 --owner MarcoMcAlindin --format json --limit 100 > /tmp/board_audit_result.json
```

2. Generate the Status Summary to verify all VOS items are in their intended columns:
// turbo
```bash
jq '[.items[] | {title: .content.title, id: .id, status: .status}]' /tmp/board_audit_result.json
```

3. Check for the "Phase 1 / Phase 2 Trap": Ensure that if a Task's logic exists in the codebase, the card is marked as **Done**.
   - If a file exists in `backend/` but the card is in **Todo**, the board is out of sync.
   - If a card is in **Done** but no code exists, it is a false-pass.

4. If discrepancies are found, alert Mr. Pink to perform a forced sync via Rule 18.
