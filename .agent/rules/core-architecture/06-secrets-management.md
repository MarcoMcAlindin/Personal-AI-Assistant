---
trigger: glob
globs: backend/**/*.py
---

# Zero-Trust Secrets

You are managing the secure gateway. You must NEVER hardcode API keys, Supabase URLs, or Gmail OAuth tokens directly into the Python files.
- Always retrieve credentials using `os.getenv()`.
- If a new environment variable is required, you must immediately document it in a `.env.example` file so the human manager knows to provision it in Google Cloud Run.