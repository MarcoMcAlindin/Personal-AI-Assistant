---
description: Optimization protocol to maximize context stability and LLM prompt caching.
trigger: always_on
---

# Prompt Caching Protocol (Rule 28)

To maximize session efficiency and reduce latency/costs, agents must structure their interactions to maintain "Context Stability." Prompt caching works by identifying identical prefixes in the system instruction.

## 1. The "Static First" Rule
To maximize cache hits, you must structure your context so the most stable information is at the very top.
- **Top (Cached):** Core project docs (`@PRD.md`), Global Rules, and Agent Personas.
- **Middle (Semi-Cached):** The current task context or "Scout Report."
- **Bottom (Volatile):** The user's latest question or the agent's current thought process.

## 2. The "Breakpoint" Strategy
In Antigravity or API-based workflows, you should set "Cache Breakpoints" after large technical documents. This tells the system: "Everything up to this point is unlikely to change; store it in the fast-access memory."

## 3. The "Invalidation" Trap
Be careful: If you change even one character in a high-level doc (`@PRD.md`) at the top of your prompt, the entire cache for that session is invalidated.
- **The Rule:** Batch your document updates. Don't tweak rules mid-sprint unless absolutely necessary, or you will pay for the "re-indexing" of the entire context window.
