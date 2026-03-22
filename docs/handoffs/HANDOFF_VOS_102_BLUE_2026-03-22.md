# HANDOFF: VOS-102 — Job Engine UI — Blue's Deliverables

## Header
- **Date:** 2026-03-22
- **From:** Mr. Blue (Frontend & Mobile Architect)
- **To:** Mr. Pink (Audit)
- **Task:** VOS-102 — Job Engine Hardening & Scraper Validation (Blue portion)
- **Branch:** `feature/blue/081-082-chat-markdown-rendering`
- **Commit:** `fbb29a3`

---

## Summary

Blue's scope within VOS-102 covers the presentation layer — how scraped job results are displayed across both clients. Three problems were fixed:

1. **HTML bleed-through in descriptions** — Scrapers return raw HTML (`<p>`, `<li>`, `<strong>`, etc.). These were rendering as visible tag strings in the UI. Fixed with `htmlToMarkdown()` which converts HTML to Markdown, then rendered via `ReactMarkdown` (web) and `react-native-markdown-display` (mobile). Both libraries were already installed.

2. **Full-width card layout** — Job results were stacked as single full-width rows, making descriptions hard to scan. Changed to a responsive 2-column (md) / 3-column (xl) grid of vertical document-shape cards on web. Each card is self-contained with a fixed 8-line description clamp.

3. **Source website visibility** — No indication of which job board each listing came from. Added a colour-coded source badge at the top-left of every card, visible without scrolling into the description.

---

## Files Changed

| File | Change |
|------|--------|
| `web/src/components/cyan/JobsView.tsx` | Grid layout, Markdown rendering, source badges, `htmlToMarkdown()` |
| `mobile/src/screens/JobsScreen.jsx` | Markdown rendering, source badges, `htmlToMarkdown()`, `markdownStyles` |
| `web/package.json` | Resolved merge conflict (staged full staging dependency list) |

---

## Source Badge Colour Map

| Source value | Display label | Colour |
|---|---|---|
| `weworkremotely` | We Work Remotely | Green `#4ade80` |
| `serper-linkedin` | LinkedIn | Blue `#60a5fa` |
| `proxycurl` | LinkedIn | Blue `#60a5fa` |
| `crustdata` | Crustdata | Purple `#c084fc` |
| (unknown) | Unknown | Muted `#BBC9CD` |

---

## Scope Boundary Note

The backend scraper validation (connectivity tests, `match_score` NULL check, Scrapfly/Crustdata API key verification) is **Green's scope**. This handoff covers the frontend display layer only.

---

## Definition of Done Checklist

- [x] `htmlToMarkdown()` strips all HTML tags and converts to clean Markdown
- [x] Web job cards render in 2-col (md) / 3-col (xl) grid, document-shaped
- [x] Web descriptions render via `ReactMarkdown` with GFM + sanitize
- [x] Mobile descriptions render via `react-native-markdown-display`
- [x] Source badge visible at top of every job card on both platforms
- [x] `npm run build` passes (web) — 0 errors
- [x] `npm run lint` passes (mobile) — 0 errors
- [x] Rule 32 `Modified:` comments added to all changed sections
