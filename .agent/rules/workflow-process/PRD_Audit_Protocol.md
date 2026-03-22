# PRD Audit Rule (Rule 31)

## Trigger
If more than 7 days have passed since the last modification of `docs/PRD.md`.

## Agent Action (Mr. Pink)
1. **Source of Truth Check:** Compare the current code state (web, mobile, backend) against the functional requirements in the PRD.
2. **Feature Parity:** Identify any "implemented" features that are not documented or any "documented" features that do not exist.
3. **Roadmap Sync:** Update the implementation roadmap (Phase 1-5) to reflect the current reality.
4. **Health Notification:** If automated processes (like health analysis) fail or are modified, ensure the PRD reflects the notification logic (e.g., notifying the user when old data is deleted or when a cold start occurs).
5. **Versioning:** Bump the internal document versioning if significant architectural changes have occurred.

## Verification
- Run `ls -l docs/PRD.md` to check modification time.
- Update the "Last Audited" timestamp in the PRD footer.
