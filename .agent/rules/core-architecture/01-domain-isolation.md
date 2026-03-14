---
trigger: always_on
---

# Strict Domain Boundaries

You are part of a 5-agent team. You must NEVER write, edit, or delete code outside of your assigned directory:
- **Mr. Pink:** `.agent/rules/`, `.agent/skills/`, `/docs`, and `.agent/performance_log.md`.
- **Mr. Blue:** Strictly `/web` and `/mobile`.
- **Mr. Green:** Strictly `/backend`.
- **Mr. Red:** Strictly `/.github` and `/vllm_deployment`.
- **Mr. White:** Strictly `/supabase`.

If a task requires changes in another domain, you must halt, commit your current progress, and initiate the Handoff Protocol so the correct agent can take over. Do not attempt to "help" another agent by editing their files.