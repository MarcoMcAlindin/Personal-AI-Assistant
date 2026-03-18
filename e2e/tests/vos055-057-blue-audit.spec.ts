/**
 * VOS-055/056/057 — Blue's mobile UI alignment audit
 *
 * These tests validate:
 * 1. The backend /health API returns the shape Blue's fix (VOS-056) relies on
 * 2. No hardcoded values leak into the live health data
 * 3. The /chat API still works (smoke test for VOS-057 chat header regression)
 * 4. The web app renders Health and Chat screens without crashes
 *
 * Blue's changes are on the native mobile app (React Native) which cannot be
 * tested with Playwright directly. These tests verify the API contracts and
 * web equivalents.
 */

import { test, expect, request } from '@playwright/test';

const BACKEND = 'https://vibeos-backend-enffsru5pa-ew.a.run.app';
const DEV_USER_ID = 'd4f8a1b2-3c4d-5e6f-7890-abcdef123456';

// ── API CONTRACT TESTS ────────────────────────────────────────────────────────

test.describe('VOS-056 — Backend /health API contract', () => {
  test('GET /api/v1/health returns { metrics: [...] } shape', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${BACKEND}/api/v1/health`, {
      headers: { 'x-user-id': DEV_USER_ID },
      timeout: 15_000,
    });

    // Must respond (even if empty data)
    expect(res.status()).toBeLessThan(500);

    if (res.status() === 200) {
      const body = await res.json();

      // Blue's fix reads result?.metrics?.[0] — the key must be "metrics", not bare array
      expect(body).toHaveProperty('metrics');
      expect(Array.isArray(body.metrics)).toBe(true);

      if (body.metrics.length > 0) {
        const first = body.metrics[0];

        // Fields that Blue's screen reads
        expect(typeof first.date).toBe('string');
        // sleep_duration and avg_heart_rate may be null if no watch data
        expect('sleep_duration' in first).toBe(true);
        expect('avg_heart_rate' in first).toBe(true);

        // raw_watch_data is the JSONB field for Deep Sleep / REM
        // Blue reads: raw_watch_data?.deep_sleep_hours and raw_watch_data?.rem_sleep_hours
        expect('raw_watch_data' in first).toBe(true);

        // If raw_watch_data is populated, verify it's an object
        if (first.raw_watch_data !== null) {
          expect(typeof first.raw_watch_data).toBe('object');
        }

        // Verify no hardcoded fixtures leak — "1h 48m" or "1h 32m" should never
        // appear as a raw value in the API response
        const bodyStr = JSON.stringify(body);
        expect(bodyStr).not.toContain('1h 48m');
        expect(bodyStr).not.toContain('1h 32m');
        expect(bodyStr).not.toContain('+18m');
        expect(bodyStr).not.toContain('+12%');
        expect(bodyStr).not.toContain('+5%');
      }
    }
  });

  test('GET /api/v1/health without auth returns 401 or 200 in dev mode', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${BACKEND}/api/v1/health`, { timeout: 10_000 });
    // Must not 500 — 401/403/404 (auth/routing) or 200 (dev mode bypass) all acceptable
    expect(res.status()).not.toBe(500);
  });
});

test.describe('VOS-057 — Backend /chat API smoke test', () => {
  test('POST /api/v1/chat returns { response: string } shape', async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${BACKEND}/api/v1/chat`, {
      data: { message: 'Say "OK" and nothing else.', user_id: DEV_USER_ID },
      headers: { 'Content-Type': 'application/json' },
      timeout: 60_000,  // vLLM may cold-start
    });

    // Accept any non-5xx (including 401/403 if auth required in prod)
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('response');
      expect(typeof body.response).toBe('string');
      expect(body.response.length).toBeGreaterThan(0);
    } else {
      // Non-200 is acceptable — just must not be 500
      expect(res.status()).not.toBe(500);
    }
  });
});

test.describe('VOS-054 — /vllm/status endpoint', () => {
  test('GET /api/v1/vllm/status returns valid status field', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${BACKEND}/api/v1/vllm/status`, { timeout: 20_000 });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('status');
    // Valid states: offline, warming, online, degraded
    expect(['offline', 'warming', 'online', 'degraded']).toContain(body.status);

    console.log(`vLLM status: ${body.status}, model: ${body.model ?? 'unknown'}`);
  });
});

