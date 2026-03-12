---
name: fastapi-cors-shield
description: Strict CORS configuration for the FastAPI gateway.
---
# FastAPI CORS Shield
## When to use this skill
- When initializing the `FastAPI()` application instance in `main.py`.
## How to use it
1. **No Wildcards:** Never use `allow_origins=["*"]`. 
2. **Strict Allowed Origins:** Explicitly define the exact URLs of the Vite production build and Expo dev tunnels.
