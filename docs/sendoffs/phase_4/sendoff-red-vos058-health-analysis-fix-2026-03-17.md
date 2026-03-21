# Sendoff Letter: Mr. Red — Fix Daily Health Analysis Workflow

**From:** Mr. Pink (Project Manager & Scout)
**To:** Mr. Red (Cloud Intelligence & Automation Ops)
**Date:** 2026-03-17
**Priority:** CRITICAL — daily health analysis has been silently failing; no AI analysis written to Supabase
**Issue:** VOS-058 — https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/73
**Skill:** `.agent/skills/github-actions-ai-workflow-resilience/SKILL.md`

---

## What Is Broken and Why

The `health_analysis.yml` daily workflow runs at 8:00 AM GMT, fetches Samsung Watch data from Supabase, and asks Qwen to write a health analysis back into the `health_metrics` table. This is how the `ai_analysis` field gets populated — the field that shows up on the Health Hub screen.

**Today every run that reached the Qwen call produced:**
```
Error during AI analysis for user 8b1203a5-...: Client error '404 Not Found'
for url 'https://supercyan-qwen-599152061719.../v1/chat/completions'
```

The workflow still exited with ✅ success because the exception was silently caught. No analysis was written to Supabase.

### Root Cause

`vllm_deployment/scripts/analyze_health.py` **line 64 hardcodes the model name:**

```python
# CURRENT (wrong):
"model": "Qwen/Qwen3.5-9B-Instruct",

# vLLM actually serves the model as "Qwen/Qwen3.5-9B" (confirmed via /v1/models)
# vLLM returns 404 when the requested model ID doesn't match the served ID
```

The workflow YAML already injects `QWEN_MODEL_NAME: ${{ secrets.QWEN_MODEL_NAME }}` into the environment — but the Python script never reads it. It ignores the env var entirely.

### Why This Affects Red Specifically

White's VOS-053 fix patches the `QWEN_MODEL_NAME` env var on the **Cloud Run backend** service. But the GitHub Actions workflow has its own separate `QWEN_MODEL_NAME` secret that also needs to be correct, AND the Python script needs to actually read it.

---

## Task Steps

### Step 1 — Prime your worktree

```bash
git worktree list
git worktree add /home/marco/supercyan-worktrees/red feature/red/058-health-analysis-fix
cd /home/marco/supercyan-worktrees/red
```

### Step 2 — Confirm the live model ID (same step as White)

```bash
TOKEN=$(gcloud auth print-identity-token \
  --audiences=https://supercyan-qwen-599152061719.europe-west1.run.app)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://supercyan-qwen-599152061719.europe-west1.run.app/v1/models" | python3 -m json.tool
```

Note the exact `id` value from `data[0]`. This is the string you need.

### Step 3 — Update `analyze_health.py`

**File:** `vllm_deployment/scripts/analyze_health.py`

**Change 1 — Add model name to env var validation (top of `analyze_health()`):**

```python
def analyze_health():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    qwen_endpoint_url = os.environ.get("QWEN_ENDPOINT_URL")
    qwen_model_name = os.environ.get("QWEN_MODEL_NAME")  # ADD THIS

    if not all([supabase_url, supabase_key, qwen_endpoint_url, qwen_model_name]):
        print(f"Missing environment variables. Got: SUPABASE_URL={'set' if supabase_url else 'MISSING'}, "
              f"SUPABASE_SERVICE_ROLE_KEY={'set' if supabase_key else 'MISSING'}, "
              f"QWEN_ENDPOINT_URL={'set' if qwen_endpoint_url else 'MISSING'}, "
              f"QWEN_MODEL_NAME={'set' if qwen_model_name else 'MISSING'}")
        sys.exit(1)
```

**Change 2 — Use env var in the API call (line 64):**

```python
# Before:
"model": "Qwen/Qwen3.5-9B-Instruct",

# After:
"model": qwen_model_name,
```

**Change 3 — Make failures visible with a failure counter:**

The current pattern swallows failures:
```python
except Exception as e:
    print(f"Error during AI analysis for user {user_id}: {e}")
# loop continues, script exits 0 — failure is invisible
```

Replace with a failure-tracking pattern:

```python
    failed_users = []

    for metrics in metrics_list:
        user_id = metrics["user_id"]
        record_id = metrics["id"]
        # ... (existing data_summary setup) ...

        print(f"Prompting Qwen for user: {user_id}")

        try:
            identity_token = get_identity_token(qwen_endpoint_url)
            with httpx.Client(timeout=300.0) as client:
                ai_response = client.post(
                    f"{qwen_endpoint_url}/v1/chat/completions",
                    json={
                        "model": qwen_model_name,   # <-- use variable, not hardcoded string
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Analyze this biometric data: {json.dumps(data_summary)}"}
                        ],
                        "max_tokens": 512,
                        "temperature": 0.7
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {identity_token}"
                    }
                )
                ai_response.raise_for_status()
                analysis_text = ai_response.json()["choices"][0]["message"]["content"]

                print(f"Analysis complete ({len(analysis_text)} chars). Updating record {record_id}")
                supabase.table("health_metrics").update({"ai_analysis": analysis_text}).eq("id", record_id).execute()
                print(f"Supabase updated for user {user_id}")

        except Exception as e:
            print(f"ERROR during AI analysis for user {user_id}: {e}")
            failed_users.append(user_id)

    # After the loop:
    if failed_users:
        print(f"WORKFLOW FAILED: AI analysis failed for {len(failed_users)} user(s): {failed_users}")
        sys.exit(1)

    print(f"All analyses complete. Processed {len(metrics_list)} user(s).")
```

