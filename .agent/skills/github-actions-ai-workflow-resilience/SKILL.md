---
name: github-actions-ai-workflow-resilience
description: Patterns for making GitHub Actions workflows that call vLLM/AI services resilient — proper env var usage, cold-start handling, failure visibility, and retry logic for LLM API calls from CI.
---

# GitHub Actions AI Workflow Resilience

## When to use this skill

- When a GitHub Actions workflow calls a vLLM or AI service and failures are silently swallowed
- When a workflow uses a hardcoded model name instead of reading from a secret/env var
- When a CI job shows ✅ success but the AI analysis step failed internally
- When modifying `vllm_deployment/scripts/analyze_health.py` or similar AI scripts

## The Patterns

### 1. Never Hardcode Model Names — Always Use Env Var

**Wrong:**
```python
"model": "Qwen/Qwen3.5-9B-Instruct",  # hardcoded — breaks on vLLM redeploy
```

**Correct:**
```python
model_name = os.environ.get("QWEN_MODEL_NAME")
if not model_name:
    print("ERROR: QWEN_MODEL_NAME env var not set")
    sys.exit(1)

# In the API call:
"model": model_name,
```

The workflow YAML must inject the secret:
```yaml
env:
  QWEN_MODEL_NAME: ${{ secrets.QWEN_MODEL_NAME }}
```

The GitHub Actions secret value must match exactly what vLLM reports in `/v1/models`. Confirm with:
```bash
TOKEN=$(gcloud auth print-identity-token --audiences=https://vibeos-qwen-599152061719.europe-west1.run.app)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://vibeos-qwen-599152061719.europe-west1.run.app/v1/models | python3 -m json.tool
# → note the "id" field in data[0]
```

### 2. Make AI Failures Visible — No Silent Pass

**Wrong (masks failures):**
```python
for user in users:
    try:
        result = call_ai(user)
        save(result)
    except Exception as e:
        print(f"Error: {e}")  # logs but continues — workflow exits 0
```

**Correct (fails loudly):**
```python
failed_users = []

for user in users:
    try:
        result = call_ai(user)
        save(result)
        print(f"Analysis complete for {user['user_id']}")
    except Exception as e:
        print(f"ERROR for user {user['user_id']}: {e}")
        failed_users.append(user['user_id'])

if failed_users:
    print(f"FAILED for {len(failed_users)} user(s): {failed_users}")
    sys.exit(1)  # Make the workflow step fail — visible in GitHub UI

print("All analyses complete.")
```

### 3. Cold-Start Retry Logic for Scale-to-Zero vLLM

The vLLM Cloud Run service scales to zero. When called by CI at 8 AM (after overnight idle), it may be cold. A 300s timeout handles the cold start, but a retry loop is safer:

```python
import time

def call_ai_with_retry(client, url, payload, headers, retries=3, backoff=[0, 30, 60]):
    """Call vLLM with retry for cold-start 503s."""
    last_error = None
    for attempt, delay in enumerate(backoff[:retries]):
        if delay > 0:
            print(f"Retry {attempt}/{retries - 1} after {delay}s...")
            time.sleep(delay)
        try:
            r = client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (503, 429):
                last_error = e
                continue  # Cold start or rate limit — retry
            raise  # 404, 401, etc. — don't retry
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            last_error = e
            continue
    raise RuntimeError(f"AI call failed after {retries} attempts: {last_error}")
```

### 4. Validate Required Env Vars at Script Start

```python
REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "QWEN_ENDPOINT_URL", "QWEN_MODEL_NAME"]

missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
if missing:
    print(f"Missing required env vars: {missing}")
    sys.exit(1)
```

Fail fast — don't waste 3 minutes of CI time discovering a missing secret late.

### 5. GCP Service Account Key Secret — Format Requirements

The `GCP_SA_KEY` secret must be the raw JSON content of the service account key file. Common failure modes:

| Symptom | Cause | Fix |
|---------|-------|-----|
| `failed to parse service account key JSON credentials: unexpected non-whitespace character after JSON` | Wrapped in quotes or extra whitespace | Paste raw JSON, no surrounding quotes |
| `permission denied` | SA key doesn't have `run.invoker` role on vLLM service | `gcloud run services add-iam-policy-binding vibeos-qwen --member serviceAccount:X --role roles/run.invoker` |

To validate a key locally before pasting into GitHub:
```bash
python3 -c "import json,sys; json.load(open('key.json'))"  # must print nothing
```

### 6. Workflow Dispatch for Manual Testing

Always add `workflow_dispatch` to any workflow that calls external AI services so you can test manually after fixes:

```yaml
on:
  schedule:
    - cron: '0 8 * * *'
  workflow_dispatch:  # manual trigger for testing
```

Test via:
```bash
gh workflow run health_analysis.yml --repo MarcoMcAlindin/Personal-AI-Assistant --ref staging
gh run watch --repo MarcoMcAlindin/Personal-AI-Assistant  # live tail
```

## Forbidden Patterns

- **Do NOT hardcode model names** in any script that calls vLLM — always `os.environ.get("QWEN_MODEL_NAME")`
- **Do NOT swallow exceptions silently** in AI calls — log and `sys.exit(1)`
- **Do NOT commit GCP service account keys** — they are secrets only
- **Do NOT set the workflow timeout below 15 minutes** — vLLM cold start can take 5+ minutes on the first call of the day
