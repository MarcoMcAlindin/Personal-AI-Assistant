# HANDOFF: VOS-024 — Verify 8:00 AM Health Analysis Workflow End-to-End

## 1. Header Information
- **Date:** 2026-03-17
- **From:** Mr. Red (Cloud Intelligence & Automation Ops)
- **Recipient:** Mr. Pink (Auditor) / CEO (Marco)
- **Task ID:** VOS-024
- **Branch:** `feature/red/024-health-analysis-e2e-verify`
- **PR:** #67 — open against `staging`

---

## 2. Summary

The health analysis pipeline was structurally broken and producing false-positive "successes." All 8:00 AM scheduled runs since deployment were executing `echo "Health analysis script placeholder"` — the actual Python script was never called. This PR replaces the placeholder with the real pipeline and removes a duplicate workflow file.

**Code work is complete. E2E verification is blocked on 3 missing GitHub Secrets.**

---

## 3. Root Cause Investigation

### What I Found
| File | State Before | State After |
|------|-------------|-------------|
| `.github/workflows/health_analysis.yml` | TODO placeholder — only `echo "..."` | Full pipeline: GCP auth + gcloud + `python vllm_deployment/scripts/analyze_health.py` |
| `.github/workflows/daily_health.yml` | Existed — duplicate `0 8 * * *` cron | Deleted |
| `vllm_deployment/scripts/analyze_health.py` | Hardcoded `"Qwen/Qwen3.5-9B-Instruct"` | Reads from `QWEN_MODEL_NAME` env var |

### False Positive History
GitHub Actions run history showed 2 "successful" scheduled runs:
- `23185955676` (2026-03-17 08:50 UTC)
- `23135416127` (2026-03-16 08:53 UTC)

Both ran from `main` branch which had the placeholder. Passed in ~20s because `echo` always exits 0. **No real health data was ever analyzed or written to Supabase.**

---

## 4. Changes Made

### `.github/workflows/health_analysis.yml`
- Added `timeout-minutes: 15`
- Added `google-github-actions/auth@v2` step with `credentials_json: ${{ secrets.GCP_SA_KEY }}`
- Added `google-github-actions/setup-gcloud@v2` step
- Changed `Install dependencies` to `pip install supabase httpx` (minimal, no backend bloat)
- Replaced TODO placeholder with `python vllm_deployment/scripts/analyze_health.py`
- Updated stale comment (Qwen2.5-VL-7B → Qwen3.5-9B-Instruct)

### `vllm_deployment/scripts/analyze_health.py`
- Line 61: `qwen_model_name = os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3.5-9B-Instruct")`
- Model name is now injected from the `QWEN_MODEL_NAME` GitHub Secret, with safe fallback

### `.github/workflows/daily_health.yml`
- Deleted. Was an orphaned duplicate triggering at the same `0 8 * * *` schedule. Would have caused double execution, double Supabase writes.

---

## 5. Verification Attempt

Manual trigger: `gh workflow run health_analysis.yml --ref staging`
Run ID: `23199900381`
Result: **FAILED** at "Authenticate to Google Cloud" step

```
google-github-actions/auth failed with: the GitHub Action workflow must specify exactly
one of "workload_identity_provider" or "credentials_json"
```

Root cause: `GCP_SA_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` secrets are not set.

---

## 6. CEO Action Required — GitHub Secrets

The following three secrets must be added at: `github.com/MarcoMcAlindin/Personal-AI-Assistant/settings/secrets/actions`

| Secret Name | Value Source | Purpose |
|-------------|-------------|---------|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | Supabase DB connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` key | Server-side DB writes (bypasses RLS) |
| `GCP_SA_KEY` | GCP Console → IAM & Admin → Service Accounts → Create Key (JSON) | gcloud auth for Cloud Run identity token |

**SA Requirements for `GCP_SA_KEY`:**
- Service account needs `roles/run.invoker` on the `vibeos-qwen` Cloud Run service (`europe-west1`)
- The `analyze_health.py` script calls `gcloud auth print-identity-token --audiences=<QWEN_ENDPOINT_URL>` to get a Bearer token for the IAM-protected vLLM endpoint

---

## 7. Definition of Done — Status

| Checkpoint | Status |
|-----------|--------|
| Code fixed and pushed | PASS |
| PR open (#67) | PASS |
| `health_analysis.yml` wired to real script | PASS |
| `0 8 * * *` cron schedule confirmed in YAML | PASS |
| `daily_health.yml` duplicate removed | PASS |
| `gh workflow run health_analysis.yml` completes successfully | BLOCKED — missing secrets |
| `health_metrics.ai_analysis` populated | BLOCKED — missing secrets |
| Cold-start timing logged | BLOCKED — missing secrets |
| GitHub Issue #28 commented | PASS |

---

## 8. Post-Secret Verification Steps (for Mr. Pink)

Once CEO adds the 3 secrets:

```bash
# Step 1: Trigger
gh workflow run health_analysis.yml --ref staging

# Step 2: Watch
gh run watch $(gh run list --workflow=health_analysis.yml --limit=1 --json databaseId -q '.[0].databaseId')

# Step 3: Verify Supabase write-back
# Expected: health_metrics row for yesterday has non-null ai_analysis text
```

---

*Mr. Red — Cloud Intelligence & Automation Ops*
*"The pipeline is wired. The gas pedal is ready. We just need the ignition key."*
