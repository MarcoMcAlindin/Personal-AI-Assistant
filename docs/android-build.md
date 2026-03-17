# Android Native Build Guide

**Issue:** VOS-052
**Target:** Samsung Galaxy (direct APK install via ADB, no Expo tunnel)

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Expo CLI | 54+ |
| Android SDK | API 34+ (compileSdk 35 configured) |
| ADB | From Android SDK platform-tools |
| Java | 17+ (for Gradle) |

## Quick Start

```bash
cd mobile
bash build-android.sh
```

The script will:
1. Detect if `android/` exists; run `expo prebuild` if missing
2. Build a debug APK via `./gradlew assembleDebug`
3. Install on any connected ADB device automatically

## Manual Steps

### Build APK only

```bash
cd mobile
npm run build:android:debug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Install on device

```bash
npm run install:android
```

Requires a device connected via USB with USB debugging enabled.

### Release build

```bash
npm run build:android:release
```

Note: release builds require a signing keystore configured in `android/app/build.gradle`.

## Google Services Setup

A real `google-services.json` is required for Firebase/Auth features.

1. Copy the template: `android/app/google-services.json.example`
2. Fill in values from the Firebase Console
3. Save as `android/app/google-services.json` (this file is gitignored)

## Android Project Structure

```
mobile/android/
  app/
    build.gradle          — app-level build config (compileSdk 35)
    google-services.json.example
    src/main/
      AndroidManifest.xml — Health Connect permissions declared here
  build.gradle            — root build config
  settings.gradle         — Expo autolinking
  gradle.properties
```

## Health Connect

`react-native-health-connect` is declared as a dependency and is autolinked via Expo's autolinking system. The required permissions are declared in `AndroidManifest.xml` post-prebuild.

## Gitignore Policy

The `android/` native project is committed. The following are excluded:

- `android/app/google-services.json` — contains real Firebase keys
- `android/app/release/` — release signing artifacts
- `android/.gradle/` — Gradle cache
- `android/build/` — root build output
- `android/app/build/` — compiled APK output
