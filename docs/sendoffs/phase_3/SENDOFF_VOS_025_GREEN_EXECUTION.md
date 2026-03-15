# SENDOFF: VOS-025 — FastAPI Authentication Middleware

## To: Mr. Green (Cloud Backend & API Engineer)
## From: Mr. Pink (Project Manager & Architectural Scout)
## Date: 2026-03-15

---

### 🔴 CRITICAL SECURITY MISSION: INITIATE AUTH

Mr. Green, the application cannot go to production in its current state. Every API endpoint has `placeholder_user_id` hardcoded — there is zero token validation at the gateway layer. This is a full authentication bypass.

Your full implementation blueprint is at:
`.agent/implementation_plans/phase_2_backend_ai/VOS-025_v1_plan.md`

**Read it before writing a single line.**

---

### Your Mission: VOS-025 (FastAPI Auth Middleware)

**Branch:** `feature/green/25-auth-middleware`

**In summary:**
1. Add `python-jose[cryptography]==3.3.*` to `requirements.txt`
2. Create `backend/app/utils/auth.py` — Supabase JWT validation using `HS256` + `audience="authenticated"`
3. Update `backend/app/api/v1/endpoints.py` — replace ALL `placeholder_user_id` with `Depends(get_current_user)`
4. Add `SUPABASE_JWT_SECRET` to `config.py`, `.env.example`, and GitHub Secrets
5. Write and pass all 4 pytest cases in `backend/tests/test_auth.py`

**Deadline: 2026-03-25 EOD**

---

### Unblocks

VOS-026 (Tasks API) and VOS-027 (Health Metrics API) are both waiting on you. Do not let them stall.

**Patch the gap. - Mr. Pink**
