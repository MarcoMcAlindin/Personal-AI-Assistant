# HANDOFF: VOS-047/048/052 — vLLM Status Indicator + Native Android Build

## 1. Header Information
- **Date:** 2026-03-17
- **From:** Mr. Blue (Frontend/Mobile Architect)
- **Recipient:** Mr. Pink (Auditor)
- **Task IDs:** VOS-047, VOS-048, VOS-052
- **Branch:** `feature/blue/047-048-052-status-indicator-android-build`
- **PR:** https://github.com/MarcoMcAlindin/Personal-AI-Assistant/pull/66

---

## 2. Summary

All three CEO-directed tasks from the 2026-03-17 sendoff are complete in a single branch/PR.

- **VOS-047**: Web sidebar now has a live Qwen status chip replacing the hardcoded green dot. Polls `GET /vllm/status` every 15s. Renders red/yellow/green dot with label and a power button that fires `POST /vllm/warmup` when offline. Settings modal Qwen row reflects live status.
- **VOS-048**: Mobile Chat screen has a three-state `VllmStatusChip` (offline/warming/online) with tap-to-warmup. Settings screen gains a live Connections card. Both screens clean up their interval on unmount.
- **VOS-052**: `expo prebuild --platform android --clean` generated the `android/` native project (committed). Build scripts added to `package.json`. `build-android.sh` one-liner produces a debug APK and installs it on a connected device via ADB. No Expo tunnel required.

---

## 3. Key Files Modified / Created

| Action | File | Description |
|--------|------|-------------|
| CREATE | `web/src/services/vllmService.ts` | `fetchVllmStatus` + `triggerVllmWarmup` typed service |
| MODIFY | `web/src/components/layout/Sidebar.tsx` | Live Qwen chip with polling, power button, settings modal row |
| MODIFY | `web/src/components/layout/Sidebar.css` | Chip styles, pulse animation, spinner, offline color class |
| MODIFY | `mobile/src/services/api.js` | `fetchVllmStatus`, `triggerVllmWarmup`, `logWater` added |
| MODIFY | `mobile/src/screens/ChatScreen.jsx` | `VllmStatusChip` component + polling |
| MODIFY | `mobile/src/screens/SettingsScreen.jsx` | Live Connections card with Qwen row |
| CREATE | `mobile/android/` | Full native Android project from expo prebuild |
| CREATE | `mobile/android/app/google-services.json.example` | Placeholder template (real file gitignored) |
| MODIFY | `mobile/package.json` | `build:android:debug`, `build:android:release`, `install:android` scripts |
| CREATE | `mobile/build-android.sh` | End-to-end build + ADB install script |
| MODIFY | `mobile/.gitignore` | Tracks android/ project; excludes secrets and build output |
| CREATE | `docs/android-build.md` | Build reference guide |

---

## 4. Strict Testing Instructions

### VOS-047: Web Status Indicator
1. Start the backend (`uvicorn app.main:app --reload`).
2. Load the web app. Sidebar bottom-left should show **red chip** "Qwen: Offline" if vLLM is not running.
3. Click the power button — chip should transition to **yellow pulse** "Qwen: Warming Up...".
4. When vLLM comes online, chip should turn **green** "Qwen: Online". Power button goes dim/disabled.
5. Open Settings modal. Qwen row should mirror the same live state (no "Pending Deploy" text).
6. Collapse sidebar — only the dot is shown (no label), chip stays visible.

### VOS-048: Mobile Status Indicator
1. Launch app, navigate to **Chat** tab.
2. Status chip appears below the header. Verify red + "AI Offline" when backend unreachable.
3. Tap the chip when offline — transitions to yellow + "AI Warming Up...", tap disabled.
4. Verify green + "AI Online" when vLLM is up.
5. Navigate to **Settings** tab. Confirm Connections card shows live Qwen dot + label.
6. Navigate away from Chat and Settings — no memory leak (interval cleared).

### VOS-052: Native Android Build
1. Connect Samsung Galaxy via USB with USB debugging enabled.
2. `cd mobile && bash build-android.sh`
3. Verify APK builds at `android/app/build/outputs/apk/debug/app-debug.apk`.
4. Verify app installs and launches on device without Expo tunnel or QR code.
5. Alternatively: `npm run build:android:debug` then `npm run install:android`.

---

## 5. Environment Variable Changes
None. `google-services.json` (real) must be placed at `mobile/android/app/google-services.json` from secrets — see `google-services.json.example` for structure.

---

## 6. API / Database Schema Changes
None. Consumed existing VOS-046 endpoints: `GET /api/v1/vllm/status` and `POST /api/v1/vllm/warmup`.

---

## 7. Evolution & Self-Healing
- **Observation:** The polling pattern (15s interval + cleanup on unmount) is now established in both web and mobile. If future screens need status polling, this pattern should be extracted into a shared hook (`useVllmStatus`) rather than duplicated.
- **Action:** Deferred for now (only two consumers). If a third screen needs it, extract then.