### Step 4 — Update the GitHub Actions secret

Go to GitHub → Settings → Secrets → Actions → `QWEN_MODEL_NAME`.

Set its value to the exact model ID from Step 2 (e.g., `Qwen/Qwen3.5-9B`).

**Do NOT put quotes around it.** The raw string only.

### Step 5 — Verify the GCP_SA_KEY secret is valid

Earlier today two runs failed with:
```
failed to parse service account key JSON credentials: unexpected non-whitespace character after JSON
```

Check the secret is valid raw JSON:
```bash
# Download the SA key locally (if you have access) and validate:
python3 -c "import json,sys; json.load(sys.stdin)" < /path/to/key.json
# Must print nothing (no error)
```

If the secret is corrupted, re-paste the raw JSON content from the GCP Console (IAM → Service Accounts → your SA → Manage Keys → Add Key → JSON).

### Step 6 — Commit the code changes

```bash
git add vllm_deployment/scripts/analyze_health.py
git commit -m "[VOS-058][Red] fix: use QWEN_MODEL_NAME env var in analyze_health.py, fail loudly on AI errors"
```

### Step 7 — Test with manual workflow dispatch

```bash
gh workflow run health_analysis.yml \
  --repo MarcoMcAlindin/Personal-AI-Assistant \
  --ref feature/red/058-health-analysis-fix

# Watch live:
gh run watch --repo MarcoMcAlindin/Personal-AI-Assistant
```

Expected output in the run logs:
```
Fetching health metrics for: 2026-03-16
Prompting Qwen for user: 8b1203a5-...
Analysis complete (XXX chars). Updating record ...
Supabase updated for user 8b1203a5-...
All analyses complete. Processed 1 user(s).
```

### Step 8 — Verify the Supabase record was updated

After a successful run, check the `health_metrics` table:

```sql
SELECT date, ai_analysis, updated_at
FROM health_metrics
ORDER BY updated_at DESC
LIMIT 3;
```

The `ai_analysis` column must contain a non-null text string (the Qwen health analysis).

### Step 9 — Create PR

```bash
gh pr create --base staging \
  --title "[VOS-058][Red] Fix health analysis workflow — use QWEN_MODEL_NAME env var, fail loudly" \
  --body "Replaces hardcoded model name with QWEN_MODEL_NAME env var in analyze_health.py. Adds failure tracking so the workflow exits non-zero when AI analysis fails. Resolves daily silent failures."
```

---

## Acceptance Criteria

- [ ] `analyze_health.py` reads `QWEN_MODEL_NAME` from environment — no hardcoded model string
- [ ] Workflow exits non-zero (shows ❌ in GitHub UI) if ANY user's AI analysis fails
- [ ] `QWEN_MODEL_NAME` GitHub Actions secret updated to match live vLLM model ID
- [ ] Manual `workflow_dispatch` run completes with `All analyses complete` log line
- [ ] Supabase `health_metrics.ai_analysis` field contains real Qwen-generated text
- [ ] GCP_SA_KEY secret verified valid (auth step passes)

---

## Rules to Follow

- **Rule 30 (Git Worktree):** All changes in `feature/red/058-health-analysis-fix`. Never commit to `staging` directly.
- **Rule 06 (Secrets Management):** Do NOT commit any secret values — update via GitHub UI only.
- **Rule 16 (Self-Healing):** After this fix, add a note to `.agent/rules/` or update the skill if you find a new pattern of failure.
- **Rule 11 (Handoff Standard):** Include:
  1. The exact model ID from `/v1/models` (Step 2 output)
  2. Screenshot or log paste of the successful workflow run
  3. The Supabase SQL query result showing `ai_analysis` is populated

---

## Context: Why Your Fix Connects to White's

This is the same root cause as VOS-053 (White). Both fixes point at the same underlying truth: **the vLLM served model ID must be read from the live `/v1/models` endpoint, not assumed from the Dockerfile CMD.**

White patches the Cloud Run backend service env var.
You patch the GitHub Actions script and secret.

Once both are fixed:
- Mobile chat works (White)
- Daily automated health analysis works (you)
- The Health Hub AI Analysis card shows real Qwen text (downstream of your fix)

These must both land on `staging` before the Health Hub screen shows live AI analysis.

---

**Mr. Pink** — SuperCyan Project Manager & Scout
*Live evidence: GitHub Actions run 23200786475, job 67422195434*
*Audit doc: `docs/AUDIT_MOBILE_PINK_2026-03-17.md` — companion to B-01*