// ── CODE REVIEW ASSERTIONS (static) ─────────────────────────────────────────
// These read the source files directly to assert correctness of Blue's changes
// They run in the Playwright test runner for unified reporting

import * as fs from 'fs';
import * as path from 'path';

// Point at Blue's worktree where the fixes live
const MOBILE_SRC = path.join('/home/marco/vibeos-worktrees/blue/mobile/src');
const BRANCH_HEALTH = path.join(MOBILE_SRC, 'screens/HealthScreen.jsx');
const BRANCH_CHAT = path.join(MOBILE_SRC, 'screens/ChatScreen.jsx');
const BRANCH_PLANNER = path.join(MOBILE_SRC, 'screens/PlannerScreen.jsx');
const BRANCH_EMAIL = path.join(MOBILE_SRC, 'screens/EmailScreen.jsx');
const BRANCH_TABS = path.join(MOBILE_SRC, 'navigation/TabNavigator.jsx');

test.describe('VOS-055 — Tab Icons: code review', () => {
  test('TabNavigator uses Ionicons, not emoji Text', () => {
    // Note: tests run against the checked-out branch (staging or Blue's branch)
    // Pass/fail depends on which branch is active in the worktree
    const src = fs.readFileSync(BRANCH_TABS, 'utf8');
    expect(src).toContain('Ionicons');
    expect(src).toContain('@expo/vector-icons');
    // Must not use the old emoji approach
    expect(src).not.toContain("tabIcon('📅')");
    expect(src).not.toContain("tabIcon('📰')");
    expect(src).not.toContain("tabIcon('💬')");
  });

  test('TabNavigator has active dot indicator', () => {
    const src = fs.readFileSync(BRANCH_TABS, 'utf8');
    // Active dot: small View with accentPrimary background
    expect(src).toContain('accentPrimary');
    expect(src).toContain('borderRadius: 2');
  });
});

test.describe('VOS-056 — Health Screen: code review', () => {
  test('HealthScreen reads result.metrics[0] not bare result', () => {
    const src = fs.readFileSync(BRANCH_HEALTH, 'utf8');
    expect(src).toContain('metrics?.[0]');
    expect(src).not.toContain('setData(result)');
  });

  test('HealthScreen has no hardcoded Deep Sleep / REM values', () => {
    const src = fs.readFileSync(BRANCH_HEALTH, 'utf8');
    expect(src).not.toContain('"1h 48m"');
    expect(src).not.toContain('"1h 32m"');
    expect(src).not.toContain("'+18m'");
    expect(src).not.toContain("'+12%'");
    expect(src).not.toContain("'+5%'");
  });

  test('HealthScreen reads deep_sleep_hours and rem_sleep_hours from raw_watch_data', () => {
    const src = fs.readFileSync(BRANCH_HEALTH, 'utf8');
    expect(src).toContain('deep_sleep_hours');
    expect(src).toContain('rem_sleep_hours');
    expect(src).toContain('raw_watch_data');
  });

  test('MetricCard delta guard uses != null (not !== undefined)', () => {
    const src = fs.readFileSync(BRANCH_HEALTH, 'utf8');
    // Strict null check: should be != null to catch both null and undefined
    expect(src).toContain('!= null');
  });
});

test.describe('VOS-057 — Chat / Planner / Email: code review', () => {
  test('ChatScreen header shows Qwen2.5 Assistant not old model name', () => {
    const src = fs.readFileSync(BRANCH_CHAT, 'utf8');
    expect(src).toContain('Qwen2.5 Assistant');
    expect(src).not.toContain('Qwen3.5-9B-Instruct Assistant');
  });

  test('PlannerScreen subtitle has no explicit newline in Auto-archives', () => {
    const src = fs.readFileSync(BRANCH_PLANNER, 'utf8');
    // Old code had Auto-{'\n'}archives — new code should be one string
    expect(src).not.toContain("Auto-{'\\n'}archives");
    expect(src).toContain('Auto-archives at midnight');
  });

  test('EmailScreen compose button has onPress handler', () => {
    const src = fs.readFileSync(BRANCH_EMAIL, 'utf8');
    expect(src).toContain("Alert.alert('Coming Soon'");
    expect(src).toContain('import');
    expect(src).toContain('Alert');
  });
});
