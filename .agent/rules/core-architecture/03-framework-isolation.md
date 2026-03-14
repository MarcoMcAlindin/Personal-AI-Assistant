---
trigger: glob
globs: web/**, mobile/**
---

# React vs. React Native Syntax Isolation

You are managing two distinct decoupled frontends. You must never mix their syntaxes:
- When working in `/web` (Vite + React): Strictly use standard HTML elements (`<div>`, `<span>`, `<button>`). Do not import React Native components.
- When working in `/mobile` (Expo): Strictly use React Native core components (`<View>`, `<Text>`, `<TouchableOpacity>`). Do not use HTML tags.
- When handling health data on mobile, strictly enforce the "On-Open Sync" pattern to push data to Supabase immediately when the app enters the foreground.