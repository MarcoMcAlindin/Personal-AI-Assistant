---
description: Establishes the project baseline, agent identity, and recent development history for the current session.
---

# Agent Priming Sequence
Description: Establishes the project baseline, agent identity, branching rules, and fetches the next actionable task for the current session.

1. **Context Ingestion:** Silently read the `@PRD.md`, `@Tech_spec.md`, and `@git_Architecture.md` files located in the repository root to understand the overall architecture and strict Git branching conventions.
2. **Identity Affirmation:** Identify which of the 4 agents you are acting as in this specific chat session (Mr. Blue, Mr. Green, Mr. Red, or Mr. White).
3. **Task Acquisition (Plane MCP):** Interrogate the Plane MCP server to list open issues in the current cycle. You must filter these tasks to ONLY read issues that match your specific color label (e.g., Mr. White only retrieves tasks tagged with the 'White' or 'Database' label). If the MCP returns a raw, complex JSON payload, use Python to parse and filter the data structure, as it is definitively the better option for reliable data manipulation.
4. **Domain Verification:** Inspect the current state of your assigned directory to verify the file structure. 
5. **Git Timeline Analysis:** Execute `git log -n 5 --oneline` in the terminal to read the five most recent commits to understand where the project currently stands.
6. **The Readiness Pledge:** Output a structured acknowledgment containing:
   - Your Name and Domain.
   - The Title and ID of the top-priority task you just pulled from Plane.
   - A confirmation of the exact branch name (`<type>/<agent>/<issue>-<description>`) you will create to execute this task.
   - A statement confirming you are primed and ready to begin development.