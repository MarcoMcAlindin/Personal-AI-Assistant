---
name: pink-performance-audit
description: Maintains the performance_log.md to track agent task attempts and CEO approval history.
---

# Pink Performance Audit

## Purpose
Track every agent's task completion attempts and their outcomes. This creates an accountability record that Mr. Pink uses to identify patterns, recurring failures, and agent reliability.

## File Location
`.agent/performance_log.md`

## When to Log
Record an entry whenever:
1. An agent submits a Handoff Letter for a completed task.
2. Mr. Pink reviews and either approves or rejects the work.
3. The CEO provides final approval or requests changes.

## Logging Procedure

### 1. Identify the Task
- Find the GitHub Issue ID (or Plane task ID) for the completed work.
- Identify which agent performed the work.

### 2. Record the Attempt
Add a new row to the performance log table:

```markdown
| Agent | Task ID | Attempt # | Result | CEO Approval |
|-------|---------|-----------|--------|--------------|
| Mr. Green | #42 | 1 | Pass | Confirmed |
```

- **Attempt #:** Increment for each re-submission of the same task.
- **Result:** `Pass` if the Handoff Letter meets PRD requirements, `Fail` if it doesn't.
- **CEO Approval:** `Confirmed` after CEO sign-off, `Pending` until then, `Rejected` if sent back.

### 3. Trend Analysis
Periodically (every 5 tasks or upon CEO request), summarize:
- Per-agent pass rate (attempts vs. passes).
- Common failure patterns (missing tests, incomplete handoffs, etc.).
- Recommendations for process improvements.

## Constraints
- **Objectivity:** Log results factually. No subjective commentary on agent performance.
- **Completeness:** Every task attempt must be logged - no exceptions.
