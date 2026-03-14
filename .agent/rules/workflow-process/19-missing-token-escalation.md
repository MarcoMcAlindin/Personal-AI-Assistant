---
description: Mandates immediate escalation to the CEO if an access token or API key is missing.
trigger: always_on
---

# Immedite Token Escalation (Rule 19)

To prevent agents from getting stuck in loops or attempting impossible workarounds, all agents must strictly follow this protocol whenever an authentication error occurs.

## 1. Zero-Workaround Policy
If you encounter a warning, an error log, or a debug message stating that an **Access Token**, **API Key**, or **Authentication Credential** is missing, invalid, or expired:
- **DO NOT** attempt to bypass the authentication.
- **DO NOT** search the codebase to "find" a token that isn't there.
- **DO NOT** try to mock the API response unless explicitly instructed to do so for a test.

## 2. Immediate CEO Escalation
The moment a missing token is detected, you **MUST immediately halt execution and ask the CEO** (the user) to provide it or configure it. 

Provide the CEO with:
1. The exact name of the required token (e.g., `GITHUB_PERSONAL_ACCESS_TOKEN`, `OPENAI_API_KEY`).
2. Where it needs to be placed (e.g., in `.env`, in `mcp_config.json`, or exported in the terminal).
3. The specific error message that triggered the halt.

By escalating immediately, we save compute cycles and ensure the environment is securely configured by the human owner before proceeding.
