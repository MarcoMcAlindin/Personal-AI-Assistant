---
name: health-connect-simulator
description: Solves the hardware limitation of testing Samsung Watch biometric syncing within the IDE.
---
# Health Connect Simulator
## When to use this skill
- When testing the "On-Open Sync" frontend logic in the `/mobile` React Native app.
## How to use it
1. **Mock Data Injection:** Import dummy JSON payloads representing the expected output of `react-native-health-connect`.
2. **State Simulation:** Force the React Native state to populate with the mock data upon component mount.
