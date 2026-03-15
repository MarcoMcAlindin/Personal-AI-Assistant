# SENDOFF: VOS-029 — Cross-Platform Integration & E2E Test Suite

## To: Mr. Red (Cloud Intelligence & Automation Ops)
## From: Mr. Pink (Project Manager & Architectural Scout)
## Date: 2026-03-15

---

### PROVE IT ALL WORKS. EVERY PIPE. EVERY ENDPOINT.

Mr. Red, this is the final verification layer before Mr. Pink runs the ship audit (VOS-022). Build a lightweight E2E integration test suite that hits every deployed service and proves the full data path works: Frontend → Backend → Supabase → Qwen AI.

---

### Blockers

This is the last task before the final audit. **ALL of the following must be complete first:**
- VOS-023 (Qwen2.5-VL-7B deployed and live)
- VOS-024 (8AM health workflow verified)
- VOS-025 (Auth middleware live)
- VOS-026 (Tasks API live)
- VOS-027 (Health API live)

Do NOT start this until every upstream dependency is green.

---

### Your Mission: VOS-029 (E2E Test Suite)

**Branch:** `feature/red/29-e2e-tests`

### Create `/.github/workflows/integration-test.yml`

**Trigger:** `workflow_dispatch` (manual) + PRs to `main`.

### Test Cases

**All tests must use a real Supabase JWT** (generate a test token or use a service account).

#### 1. Backend Health Check
```bash
curl -s $BACKEND_URL/ | jq -e '.status == "VibeOS Gateway Online"'
```
- Must respond within 3 seconds (cold start tolerance).

#### 2. Auth Gate
```bash
# No token → must return 403
curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/api/v1/email/inbox
# Expected: 403

# Valid token → must NOT return 401/403
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/v1/email/inbox
# Expected: 200 or 500 (upstream), NOT 401/403
```

#### 3. Feed Pipeline
```bash
curl -s -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/v1/feeds/tech | jq -e '.articles | length > 0'
curl -s -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/v1/feeds/concerts
# Tech must return at least 1 article. Concerts may be empty (no events) but must not error.
```

#### 4. AI Chat Round-Trip
```bash
curl -s -X POST $BACKEND_URL/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"ping"}' | jq -e '.response | test("MOCK") | not'
```
- Response must NOT contain `[MOCK CONTEXT]` — this confirms Qwen2.5-VL-7B is live.
- Response must be non-empty.

#### 5. Task CRUD Cycle
```bash
# Create
TASK_ID=$(curl -s -X POST $BACKEND_URL/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Test Task"}' | jq -r '.id')

# Read
curl -s -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/v1/tasks | jq -e ".[] | select(.id == \"$TASK_ID\")"

# Delete (cleanup)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/v1/tasks/$TASK_ID
```

#### 6. Health Sync Write + Read
```bash
# Write
curl -s -X POST $BACKEND_URL/api/v1/health/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"heart_rate":72,"sleep_duration":7.5,"avg_heart_rate":68,"raw_watch_data":{},"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

# Read
curl -s -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/v1/health/metrics | jq -e '.[0].avg_heart_rate == 68'
```

#### 7. Water Logging
```bash
curl -s -X POST $BACKEND_URL/api/v1/health/water \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount_liters":0.25}'
```

### Environment Variables (GitHub Secrets)

| Variable | What |
|----------|------|
| `BACKEND_URL` | Deployed Cloud Run backend URL |
| `TEST_JWT_TOKEN` | A valid Supabase JWT for the test user |

### Definition of Done

- [ ] Workflow file created at `/.github/workflows/integration-test.yml`
- [ ] All 7 test cases pass on `workflow_dispatch`
- [ ] Workflow uses GitHub Secrets (no hardcoded URLs or tokens)
- [ ] Handoff includes screenshot of green workflow run
- [ ] Test failures produce clear error messages (not just exit code 1)

**If every pipe passes, the CEO ships. - Mr. Pink**
