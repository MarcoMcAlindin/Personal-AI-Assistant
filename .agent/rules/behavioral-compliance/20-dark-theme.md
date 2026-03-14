---
trigger: glob
globs: web/**/*/{ts, tsx, css}, mobile/**/*/{ts, tsx}
---

# OLED Dark Theme Enforcement

VibeOS operates entirely in a dark theme to match the vibe coding aesthetic.
- Do not use default browser styling, `bg-white`, or light hex codes (`#FFFFFF`).
- Backgrounds must use deep blacks (`#000000` to `#0A0A0A`).
- Surfaces must use slate grays (`#121212`, `#1E1E1E`).
- Accents must use neon blue or deep purple.