---
name: self-healing-execution-loop
description: Guidelines for autonomous error recovery and stack trace analysis. Use when a terminal command, test script, or build process fails.
---

# Self-Healing Execution Loop

1. **Analyze & Patch:** Read the error log carefully, formulate a hypothesis, and implement a code fix.
2. **Escalation Limit:** Attempt to self-heal up to 3 times before halting and generating a Bug Report Artifact.