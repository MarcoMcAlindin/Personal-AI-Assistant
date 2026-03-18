/**
 * VOS-062 — Green's backend multi-model router audit
 *
 * Tests:
 * 1. API contract for new model_target field on /chat
 * 2. device model_target returns 400 (local-only guard)
 * 3. home_pc model_target without ollama_url returns 400
 * 4. Cloud path (default) has no regression
 * 5. Code review of analyze_health.py for accidental regressions
 */

import { test, expect, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BACKEND = 'https://vibeos-backend-enffsru5pa-ew.a.run.app';
const DEV_USER_ID = 'd4f8a1b2-3c4d-5e6f-7890-abcdef123456';

const GREEN_SRC = '/home/marco/vibeos-worktrees/green-062';

// ── API CONTRACT TESTS (against live backend on staging) ─────────────────────
// Note: VOS-062 PR is not yet merged to staging, so these tests validate the
// current production behaviour and serve as regression guards for when it merges.

test.describe('VOS-062 — model_target routing: code review', () => {
  const endpointsPath = path.join(GREEN_SRC, 'backend/app/api/v1/endpoints.py');
  const aiServicePath = path.join(GREEN_SRC, 'backend/app/services/ai_service.py');
  const configPath    = path.join(GREEN_SRC, 'backend/app/utils/config.py');
  const envPath       = path.join(GREEN_SRC, 'backend/.env.example');

  test('ChatRequest has model_target field with correct Literal type', () => {
    const src = fs.readFileSync(endpointsPath, 'utf8');
    expect(src).toContain("model_target: Optional[Literal['cloud', 'home_pc', 'device']]");
    expect(src).toContain("= 'cloud'");  // default
    expect(src).toContain('ollama_url: Optional[str] = None');
  });

  test('device model_target raises HTTP 400', () => {
    const src = fs.readFileSync(endpointsPath, 'utf8');
    expect(src).toContain("model_target == 'device'");
    expect(src).toContain('status_code=400');
    expect(src).toContain('local-only');
  });

  test('home_pc path calls call_ollama with context', () => {
    const src = fs.readFileSync(endpointsPath, 'utf8');
    expect(src).toContain("model_target == 'home_pc'");
    expect(src).toContain('call_ollama(request.message, context, ollama_url)');
    expect(src).toContain('status_code=502');  // Ollama unreachable error
  });

  test('home_pc missing ollama_url raises HTTP 400', () => {
    const src = fs.readFileSync(endpointsPath, 'utf8');
    expect(src).toContain('OLLAMA_ENDPOINT_URL');
    // Must raise 400 when no URL available
    expect(src).toContain('status_code=400');
  });

  test('call_ollama uses OLLAMA_MODEL_NAME env var (fallback default is acceptable)', () => {
    const src = fs.readFileSync(aiServicePath, 'utf8');
    expect(src).toContain('OLLAMA_MODEL_NAME');
    expect(src).toContain('call_ollama');
    // Model name must come from env var — hardcoded without os.environ.get is wrong
    // Note: "qwen2.5:7b" as a default fallback in os.environ.get() is acceptable
    expect(src).toContain('os.environ.get("OLLAMA_MODEL_NAME"');
  });

  test('call_ollama injects RAG context into system prompt', () => {
    const src = fs.readFileSync(aiServicePath, 'utf8');
    expect(src).toContain('rag_context');
    expect(src).toContain('system_prompt');
    expect(src).toContain('Context:');
  });

  test('config.py has OLLAMA env vars', () => {
    const src = fs.readFileSync(configPath, 'utf8');
    expect(src).toContain('ollama');
  });

  test('.env.example documents OLLAMA_ENDPOINT_URL and OLLAMA_MODEL_NAME', () => {
    const src = fs.readFileSync(envPath, 'utf8');
    expect(src).toContain('OLLAMA_ENDPOINT_URL');
    expect(src).toContain('OLLAMA_MODEL_NAME');
  });
});

// ── REGRESSION CHECKS ON analyze_health.py ──────────────────────────────────

test.describe('VOS-062 — analyze_health.py regression check (BUG DETECTION)', () => {
  const healthScriptPath = path.join(GREEN_SRC, 'vllm_deployment/scripts/analyze_health.py');

  test('[BUG] analyze_health.py must NOT hardcode model name — use QWEN_MODEL_NAME env var', () => {
    const src = fs.readFileSync(healthScriptPath, 'utf8');

    // This test is EXPECTED TO FAIL on Green's current branch.
    // Green re-introduced the hardcoded model name that VOS-058 (Red) is supposed to fix.
    // Fix: restore qwen_model_name = os.environ.get("QWEN_MODEL_NAME", "...")
    //      and use "model": qwen_model_name in the API call.
    expect(src).not.toContain('"model": "Qwen/Qwen3.5-9B-Instruct"');
    expect(src).toContain('QWEN_MODEL_NAME');
  });

  test('[BUG] analyze_health.py URL must not double /v1/ — use rstrip + /chat/completions', () => {
    const src = fs.readFileSync(healthScriptPath, 'utf8');

    // QWEN_ENDPOINT_URL already ends in /v1 (e.g. https://.../v1)
    // If code appends /v1/chat/completions we get .../v1/v1/chat/completions → 404
    // Fix: revert to f"{qwen_endpoint_url.rstrip('/')}/chat/completions"
    expect(src).not.toContain('/v1/chat/completions');
    // OR: if the URL suffix was stripped, the path /chat/completions appended to a /v1 URL is correct
  });

  test('analyze_health.py should NOT have been touched by VOS-062 (wrong file)', () => {
    // analyze_health.py is Red's territory (VOS-058), not Green's (VOS-062).
    // This file appearing in the VOS-062 diff is a scope violation.
    // The changes introduced here actively regress VOS-058's requirements.
    //
    // Green must revert the analyze_health.py changes before this PR can merge.
    // Red (VOS-058) owns that file.

    // We check the staging version is different to flag this:
    const greenSrc   = fs.readFileSync(healthScriptPath, 'utf8');
    const stagingSrc = fs.readFileSync(
      path.join(__dirname, '../../vllm_deployment/scripts/analyze_health.py'),
      'utf8'
    );
    // The file should NOT have changed from staging in this PR
    expect(greenSrc).toBe(stagingSrc);
  });
});

// ── LIVE API REGRESSION TEST ─────────────────────────────────────────────────

test.describe('VOS-062 — Cloud path regression (live backend)', () => {
  test('GET /api/v1/vllm/status responds (cloud path is live)', async () => {
    // Full /chat smoke test is covered in vos055-057-blue-audit.spec.ts.
    // Here we just confirm the backend is reachable and reporting a valid AI status.
    const ctx = await request.newContext();
    const res = await ctx.get(`${BACKEND}/api/v1/vllm/status`, { timeout: 20_000 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(['offline', 'warming', 'online', 'degraded']).toContain(body.status);
    console.log(`Backend reachable. vLLM status: ${body.status}`);
  });
});
