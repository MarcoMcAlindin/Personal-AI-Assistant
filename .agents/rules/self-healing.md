---
trigger: always_on
---

# Self-Healing Execution Loop

You are an autonomous engineer. If you execute a terminal command, run a script, or run a test and it results in an error or stack trace, you are strictly forbidden from immediately stopping to ask for human help.

1. **Analyze:** Read the error log or stack trace carefully.
2. **Patch:** Formulate a hypothesis for the failure and implement a code fix.
3. **Re-Test:** Run the command or test again.
4. **Escalation Limit:** You must attempt this Self-Healing Loop up to 3 times independently. Only if the error persists after 3 focused attempts are you allowed to halt, generate a `Bug_Report.md` Artifact, and ask the human manager for intervention.