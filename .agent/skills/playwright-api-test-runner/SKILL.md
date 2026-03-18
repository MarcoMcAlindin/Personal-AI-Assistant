---
name: playwright-api-test-runner
description: API-level testing patterns for the VibeOS FastAPI backend using Playwright's request fixture — covers all /api/v1/ endpoints, SSE streaming validation, and database seeding without a browser.
---

# Playwright API Test Runner

## When to use this skill

- When testing FastAPI backend endpoints without needing a browser
- When validating API contracts (request/response shapes) match frontend expectations
- When testing SSE streaming from the `/chat` endpoint
- When seeding test data via API before running E2E tests
- When Mr. Green or Mr. Red needs to verify backend changes independently

## Why Playwright for API Testing

Playwright's `request` fixture provides:
- Built-in retry and timeout handling
- Shared cookie/auth state with browser tests
- Same config, same CI pipeline — no separate test framework
- Can mix API calls with browser tests (seed via API, verify via UI)

## API Test Structure

```
tests/api/
├── chat.api.spec.ts        # POST /chat, PATCH /chat/save/:id
├── feeds.api.spec.ts       # GET /feeds/tech, GET /feeds/concerts
├── email.api.spec.ts       # GET /email/inbox, POST /email/send
├── health.api.spec.ts      # GET /health
├── tasks.api.spec.ts       # GET/POST /tasks, PATCH /tasks/:id
└── vllm-status.api.spec.ts # GET /vllm/status
```

## Test Patterns

### Basic GET Endpoint

```typescript
// tests/api/feeds.api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feeds API', () => {
  test('GET /feeds/tech returns RSS articles', async ({ request }) => {
    const response = await request.get('/api/v1/feeds/tech');

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('articles');
    expect(Array.isArray(body.articles)).toBe(true);

    if (body.articles.length > 0) {
      const article = body.articles[0];
      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('url');
      expect(article).toHaveProperty('source');
    }
  });

  test('GET /feeds/concerts returns Scottish metal events', async ({ request }) => {
    const response = await request.get('/api/v1/feeds/concerts');

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });
});
```

### POST with JSON Body

```typescript
// tests/api/tasks.api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tasks API', () => {
  test('POST /tasks creates a new task', async ({ request }) => {
    const response = await request.post('/api/v1/tasks', {
      data: {
        title: 'E2E Test Task',
        description: 'Created by Playwright API test',
        priority: 'medium',
      },
    });

    expect(response.status()).toBe(201);
    const task = await response.json();

    expect(task).toMatchObject({
      title: 'E2E Test Task',
      priority: 'medium',
    });
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('created_at');
  });

  test('PATCH /tasks/:id updates a task', async ({ request }) => {
    // Seed
    const created = await request.post('/api/v1/tasks', {
      data: { title: 'Update Me', priority: 'low' },
    });
    const { id } = await created.json();

    // Act
    const response = await request.patch(`/api/v1/tasks/${id}`, {
      data: { priority: 'high' },
    });

    expect(response.status()).toBe(200);
    const updated = await response.json();
    expect(updated.priority).toBe('high');
  });

  test('GET /tasks returns task list', async ({ request }) => {
    const response = await request.get('/api/v1/tasks');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.tasks ?? body)).toBe(true);
  });
});
```

### vLLM Status Probe

```typescript
// tests/api/vllm-status.api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('vLLM Status API', () => {
  test('GET /vllm/status returns valid status shape', async ({ request }) => {
    const response = await request.get('/api/v1/vllm/status');

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Status must be one of the known states
    expect(['offline', 'warming', 'online', 'degraded']).toContain(body.status);
    expect(body).toHaveProperty('model');
    expect(body).toHaveProperty('latency_ms');
    expect(typeof body.latency_ms).toBe('number');
  });

  test('status latency is reasonable (<15s)', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/v1/vllm/status');
    const elapsed = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(15_000);
  });
});
```

### SSE Streaming Validation

