# Playwright Agent Skills & Rules — Research Audit

*Mr. Mercenary — 2026-03-17*

## Community Skills Evaluated

| Skill / Repo | Stars | Approach | SuperCyan Fit | Verdict |
|---|---|---|---|---|
| **lackeyjb/playwright-skill** | 2k | Generic browser automation plugin for Claude Code marketplace | No monorepo awareness, no FastAPI/Supabase integration, writes scripts to `/tmp/` | **Pass** — good for ad-hoc browsing, not structured testing |
| **LambdaTest/agent-skills** | — | 46 production-grade skills, cloud-testing focused | Enterprise overhead, LambdaTest platform dependency, overkill for our scale | **Pass** — great reference material, wrong platform |
| **wico (qualiow-playwright-skills)** | — | CLI scaffolding tool (`npx wico-playwright-agent-skills init`) | Template-based, generates `.claude/skills/` boilerplate with placeholders | **Pass** — scaffolding, not actionable agent rules |
| **az9713/playwright-ui-testing** | — | 16 skills, 482 test cases, parallel subagents | Generic UX auditing (forms, a11y, responsive, links), not app-specific | **Partial** — `/test-a11y` and `/test-responsive` could supplement our custom skills |
| **0xfurai/claude-code-subagents** | — | Subagent definition (YAML frontmatter) | Playwright expert persona, but no project-specific patterns | **Pass** — too generic |
| **lst97/claude-code-sub-agents** | — | Test automator subagent with MCP tool declarations | Declares `mcp__playwright__*` tools, solid quality checklist | **Reference only** — useful for MCP integration later |
| **Playwright Test Agents (v1.56+)** | Official | Built-in Planner → Generator → Healer pipeline | Promising but requires Playwright 1.56+, GitHub Copilot-oriented | **Watch** — evaluate when stable |
| **Microsoft Playwright MCP** | Official | `@playwright/mcp` — accessibility snapshots, 25 tools | Token-efficient, deterministic, official | **Recommended addon** — `claude mcp add playwright npx @playwright/mcp@latest` |

## What We Built (Custom)

| Asset | Path | Purpose |
|---|---|---|
| **E2E Test Orchestrator** | `.agent/skills/playwright-e2e-test-orchestrator/SKILL.md` | Full E2E testing patterns: POM, fixtures, OLED theme validation, visual regression, a11y, mobile viewports, CI workflow |
| **API Test Runner** | `.agent/skills/playwright-api-test-runner/SKILL.md` | API-level testing via Playwright `request` fixture: all `/api/v1/` endpoints, SSE streaming, contract validation, seed+verify pattern |
| **Testing Standards Rule** | `.agent/rules/workflow-process/30-playwright-testing-standards.md` | Enforcement rule: locator priority, assertion rules, isolation, naming conventions, CI requirements, automatic audit fails |

## Why Custom Wins

1. **Stack-aware**: Knows `localhost:3000` (Vite), `localhost:8000` (FastAPI), Supabase, OLED palette hex values
2. **Agent-integrated**: Uses SuperCyan skill format (YAML frontmatter, Forbidden Patterns section, audit-ready)
3. **Monorepo-structured**: Separate `e2e/web/`, `e2e/mobile-web/`, `api/` directories matching our architecture
4. **Contract-driven**: API tests enforce the same Pydantic response shapes that Rule 05 mandates
5. **Theme-native**: Built-in OLED palette constants and CSS assertion helpers
6. **CI-ready**: GitHub Actions workflow template with both Node and Python setup

## Recommended Addon: Playwright MCP Server

For interactive debugging and exploratory testing, add the official MCP server:

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

This gives agents 25 browser tools (`browser_navigate`, `browser_click`, `browser_snapshot`, etc.) using accessibility snapshots instead of screenshots — far more token-efficient.

## Sources

- [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill)
- [LambdaTest/agent-skills](https://github.com/LambdaTest/agent-skills)
- [willcoliveira/qualiow-playwright-skills](https://github.com/willcoliveira/qualiow-playwright-skills)
- [az9713/playwright-ui-testing](https://github.com/az9713/playwright-ui-testing)
- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- [Playwright Test Agents Docs](https://playwright.dev/docs/test-agents)
- [0xfurai/claude-code-subagents](https://github.com/0xfurai/claude-code-subagents)
- [lst97/claude-code-sub-agents](https://github.com/lst97/claude-code-sub-agents)
