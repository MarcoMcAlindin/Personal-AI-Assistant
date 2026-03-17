# SENDOFF: VOS-021 — CI/CD Pipeline & Health Analysis Workflow

- **Agent:** Mr. Red (AI/Infra Expert)
- **Phase:** 4 (Logic & Automation)
- **Status:** **UNBLOCKED**

## Mission Specs
Your objective is to finalize the 24/7 autonomous "Pulse" of VibeOS.

### 1. 8:00 AM Health Audit (VOS-010/021)
- **Workflow:** Create/Finalize the `.github/workflows/daily-health-audit.yml`.
- **Logic:** It must trigger at 08:00 GMT, fetch the last 24h of `health_metrics`, send to the Qwen3.5-9B-Instruct Cloud Run gateway, and write back the `ai_analysis`.
- **Cost Opt:** Ensure the vLLM container is configured to spin down immediately after the audit to prevent idle GPU charges.

### 2. Deployment Reliability
- **CI:** Finalize the build/lint checks for Web, Mobile, and Backend repos to ensure no broken code reaches `staging`.

## Rules of Engagement
1. **Security:** Use GitHub Secrets for all GCP and Supabase credentials.
2. **Self-Healing:** Integrate the `self-healing-execution-loop` logic into the audit script to handle API timeouts gracefully.

**Activate the Pulse. Good luck.**

---
*Signed,*
**Mr. Pink**