```typescript
// tests/api/chat.api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat API', () => {
  test('POST /chat returns SSE stream', async ({ request }) => {
    const response = await request.post('/api/v1/chat', {
      data: {
        message: 'Say hello in one word',
        user_id: 'test-user',
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/event-stream');

    const text = await response.text();

    // SSE format: lines starting with "data: "
    const dataLines = text.split('\n').filter(line => line.startsWith('data: '));
    expect(dataLines.length).toBeGreaterThan(0);

    // Last data line should be [DONE]
    const lastData = dataLines[dataLines.length - 1];
    expect(lastData).toBe('data: [DONE]');
  });

  test('PATCH /chat/save/:id pins a response', async ({ request }) => {
    // Assumes a chat_history row exists — seed via direct API or use a known ID
    const response = await request.patch('/api/v1/chat/save/test-chat-id', {
      data: { is_saved: true },
    });

    // Accept 200 (success) or 404 (test ID doesn't exist in this env)
    expect([200, 404]).toContain(response.status());
  });
});
```

### Health Metrics

```typescript
// tests/api/health.api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Health API', () => {
  test('GET /health returns metrics array', async ({ request }) => {
    const response = await request.get('/api/v1/health');

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('metrics');
    expect(Array.isArray(body.metrics)).toBe(true);

    if (body.metrics.length > 0) {
      const metric = body.metrics[0];
      expect(metric).toHaveProperty('date');
      expect(metric).toHaveProperty('sleep_duration');
      expect(metric).toHaveProperty('avg_heart_rate');
      // raw_watch_data may be null for older rows
      if (metric.raw_watch_data) {
        expect(typeof metric.raw_watch_data).toBe('object');
      }
    }
  });
});
```

## Mixing API + Browser Tests

Use API calls to seed state, then verify via UI:

```typescript
// tests/e2e/web/planner.spec.ts
import { test, expect } from '../../fixtures/base';

test('task created via API appears in planner UI', async ({ page, request }) => {
  // Seed via API
  const response = await request.post('/api/v1/tasks', {
    data: { title: 'Playwright Seeded Task', priority: 'high' },
  });
  expect(response.status()).toBe(201);

  // Verify via UI
  await page.goto('/planner');
  await expect(page.getByText('Playwright Seeded Task')).toBeVisible();
});
```

## Contract Validation Helper

Reusable schema checks to enforce frontend/backend contract alignment:

```typescript
// tests/utils/contracts.ts
export function assertTaskShape(task: Record<string, unknown>): void {
  const requiredFields = ['id', 'title', 'priority', 'created_at'];
  for (const field of requiredFields) {
    if (!(field in task)) {
      throw new Error(`Task missing required field: ${field}`);
    }
  }
}

export function assertHealthMetricShape(metric: Record<string, unknown>): void {
  const requiredFields = ['date', 'sleep_duration', 'avg_heart_rate'];
  for (const field of requiredFields) {
    if (!(field in metric)) {
      throw new Error(`Health metric missing required field: ${field}`);
    }
  }
}
```

## Running API Tests

```bash
# API tests only (no browser needed)
npx playwright test --project=api

# Specific API test file
npx playwright test api/tasks.api.spec.ts

# With verbose output
npx playwright test --project=api --reporter=list
```

## Forbidden Patterns

- **Do NOT use `fetch()` or `axios` directly** — use Playwright's `request` fixture. It shares auth state and respects the config's `baseURL`.
- **Do NOT test implementation details** — test the API contract (status codes, response shapes), not internal database state.
- **Do NOT hardcode UUIDs or IDs** — seed data via API in the test, then use the returned ID.
- **Do NOT skip status code assertions** — always check `response.status()` before parsing the body.
- **Do NOT test endpoints that require real external services (Gmail, Ticketmaster) without mocking** — use route interception or environment-specific test flags.
- **Do NOT duplicate Pydantic schema validation** — the backend already validates. API tests verify the contract shape, not field-level types.
