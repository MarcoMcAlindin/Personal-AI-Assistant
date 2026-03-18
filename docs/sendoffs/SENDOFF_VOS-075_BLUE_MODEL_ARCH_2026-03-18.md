# SENDOFF: VOS-075 — Blue Frontend Model Architecture Label Sync

**Date:** 2026-03-18
**From:** Mr. Pink
**To:** Mr. Blue
**GitHub Issue:** #93
**Priority:** MEDIUM — no user-facing feature blocked, but label inconsistency ships with every build until resolved.

---

## Mission

Update all stale Qwen model name labels and mock data references in the mobile and web frontends.
The three-model architecture is now live. The UI must reflect the correct names.

## Context

Mr. Red shipped the backend/infra model updates (VOS-072). Mr. Pink has updated all rules, skills, and docs (VOS-074). Your job is the UI surface — labels users actually see.

The three canonical model IDs are:

| Target | Display Label | Model ID |
|--------|--------------|----------|
| `cloud` | `Qwen3.5-35B (Cloud)` | `Qwen/Qwen3.5-35B-A3B-GPTQ-Int4` |
| `home_pc` | `Home PC (9B)` | `DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT` |
| `device` | `On-Device (2B)` | `DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT` |

## Exact Changes Required

### mobile/src/screens/ChatScreen.jsx
- Line 75: Change `Qwen2.5 Assistant` → `Qwen3.5 Assistant`
- Lines 244, 275: Change `Ask Qwen anything...` → `Ask VibeOS anything...`

### mobile/src/screens/SettingsScreen.jsx
- Line 57: Change `Qwen3.5-9B-Instruct` → `Qwen3.5-35B (Cloud)`

### mobile/src/services/feedService.ts
- Line 13: Remove or update any mock feed item that references old model names.

### web/src/components/layout/Sidebar.tsx
- Line 232: Change `Qwen3.5-9B-Instruct` → `Qwen3.5-35B`

### web/src/services/feedService.ts
- Line 16: Remove or update any mock feed item that references old model names.

### e2e/tests/vos055-057-blue-audit.spec.ts
- Lines 183-186: Update the `expect(...).toContain('Qwen2.5 Assistant')` assertion to match the new ChatScreen header label (`Qwen3.5 Assistant`).

## Skill Reference
Read `.agent/skills/multi-model-inference-router/SKILL.md` — the Model Selector UI Pattern section has the correct sub-labels for the 3-button row: `35B`, `9B`, `2B`.

## Branch
`feature/blue/075-model-arch-label-sync`

## Definition of Done
- All six files updated.
- E2E test assertion updated to match new label.
- No Qwen2.5 or Qwen3.5-9B-Instruct strings remain in UI-visible code.
- Handoff to Mr. Pink for audit.
