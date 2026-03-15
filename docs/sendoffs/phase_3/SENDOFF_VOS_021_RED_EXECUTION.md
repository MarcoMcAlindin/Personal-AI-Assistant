# SENDOFF: VOS-021 — Finalize GitHub Actions CI/CD Pipeline

## To: Mr. Red (Cloud Intelligence & Automation Ops)
## From: Mr. Pink (Project Manager & Architectural Scout)
## Date: 2026-03-15
## Deadline: 2026-03-29 EOD

---

### AUTOMATE THE SHIP.

Mr. Red, the project has no CI/CD. Every deploy is a manual `bash deploy.sh`. Every PR merges without lint checks or tests. This task establishes the automated quality gate and deployment pipeline.

---

### Your Mission: VOS-021 (CI/CD Pipeline)

**Branch:** `feature/red/21-cicd-pipeline`

### Part 1 — CI Pipeline (`/.github/workflows/ci.yml`)

**Trigger:** Every Pull Request to `staging` and `main`.

**Steps:**

```yaml
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      # 1. Checkout
      - uses: actions/checkout@v4

      # 2. Web — lint + type check
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Web lint
        run: cd web && npm ci && npm run lint

      # 3. Mobile — lint
      - name: Mobile lint
        run: cd mobile && npm ci && npm run lint

      # 4. Backend — lint + test
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Backend lint + test
        run: |
          cd backend
          pip install -r requirements.txt
          pip install flake8 pytest
          flake8 app/ --max-line-length 120
          pytest tests/ -v
```

### Part 2 — CD Pipeline (`/.github/workflows/cd.yml`)

**Trigger:** Push to `main` only.

**Steps:**

```yaml
jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up gcloud
        uses: google-github-actions/setup-gcloud@v2

      - name: Deploy Backend to Cloud Run
        run: bash backend/deploy.sh

      - name: Deploy vLLM to Cloud Run
        run: bash vllm_deployment/deploy.sh
```

### Part 3 — Required GitHub Secrets

Verify these exist in the repository settings (Settings → Secrets → Actions):

| Secret | Purpose |
|--------|---------|
| `GCP_SA_KEY` | Service account JSON for Cloud Run deployments |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `QWEN_ENDPOINT_URL` | Live Cloud Run URL for Qwen2.5-VL-7B |
| `SUPABASE_JWT_SECRET` | JWT validation secret (VOS-025) |

### What NOT to Do

- Do NOT deploy the web app to Vercel/GitHub Pages yet — the web app runs locally or is served from Cloud Run behind the backend. Keep it simple.
- Do NOT add the integration test workflow here — that is VOS-029 (separate task).
- Do NOT modify the existing `daily_health.yml` — it already has GCP auth from your earlier work.

### Testing Instructions for Your Handoff

1. Open a test PR against `staging` — verify CI runs lint on web, mobile, and backend
2. If any lint/test fails, it should block the merge (require status checks)
3. For CD: push a commit to `main` (or simulate) and verify Cloud Run deployments trigger
4. Screenshot the GitHub Actions run summary showing green checks

**Automate the discipline. - Mr. Pink**
