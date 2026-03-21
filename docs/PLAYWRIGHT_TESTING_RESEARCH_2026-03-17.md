# Playwright Testing Research for AI Agent Workflows

**Date:** 2026-03-17
**Target:** SuperCyan monorepo (`/web` React+Vite, `/mobile` React Native+Expo, `/backend` FastAPI)

---

## Table of Contents

1. [Core Patterns & Best Practices](#1-core-patterns--best-practices)
2. [Anti-Patterns & Common Mistakes](#2-anti-patterns--common-mistakes)
3. [Configuration Best Practices](#3-configuration-best-practices)
4. [Locator Strategy Priority](#4-locator-strategy-priority)
5. [Monorepo Test Structure](#5-monorepo-test-structure)
6. [React + Vite Integration](#6-react--vite-integration)
7. [FastAPI Backend API Testing](#7-fastapi-backend-api-testing)
8. [Visual Regression Testing](#8-visual-regression-testing)
9. [CI/CD with GitHub Actions](#9-cicd-with-github-actions)
10. [Accessibility Testing](#10-accessibility-testing)

---

## 1. Core Patterns & Best Practices

### Test Isolation

Every test must be completely independent — its own local storage, session storage, cookies, and data. Playwright spawns a fresh `BrowserContext` per test automatically.

```typescript
// Each test gets a clean page via the built-in fixture
test('dashboard loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

**Key rules:**
- Never share state between tests
- Use `beforeEach` for common setup, but keep tests runnable in any order
- Use API calls (not UI flows) to seed data and authenticate — faster and more reliable

### Page Object Model (POM)

Encapsulate page interactions in classes. Locators are defined once; tests call high-level methods.

```typescript
// page-objects/chat-page.ts
export class ChatPage {
  readonly page: Page;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messageList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.messageInput = page.getByRole('textbox', { name: 'Message' });
    this.sendButton = page.getByRole('button', { name: 'Send' });
    this.messageList = page.getByRole('list', { name: 'Messages' });
  }

  async goto() {
    await this.page.goto('/chat');
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text);
    await this.sendButton.click();
  }

  async expectMessageVisible(text: string) {
    await expect(this.messageList.getByText(text)).toBeVisible();
  }
}
```

**POM rules for AI agents:**
- Action methods return `void`, not other page objects (avoids tight coupling)
- Store `Locator` objects as `readonly` properties (resolved lazily at action time)
- One POM class per logical page or component section

### Fixtures

Fixtures replace `beforeEach`/`afterEach` hooks with composable, encapsulated setup/teardown.

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { ChatPage } from './page-objects/chat-page';

type Fixtures = {
  chatPage: ChatPage;
};

export const test = base.extend<Fixtures>({
  chatPage: async ({ page }, use) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    await use(chatPage);   // test runs here
    // teardown runs after use()
  },
});

export { expect } from '@playwright/test';
```

**Fixture scoping:**
- **Test-scoped** (default): created/destroyed per test — use for page objects, test data
- **Worker-scoped** (`{ scope: 'worker' }`): shared across tests in one worker — use for expensive resources (server startup, DB connections)
- **Automatic** (`{ auto: true }`): runs for every test without being requested — use for logging, cleanup

### Auto-Waiting

Playwright auto-waits for elements to be actionable before performing actions. **Do not add manual waits.**

Actions like `click()`, `fill()`, `check()` automatically wait for the element to be:
- Attached to DOM
- Visible
- Stable (not animating)
- Enabled
- Not obscured by other elements

### Web-First Assertions

Always use web-first assertions that retry until a condition is met or timeout:

```typescript
// CORRECT — retries until visible or timeout
await expect(page.getByText('Welcome')).toBeVisible();

// WRONG — one-shot check, timing-dependent
expect(await page.getByText('Welcome').isVisible()).toBe(true);
```

---

## 2. Anti-Patterns & Common Mistakes

These are the 17 most common mistakes, especially relevant for AI agents generating tests:

### Critical Mistakes

| # | Mistake | Fix |
|---|---------|-----|
| 1 | **No assertions** — test performs actions but never verifies outcomes | Every test MUST have at least one `expect()` assertion |
| 2 | **One-shot checks** — `expect(await el.isVisible()).toBe(true)` | Use web-first: `await expect(el).toBeVisible()` |
| 3 | **`waitForTimeout()`** — hardcoded sleeps | Replace with web-first assertions on visible elements |
| 4 | **`networkidle`** — unreliable wait condition | Wait for specific visible elements instead |
| 5 | **Redundant waits before actions** — `waitFor()` before `click()` | Remove; actions already auto-wait |
| 6 | **`{ force: true }`** — bypasses actionability checks | Fix the test flow (close overlays, scroll into view) |
| 7 | **`waitForResponse` after trigger** — race condition | Listen first, trigger second, await third |
| 8 | **Manual retry loops** — custom sleep+retry logic | Use `toPass()` or `expect.poll()` |
| 9 | **Long inner timeouts in `toPass`** — sluggish retries | Set short inner timeout: `{ timeout: 1_000 }` |
| 10 | **Deprecated APIs** — `waitForNavigation()`, `waitForSelector()` | Use `waitForURL()` or web-first assertions |
| 11 | **Missing `{ exact: true }`** — `getByText('Submit')` matches "Submit Order" | Add `{ exact: true }` for precise matching |
| 12 | **`expect.poll` for DOM checks** — over-engineering | Prefer `await expect(el).toHaveText('10')` |
| 13 | **`waitForFunction` for UI assertions** — verbose, unnecessary | Use web-first assertions |
| 14 | **Negative assertions over positive** — `.not.toBeVisible()` | Prefer `.toBeHidden()` |
| 15 | **No linting** — anti-patterns go undetected | Install `eslint-plugin-playwright` |
| 16 | **Action methods returning page objects** — tight coupling | Return `void`; let tests decide next step |
| 17 | **`test.describe.serial`** — cascading failures | Keep tests independent; use `test.step()` for multi-step flows |

### Root Cause

Most mistakes come from **fighting the framework** instead of working with it. Playwright handles timing, isolation, and browser management. Stop overriding those defaults with manual workarounds.

---

## 3. Configuration Best Practices

### Reference Configuration for SuperCyan

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test discovery
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Execution
  timeout: 30_000,          // 30s per test
  expect: { timeout: 5_000 }, // 5s per assertion
  fullyParallel: true,
  workers: process.env.CI ? 1 : '50%',  // 1 worker in CI (2-core runners)
  retries: process.env.CI ? 2 : 0,      // retry only in CI

  // Reporting
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  // Shared settings
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',     // capture trace on retry only
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Auto-start dev servers
  webServer: [
    {
      command: 'npm run dev',
      cwd: './web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'uvicorn app.main:app --port 8080',
      cwd: './backend',
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
```

### Key Configuration Rules

| Setting | Dev | CI | Why |
|---------|-----|-----|-----|
| `workers` | `'50%'` | `1` | GitHub Actions has 2 CPU cores; more workers causes contention |
| `retries` | `0` | `2` | Retries mask bugs locally; useful for CI flakiness |
| `trace` | `'off'` | `'on-first-retry'` | Traces are large; capture only when investigating failures |
| `screenshot` | `'off'` | `'only-on-failure'` | Same rationale |
| `video` | `'off'` | `'retain-on-failure'` | Videos are 10-50MB; keep only failures |
| `reuseExistingServer` | `true` | `false` | Reuse running dev server locally; fresh start in CI |

### Separate tsconfig for Tests

```json
// tests/e2e/tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "paths": {
      "@fixtures/*": ["./fixtures/*"],
      "@page-objects/*": ["./page-objects/*"]
    }
  }
}
```

---

## 4. Locator Strategy Priority

### Official Priority Order

| Priority | Locator | When to Use | Example |
|----------|---------|-------------|---------|
| 1 | `getByRole()` | Buttons, links, headings, checkboxes, form controls | `page.getByRole('button', { name: 'Send' })` |
| 2 | `getByLabel()` | Form inputs with `<label>` | `page.getByLabel('Email')` |
| 3 | `getByText()` | Non-interactive content (divs, spans, paragraphs) | `page.getByText('Welcome back')` |
| 4 | `getByPlaceholder()` | Inputs without labels but with placeholder | `page.getByPlaceholder('Search...')` |
| 5 | `getByAltText()` | Images with alt text | `page.getByAltText('User avatar')` |
| 6 | `getByTitle()` | Elements with title attributes | `page.getByTitle('Close')` |
| 7 | `getByTestId()` | No semantic way to locate; explicit test contract | `page.getByTestId('chat-message-list')` |
| 8 | CSS/XPath | Last resort for legacy DOM | `page.locator('.legacy-widget')` |

### AI Agent Locator Rules

1. **Always try `getByRole` first.** It mirrors accessibility and user perception.
2. **Use `{ exact: true }` when text could partially match** other elements: `getByRole('button', { name: 'Submit', exact: true })`.
3. **Prefer `getByLabel` for forms** over `getByPlaceholder` — labels are more stable.
4. **Use `getByTestId` only when elements lack semantic attributes** (icon-only buttons, canvas elements, highly custom components). Ask developers to add `data-testid` only as a last resort.
5. **Never use CSS class selectors** — they are implementation details that change with styling refactors.

### Filtering and Chaining

```typescript
// Filter by text
await page.getByRole('listitem').filter({ hasText: 'Product 2' }).click();

// Filter by child element
await page.getByRole('listitem')
  .filter({ has: page.getByRole('heading', { name: 'Product 2' }) })
  .getByRole('button', { name: 'Add to cart' })
  .click();

// AND combinator
const button = page.getByRole('button').and(page.getByTitle('Subscribe'));

// OR combinator (useful for conditional UI)
const newEmail = page.getByRole('button', { name: 'New' });
const dialog = page.getByText('Confirm security settings');
await expect(newEmail.or(dialog).first()).toBeVisible();

// Exclude matching items
await expect(
  page.getByRole('listitem').filter({ hasNotText: 'Out of stock' })
).toHaveCount(5);
```

### Strictness

Playwright enforces strict mode: if a locator matches multiple elements, actions throw. Solutions:
- Add more specific filters to narrow the match
- Use `.first()`, `.last()`, `.nth(n)` only when ordering is meaningful
- Count-based assertions (`toHaveCount()`) work fine with multiple matches

---

## 5. Monorepo Test Structure

### Recommended Directory Layout for SuperCyan

```
supercyan/
├── web/                          # React + Vite app
├── mobile/                       # React Native + Expo
├── backend/                      # FastAPI
├── tests/
│   ├── e2e/                      # End-to-end tests (web UI)
│   │   ├── fixtures/
│   │   │   ├── base.ts           # Extended test with custom fixtures
│   │   │   ├── auth.ts           # Authentication fixtures
│   │   │   └── api.ts            # API helper fixtures
│   │   ├── page-objects/
│   │   │   ├── chat-page.ts
│   │   │   ├── feeds-page.ts
│   │   │   ├── email-page.ts
│   │   │   ├── health-page.ts
│   │   │   ├── planner-page.ts
│   │   │   └── settings-page.ts
│   │   ├── specs/
│   │   │   ├── chat.spec.ts
│   │   │   ├── feeds.spec.ts
│   │   │   ├── email.spec.ts
│   │   │   ├── health.spec.ts
│   │   │   └── planner.spec.ts
│   │   └── playwright.config.ts
│   ├── api/                      # API-only tests (no browser)
│   │   ├── specs/
│   │   │   ├── chat-api.spec.ts
│   │   │   ├── feeds-api.spec.ts
│   │   │   ├── health-api.spec.ts
│   │   │   └── tasks-api.spec.ts
│   │   └── playwright.config.ts
│   └── mobile-web/               # Mobile viewport E2E tests
│       ├── specs/
│       └── playwright.config.ts
├── playwright.config.ts          # Root config (optional, delegates to projects)
└── package.json
```

### Multi-Project Configuration

Use Playwright's `projects` feature to test across browser/viewport combinations from a single config:

```typescript
projects: [
  // Desktop browsers
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },

  // Mobile viewports (for web responsive testing)
  { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },

  // API-only tests (no browser needed)
  {
    name: 'api',
    testDir: './tests/api/specs',
    use: { baseURL: 'http://localhost:8080' },
  },
]
```

### Shared Code Across Projects

- Page objects and fixtures live in shared directories, imported by any spec
- API helper fixtures can be used by both E2E and API-only tests
- Authentication state can be generated once and shared via `storageState`

---

## 6. React + Vite Integration

### E2E Testing (Recommended Approach)

For a React+Vite app, E2E tests run against the built/served application — no special Vite integration needed.

```typescript
// playwright.config.ts
webServer: {
  command: 'npm run dev',
  cwd: './web',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
},
```

### Mocking External APIs

Use Playwright's route interception to mock backend responses during E2E tests:

```typescript
test('chat displays AI response', async ({ page }) => {
  // Mock the streaming chat endpoint
  await page.route('**/api/v1/chat', route =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"content": "Hello from mock AI"}\n\n',
    })
  );

  await page.goto('/chat');
  await page.getByRole('textbox', { name: 'Message' }).fill('Hello');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Hello from mock AI')).toBeVisible();
});
```

### Component Testing (Experimental)

Playwright has experimental component testing that uses Vite internally to bundle components:

```typescript
// Install: npm install -D @playwright/experimental-ct-react
import { test, expect } from '@playwright/experimental-ct-react';
import { ChatInput } from '../src/components/chat/ChatInput';

test('chat input submits on enter', async ({ mount }) => {
  let submitted = false;
  const component = await mount(
    <ChatInput onSubmit={() => { submitted = true; }} />
  );
  await component.getByRole('textbox').fill('Hello');
  await component.getByRole('textbox').press('Enter');
  expect(submitted).toBe(true);
});
```

**Recommendation:** Prefer E2E tests for most coverage. Use component tests only for isolated complex components that are hard to test through the full app.

### Testing Stack Alongside Playwright

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | Pure functions, hooks, utils |
| Component | Vitest + Testing Library | Component logic in jsdom |
| Integration | Playwright Component (experimental) | Components in real browser |
| E2E | Playwright | Full app flows |
| API | Playwright `request` fixture | Backend endpoints |

---

## 7. FastAPI Backend API Testing

### Playwright API Testing (No Browser)

Playwright's `APIRequestContext` can test FastAPI endpoints directly:

```typescript
import { test, expect } from '@playwright/test';

test.describe('SuperCyan API', () => {
  test('GET /feeds/tech returns RSS items', async ({ request }) => {
    const response = await request.get('/feeds/tech');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data.items.length).toBeGreaterThan(0);
  });

  test('POST /chat sends message and gets response', async ({ request }) => {
    const response = await request.post('/chat', {
      data: {
        message: 'What is the weather?',
        user_id: 'test-user',
      },
    });
    expect(response.ok()).toBeTruthy();
  });

  test('GET /tasks returns task list', async ({ request }) => {
    const response = await request.get('/tasks');
    expect(response.ok()).toBeTruthy();
    const tasks = await response.json();
    expect(Array.isArray(tasks)).toBe(true);
  });

  test('PATCH /tasks/:id updates task', async ({ request }) => {
    const response = await request.patch('/tasks/test-id', {
      data: { status: 'completed' },
    });
    expect(response.ok()).toBeTruthy();
  });
});
```

### Configuration for API Tests

```typescript
// tests/api/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  use: {
    baseURL: process.env.API_URL || 'http://localhost:8080',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TEST_TOKEN}`,
    },
  },
  webServer: {
    command: 'uvicorn app.main:app --port 8080',
    cwd: '../../backend',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Mixing API + UI Tests

Use API calls to seed state before UI tests, and verify backend state after UI actions:

```typescript
test('creating a task via UI persists to backend', async ({ page, request }) => {
  // UI action
  await page.goto('/planner');
  await page.getByRole('textbox', { name: 'New task' }).fill('Buy groceries');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Buy groceries')).toBeVisible();

  // API verification
  const response = await request.get('/tasks');
  const tasks = await response.json();
  expect(tasks.some(t => t.title === 'Buy groceries')).toBe(true);
});
```

---

## 8. Visual Regression Testing

### Core API

```typescript
// Full page screenshot comparison
await expect(page).toHaveScreenshot('dashboard.png');

// Element screenshot comparison
await expect(page.getByTestId('chat-panel')).toHaveScreenshot('chat-panel.png');

// With tolerance
await expect(page).toHaveScreenshot('dashboard.png', {
  maxDiffPixels: 100,        // absolute pixel count
  // OR
  maxDiffPixelRatio: 0.02,   // 2% of image
});
```

### Configuration

```typescript
// playwright.config.ts
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 50,
    // animations can cause flaky screenshots
    animations: 'disabled',
  },
  toMatchSnapshot: {
    maxDiffPixelRatio: 0.01,
  },
},
```

### Handling Dynamic Content

```typescript
test('dashboard visual test', async ({ page }) => {
  await page.goto('/dashboard');

  // Mask dynamic elements (timestamps, avatars, etc.)
  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [
      page.getByTestId('timestamp'),
      page.getByTestId('user-avatar'),
    ],
    // Apply custom CSS to hide animations
    stylePath: './tests/e2e/screenshot.css',
  });
});
```

```css
/* tests/e2e/screenshot.css */
*, *::before, *::after {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
  caret-color: transparent !important;
}
```

### Cross-Platform Rules

- Snapshots are **platform-specific**: `test-1-chromium-darwin.png` vs `test-1-chromium-linux.png`
- **Always generate baselines in CI** (Linux) for consistency
- Run visual tests in **Chromium only** — different browsers render differently
- Update baselines with: `npx playwright test --update-snapshots`
- **Commit baseline images to version control** — review in PRs like code

### Dedicated Visual Project

```typescript
projects: [
  {
    name: 'visual',
    use: { ...devices['Desktop Chrome'] },
    testMatch: '**/*.visual.spec.ts',
  },
]
```

---

## 9. CI/CD with GitHub Actions

### Complete Workflow

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: lts/*

      - name: Install dependencies
        run: npm ci

      - name: Install web dependencies
        run: cd web && npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run Playwright tests
        run: npx playwright test
        env:
          CI: true
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: test-results
          path: test-results/
          retention-days: 7
```

