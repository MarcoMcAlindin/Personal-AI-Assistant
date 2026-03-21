#!/usr/bin/env bash
# SuperCyan — Native Android Build Script
# Produces a debug APK and installs it on a connected device via ADB.
# No Expo tunnel or QR code required.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Ensure native android/ directory exists
if [ ! -d "android" ]; then
  echo ">>> android/ not found — running expo prebuild..."
  npx expo prebuild --platform android --clean
fi

# Step 2: Build debug APK (Gradle bundles JS automatically via expo export:embed)
echo ">>> Building debug APK..."
cd android
./gradlew assembleDebug
cd ..

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

# Step 3: Install on connected device
if command -v adb &>/dev/null && adb devices | grep -q "device$"; then
  echo ">>> Installing APK on connected device..."
  adb install -r "$APK_PATH"
  echo ">>> Done. SuperCyan is installed."
else
  echo ">>> No ADB device found. APK is at: $APK_PATH"
  echo "    Connect a device and run: adb install -r $APK_PATH"
fi
