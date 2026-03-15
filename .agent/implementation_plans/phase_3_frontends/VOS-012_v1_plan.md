# Implementation Plan: Frontend Scaffolding Surge (VOS-012 & VOS-013)

This plan outlines the steps to initialize and structure the Web (React+Vite) and Mobile (Expo+React Native) applications for VibeOS, adhering to the strict OLED-optimized design system.

## Proposed Changes

### [Component] Git Hygiene
- Create feature branch: `feature/blue/14-frontend-scaffold` (combining VOS-012 and VOS-013 for efficiency as they are foundational).

---

### [Component] Web Client (`/web`)
#### [MODIFY] [index.css](file:///home/marco/Personal%20AI%20Assistant/web/src/index.css)
- Implement global OLED design tokens as CSS variables:
  - `--bg-primary: #000000;`
  - `--bg-secondary: #0d0d0d;`
  - `--accent-primary: #7b5ea7;`
  - `--text-primary: #f0f0f0;`
- Set global resets and body styles.

#### [NEW] Directory Structure
- Create `/web/src/components`, `/web/src/pages`, `/web/src/hooks`, `/web/src/services`.

#### [MODIFY] [App.tsx](file:///home/marco/Personal%20AI%20Assistant/web/src/App.tsx)
- Set up `react-router-dom` for navigation.
- Implement a basic Layout with the OLED theme.

---

### [Component] Mobile Client (`/mobile`)
#### [NEW] [theme.ts](file:///home/marco/Personal%20AI%20Assistant/mobile/src/theme.ts)
- Define shared design tokens for the React Native environment.

#### [NEW] Expo Router Structure
- Set up `/mobile/app/(tabs)` with placeholder screens for:
  - `index.tsx` (Dashboard)
  - `ai.tsx` (Chat)
  - `mail.tsx` (Inbox)
  - `health.tsx` (Wellness)
  - `plan.tsx` (Planner)

#### [NEW] Health Connect Simulator
- Create `/mobile/src/services/healthSimulator.ts` for dummy data injection.

---

## Verification Plan

### Automated Tests
- Run `npm run dev` in `/web` and verify it starts on port 5173.
- Run `npm run lint` in both `/web` and `/mobile` to ensure type/lint health.

### Manual Verification
- View `/web` in a browser to confirm the OLED background (#000000) and layout.
- Use `npx expo start` to verify the tab navigation structure on the emulator/device.
- Verify that the `oled-theme-enforcer` audit checklist is satisfied.