### Sharding for Large Test Suites

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      # ... setup steps ...
      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shard }}
```

### CI Best Practices

| Practice | Detail |
|----------|--------|
| **Workers** | Set to `1` on GitHub Actions (2-core runners) |
| **Retries** | Use `2` retries in CI only |
| **Browser install** | Install only needed browsers: `npx playwright install chromium --with-deps` |
| **Docker alternative** | Use `mcr.microsoft.com/playwright:v1.50.0-noble` for consistent env |
| **Caching** | Cache `node_modules` and `~/.cache/ms-playwright` for faster runs |
| **Traces** | `'on-first-retry'` — captures trace only on retried tests |
| **Secrets** | Never hardcode API keys; use GitHub Secrets |
| **Report upload** | Always upload even on failure (`if: ${{ !cancelled() }}`) |

### Docker-Based Approach (More Consistent)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npx playwright test
        env:
          HOME: /root  # Required inside container
```

---

## 10. Accessibility Testing

### Setup

```bash
npm install -D @axe-core/playwright
```

### Full Page Scan

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('dashboard has no a11y violations', async ({ page }) => {
  await page.goto('/dashboard');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### WCAG-Scoped Scan

```typescript
test('meets WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Scanning Specific Sections

```typescript
test('chat panel is accessible', async ({ page }) => {
  await page.goto('/chat');

  const results = await new AxeBuilder({ page })
    .include('#chat-panel')
    .exclude('#third-party-widget')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Reusable A11y Fixture

```typescript
// fixtures/a11y.ts
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend<{ makeAxeBuilder: () => AxeBuilder }>({
  makeAxeBuilder: async ({ page }, use) => {
    const builder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
    await use(builder);
  },
});

// Usage in tests
test('page is accessible', async ({ page, makeAxeBuilder }) => {
  await page.goto('/feeds');
  const results = await makeAxeBuilder().analyze();
  expect(results.violations).toEqual([]);
});
```

### Attaching Results to Reports

```typescript
test('a11y audit with report attachment', async ({ page }, testInfo) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();

  await testInfo.attach('a11y-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations).toEqual([]);
});
```

### Handling Known Violations

```typescript
// Temporarily disable specific rules (document why)
const results = await new AxeBuilder({ page })
  .disableRules(['color-contrast'])  // Known issue: tracked in VOS-XXX
  .analyze();

// Snapshot-based approach for gradual improvement
function violationFingerprints(results) {
  return JSON.stringify(
    results.violations.map(v => ({
      rule: v.id,
      targets: v.nodes.map(n => n.target),
    })),
    null, 2
  );
}

expect(violationFingerprints(results)).toMatchSnapshot();
```

### Coverage

Automated axe-core scans catch ~57% of all accessibility issues by volume (Deque Systems study). Always complement with manual testing for keyboard navigation, screen reader flows, and cognitive accessibility.

---

## Quick Reference: ESLint Setup

```bash
npm install -D eslint-plugin-playwright
```

```json
// .eslintrc.json (tests directory)
{
  "extends": ["plugin:playwright/recommended"],
  "rules": {
    "playwright/no-wait-for-timeout": "error",
    "playwright/no-force-option": "warn",
    "playwright/prefer-web-first-assertions": "error",
    "playwright/no-conditional-in-test": "warn",
    "playwright/no-page-pause": "error"
  }
}
```

---

## Sources

- [Playwright Best Practices (official)](https://playwright.dev/docs/best-practices)
- [Playwright Fixtures (official)](https://playwright.dev/docs/test-fixtures)
- [Playwright Page Object Model (official)](https://playwright.dev/docs/pom)
- [Playwright Locators (official)](https://playwright.dev/docs/locators)
- [Playwright API Testing (official)](https://playwright.dev/docs/api-testing)
- [Playwright Visual Comparisons (official)](https://playwright.dev/docs/test-snapshots)
- [Playwright CI Setup (official)](https://playwright.dev/docs/ci-intro)
- [Playwright Accessibility Testing (official)](https://playwright.dev/docs/accessibility-testing)
- [Playwright Configuration (official)](https://playwright.dev/docs/test-configuration)
- [Playwright Projects (official)](https://playwright.dev/docs/test-projects)
- [17 Playwright Testing Mistakes — Yevhen Laichenkov](https://elaichenkov.github.io/posts/17-playwright-testing-mistakes-you-should-avoid/)
- [Playwright Mistakes to Avoid — TestDino](https://testdino.com/blog/playwright-mistakes/)
- [Monorepo vs Standard Repo Setup — Kyrre Gjerstad](https://www.kyrre.dev/blog/end-to-end-testing-setup)
- [Playwright + Turborepo](https://turborepo.dev/docs/guides/tools/playwright)
- [BrowserStack Playwright Best Practices](https://www.browserstack.com/guide/playwright-best-practices)
- [BrowserStack Playwright Config Guide](https://www.browserstack.com/guide/playwright-config)
- [Playwright Locators Guide — Momentic](https://momentic.ai/blog/playwright-locators-guide)
- [axe-playwright npm](https://www.npmjs.com/package/axe-playwright)
