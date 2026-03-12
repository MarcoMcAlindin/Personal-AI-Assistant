---
description: Validates the entire VibeOS architecture before a pull request.
---



1. Run the `pytest` suite in the `/cloud_backend` directory to verify the FastAPI routes and Python parsers.
2. Run `npm run build` in the `/web` directory to ensure the Vite multi-pane layout compiles without TypeScript errors.
3. Run `npx expo export` in the `/mobile` directory to ensure the React Native app bundles successfully.
4. If any step fails, halt the workflow immediately and generate a `System_Failure_Report.md` Artifact detailing the exact stack trace.