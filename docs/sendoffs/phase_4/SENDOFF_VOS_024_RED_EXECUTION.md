# SENDOFF: VOS-024 — Verify 8:00 AM Health Analysis Workflow End-to-End

## Header
- **Date:** 2026-03-15
- **From:** Mr. Pink (Scout & Auditor)
- **To:** Mr. Red (Cloud Intelligence & Automation Ops)
- **Task:** VOS-024 — Verify 8:00 AM Health Analysis Workflow End-to-End
- **Branch:** `feature/red/24-health-workflow-e2e`
- **Priority:** HIGH — Unblocked today by VOS-023 approval

---

## Context

Your VOS-023 deployment just passed audit. The `vibeos-qwen` Cloud Run service is live and confirmed serving inference (`Pong!` smoke test, 2026-03-15). This means the health analysis pipeline has a working AI endpoint for the first time. Your job now is to prove the full chain works — from GitHub Actions trigger to Supabase write-back.

The model is `RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8`. The endpoint URL is set in GitHub Secrets. The `analyze_health.py` script was already updated in VOS-023. This task is pure verification — no new code should be needed unless something breaks.

---

## Mission

Execute the full end-to-end verification of the automated health analysis pipeline as specified in GitHub Issue #24.

### Step 1: Manual Trigger
```bash
gh workflow run health_analysis.yml
gh run watch
```
Confirm the run completes successfully (green check).

### Step 2: Verify Pipeline Stages
Confirm the workflow:
1. Connects to Supabase and fetches the most recent `health_metrics` row
2. Sends biometric data to `QWEN_ENDPOINT_URL/v1/chat/completions` with model `RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8`
3. Receives a valid AI analysis response
4. Writes the `ai_analysis` text back to the correct `health_metrics` row

### Step 3: Verify Supabase Write-Back
After the workflow completes, query Supabase directly:
```bash
# Use the Supabase client or REST API to confirm:
# SELECT ai_analysis FROM health_metrics ORDER BY created_at DESC LIMIT 1;
# Expected: Non-null text containing health analysis from Qwen
```

### Step 4: Cold Start Tolerance
The service may be scaled to zero when the Action fires. The 300s timeout in `analyze_health.py` should handle the ~15-30s cold start of the 7B model. Verify the workflow completes within the 15-minute `timeout-minutes` budget. Log actual elapsed time in your handoff.

### Step 5: Cron Schedule Confirmation
Confirm the `0 8 * * *` schedule is set in `.github/workflows/health_analysis.yml`. After 24 hours (tomorrow morning), check that an automated run fired at 8:00 AM GMT.

---

## Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/health_analysis.yml` | The workflow to trigger and verify |
| `vllm_deployment/scripts/analyze_health.py` | The script the workflow executes |
| `vllm_deployment/system_prompts/health_scout.md` | System prompt fed to Qwen for analysis |

---

## Definition of Done

- [ ] `gh workflow run health_analysis.yml` completes successfully (green check)
- [ ] Supabase `health_metrics.ai_analysis` column is populated with a valid Qwen response
- [ ] Workflow handles cold-start gracefully (log actual timing)
- [ ] `0 8 * * *` cron schedule is confirmed in the workflow YAML
- [ ] Handoff Letter submitted with evidence (workflow run URL, Supabase query result)
- [ ] Code committed and pushed (if any fixes were needed)
- [ ] Comment on GitHub Issue #24

---

## Environment

- **GitHub Secrets required:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `QWEN_ENDPOINT_URL`, `QWEN_MODEL_NAME`
- **Service URL:** `https://vibeos-qwen-599152061719.europe-west1.run.app`
- All secrets were confirmed set as of VOS-023 handoff (2026-03-15)

---

## Worktree Setup

```bash
# If worktree doesn't exist:
cd /home/marco/Personal\ AI\ Assistant
git worktree add /home/marco/vibeos-worktrees/red feature/red/24-health-workflow-e2e

# If it exists:
cd /home/marco/vibeos-worktrees/red
git pull origin feature/red/24-health-workflow-e2e
```

---

## Risk Notes

- If there are no rows in `health_metrics`, the script will `sys.exit(1)` — you may need to seed a test row
- If the cold start exceeds 300s (unlikely for 7B), increase the `httpx` timeout in `analyze_health.py`
- If the workflow fails on permissions, verify the GitHub Actions environment has the right secrets

---

*Mr. Pink — Scout & Auditor*
*"The endpoint is live. Prove the pipeline works."*
