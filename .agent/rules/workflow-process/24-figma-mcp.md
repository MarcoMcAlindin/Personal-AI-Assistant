---
description: Rule for using the Figma MCP Server correctly with the VibeOS project files.
---

# Figma MCP Server Rule

When using the `figma` MCP server to inspect layouts, components, or design tokens for the VibeOS project, **you MUST ALWAYS use the correct `fileKey` based on the platform** you are working on:

### Mobile UI
For **React Native / Expo** mobile development:
```text
WT7LTMoVkHTA5l3mBUcFvd
```

### Web UI
For **React / Vite** web development:
```text
n2ukxdj5AakytJ5vhAXEu8
```

**Reasoning:**
The user's project spans both a web dashboard and a mobile app. These specific file keys point to the respective Figma documents where the source-of-truth layouts and UI elements reside.

**Tools Usage:**
When calling `mcp_figma_get_figma_data` or `mcp_figma_download_figma_images`, ensure you pass the correct `fileKey` parameter for the platform you are inspecting.
