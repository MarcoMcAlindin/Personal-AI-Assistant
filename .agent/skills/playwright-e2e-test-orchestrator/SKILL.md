---
name: playwright-e2e-test-orchestrator
description: End-to-end Playwright testing patterns for the VibeOS monorepo — covers web (React+Vite), mobile web views, Page Object Model, fixtures, OLED theme validation, and CI integration.
---

# Playwright E2E Test Orchestrator

## When to use this skill

- When writing new E2E tests for any VibeOS web or mobile-web feature
- When a GitHub Issue includes acceptance criteria that require UI verification
- When debugging flaky tests or test failures in CI
- When adding a new screen/route to the web or mobile app
- When Mr. Blue needs to prove a UI feature works before opening a PR

## Architecture Overview

### Project Structure

```
tests/
├── e2e/                          # Browser-based E2E tests
│   ├── web/                      # Desktop web app tests
│   │   ├── chat.spec.ts
│   │   ├── feeds.spec.ts
│   │   ├── email.spec.ts
│   │   ├── health.spec.ts
│   │   ├── planner.spec.ts
│   │   └── settings.spec.ts
│   └── mobile-web/               # Mobile viewport tests
│       ├── tab-navigation.spec.ts
│       ├── chat-mobile.spec.ts
│       └── health-mobile.spec.ts
├── api/                          # API-only tests (see playwright-api-test-runner skill)
├── fixtures/                     # Shared test fixtures
│   ├── base.ts                   # Base fixture with common setup
│   ├── auth.ts                   # Auth state fixture
│   └── theme.ts                  # OLED theme validation helpers
├── pages/                        # Page Object Models
│   ├── ChatPage.ts
│   ├── FeedsPage.ts
│   ├── EmailPage.ts
│   ├── HealthPage.ts
│   ├── PlannerPage.ts
│   └── SettingsPage.ts
├── utils/                        # Test utilities
│   └── helpers.ts
└── playwright.config.ts
```

### VibeOS-Specific Config

```typescript
// tests/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Desktop web
    {
      name: 'desktop-chrome',
      testDir: './e2e/web',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-firefox',
      testDir: './e2e/web',
      use: { ...devices['Desktop Firefox'] },
    },
    // Mobile viewports (web rendering, not native)
    {
      name: 'mobile-android',
      testDir: './e2e/mobile-web',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-ios',
      testDir: './e2e/mobile-web',
      use: { ...devices['iPhone 14'] },
    },
    // API tests (no browser)
    {
      name: 'api',
      testDir: './api',
      use: { baseURL: 'http://localhost:8000' },
    },
  ],

  webServer: [
    {
      command: 'cd ../web && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'cd ../backend && source .venv/bin/activate && uvicorn app.main:app --port 8000',
      url: 'http://localhost:8000/docs',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
```

## Page Object Model Pattern

Every screen gets a POM class. This is mandatory for any test suite with >3 tests.

```typescript
// tests/pages/ChatPage.ts
import { type Page, type Locator } from '@playwright/test';

export class ChatPage {
  // Locators — readonly, declared in constructor
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messageList: Locator;
  readonly vllmStatusChip: Locator;
  readonly streamingIndicator: Locator;

  constructor(private readonly page: Page) {
    this.messageInput = page.getByRole('textbox', { name: /message/i });
    this.sendButton = page.getByRole('button', { name: /send/i });
    this.messageList = page.getByRole('list', { name: /messages/i });
    this.vllmStatusChip = page.getByTestId('vllm-status');
    this.streamingIndicator = page.getByTestId('streaming-indicator');
  }

  // Actions — return void, never return page
  async sendMessage(text: string): Promise<void> {
    await this.messageInput.fill(text);
    await this.sendButton.click();
  }

  async waitForResponse(): Promise<void> {
    await this.streamingIndicator.waitFor({ state: 'visible' });
    await this.streamingIndicator.waitFor({ state: 'hidden', timeout: 60_000 });
  }

  // Assertions — use expect inside POM for domain-specific checks
  async expectMessageCount(count: number): Promise<void> {
    const { expect } = await import('@playwright/test');
    await expect(this.messageList.getByRole('listitem')).toHaveCount(count);
  }
}
```

### POM Rules
- Locators are `readonly` properties set in constructor
- Use semantic locators: `getByRole` > `getByLabel` > `getByText` > `getByTestId`
- Actions return `Promise<void>` — never chain pages
- One POM per screen/route
- POM files live in `tests/pages/`

## Fixture Pattern

```typescript
// tests/fixtures/base.ts
import { test as base } from '@playwright/test';
import { ChatPage } from '../pages/ChatPage';
import { FeedsPage } from '../pages/FeedsPage';
import { HealthPage } from '../pages/HealthPage';
import { PlannerPage } from '../pages/PlannerPage';

type VibeOSFixtures = {
  chatPage: ChatPage;
  feedsPage: FeedsPage;
  healthPage: HealthPage;
  plannerPage: PlannerPage;
};

export const test = base.extend<VibeOSFixtures>({
  chatPage: async ({ page }, use) => {
    await page.goto('/chat');
    await use(new ChatPage(page));
  },
  feedsPage: async ({ page }, use) => {
    await page.goto('/feeds');
    await use(new FeedsPage(page));
  },
  healthPage: async ({ page }, use) => {
    await page.goto('/health');
    await use(new HealthPage(page));
  },
  plannerPage: async ({ page }, use) => {
    await page.goto('/planner');
    await use(new PlannerPage(page));
  },
});

export { expect } from '@playwright/test';
```

## Writing Tests

### Standard Test Template

```typescript
// tests/e2e/web/chat.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Chat Screen', () => {
  test('sends a message and receives AI response', async ({ chatPage }) => {
    await chatPage.sendMessage('Hello VibeOS');
    await chatPage.waitForResponse();
    await chatPage.expectMessageCount(2); // user + AI
  });

  test('displays vLLM status chip', async ({ chatPage }) => {
    await expect(chatPage.vllmStatusChip).toBeVisible();
    await expect(chatPage.vllmStatusChip).toHaveText(/online|warming|offline|error/i);
  });
});
```

### Backend Mocking (when vLLM is unavailable)

```typescript
test('handles AI offline gracefully', async ({ page }) => {
  // Intercept the vLLM status endpoint
  await page.route('**/api/v1/vllm/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'offline', model: null, latency_ms: 0 }),
    })
  );

  await page.goto('/chat');
  await expect(page.getByTestId('vllm-status')).toHaveText(/offline/i);
});
```

### SSE Streaming Mock

```typescript
test('renders streamed chat response', async ({ page }) => {
  await page.route('**/api/v1/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        'data: {"content": "Hello "}\n\n',
        'data: {"content": "from "}\n\n',
        'data: {"content": "VibeOS!"}\n\n',
        'data: [DONE]\n\n',
      ].join(''),
    })
  );

  const chatPage = new ChatPage(page);
  await page.goto('/chat');
  await chatPage.sendMessage('test');
  await expect(page.getByText('Hello from VibeOS!')).toBeVisible();
});
```

## OLED Theme Validation

```typescript
// tests/fixtures/theme.ts
import { expect, type Page } from '@playwright/test';

export const OLED_PALETTE = {
  bgPrimary: 'rgb(0, 0, 0)',         // #000000
  bgSecondary: 'rgb(24, 24, 27)',     // #18181B
  accentPrimary: 'rgb(0, 212, 255)',  // #00D4FF
  textPrimary: 'rgb(250, 250, 250)',  // #FAFAFA
  textMuted: 'rgb(113, 113, 122)',    // #71717A
  borderColor: 'rgb(39, 39, 42)',     // #27272A
};

export async function assertOLEDBackground(page: Page): Promise<void> {
  const body = page.locator('body');
  await expect(body).toHaveCSS('background-color', OLED_PALETTE.bgPrimary);
}

export async function assertAccentColor(page: Page, locator: string): Promise<void> {
  await expect(page.locator(locator)).toHaveCSS('color', OLED_PALETTE.accentPrimary);
}
```

## Mobile Viewport Testing

```typescript
// tests/e2e/mobile-web/tab-navigation.spec.ts
import { test, expect } from '@playwright/test';

// This project uses Pixel 7 / iPhone 14 device descriptors from config
test.describe('Mobile Tab Navigation', () => {
  test('all 6 tabs are visible and navigable', async ({ page }) => {
    await page.goto('/');

    const tabs = ['Plan', 'Feeds', 'AI', 'Mail', 'Health', 'Settings'];
    for (const tab of tabs) {
      const tabButton = page.getByRole('tab', { name: tab });
      await expect(tabButton).toBeVisible();
      await tabButton.click();
      // Verify the screen loaded (no crash, no blank)
      await expect(page.locator('[data-testid="screen-content"]')).toBeVisible();
    }
  });

  test('tab bar uses OLED black background', async ({ page }) => {
    await page.goto('/');
    const tabBar = page.getByRole('tablist');
    await expect(tabBar).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  });
});
```

## Visual Regression Testing

```typescript
test('chat screen matches baseline', async ({ page }) => {
  // Mock dynamic content for deterministic screenshots
  await page.route('**/api/v1/vllm/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'online', model: 'qwen2.5-vl-7b', latency_ms: 42 }),
    })
  );

  await page.goto('/chat');
  await page.waitForLoadState('networkidle');

  // Mask dynamic elements
  await expect(page).toHaveScreenshot('chat-screen.png', {
    mask: [page.getByTestId('timestamp')],
    maxDiffPixelRatio: 0.01,
  });
});
```

## Accessibility Testing

```typescript
// tests/e2e/web/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/chat', '/feeds', '/email', '/health', '/planner', '/settings'];

for (const route of routes) {
  test(`${route} has no critical a11y violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
  });
}
```

## Running Tests

```bash
# All E2E tests
cd tests && npx playwright test

# Specific project
npx playwright test --project=desktop-chrome

# Specific file
npx playwright test e2e/web/chat.spec.ts

# Headed mode (see the browser)
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug

# Update visual snapshots
npx playwright test --update-snapshots

# Show HTML report
npx playwright show-report
```

## CI Integration (GitHub Actions)

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on:
  pull_request:
    branches: [staging, main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }

      - name: Install web dependencies
        run: cd web && npm ci

      - name: Install backend dependencies
        run: |
          cd backend
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt

      - name: Install test dependencies
        run: cd tests && npm ci

      - name: Install Playwright browsers
        run: cd tests && npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: cd tests && npx playwright test --project=desktop-chrome
        env:
          CI: true

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: tests/playwright-report/
          retention-days: 14
```

## Forbidden Patterns

- **Do NOT use `page.waitForTimeout()`** — this is a hard sleep. Use web-first assertions (`expect(locator).toBeVisible()`) or `waitForURL`, `waitForLoadState`.
- **Do NOT use `{ force: true }` on clicks** — if you need force, the element isn't ready. Fix the locator or wait for visibility.
- **Do NOT use raw CSS selectors** (`page.locator('.btn-primary')`) — use semantic locators (`getByRole`, `getByText`, `getByTestId`).
- **Do NOT share state between tests** — each test gets a fresh context. Use fixtures for shared setup.
- **Do NOT use `test.describe.serial`** — if tests must run in order, use `test.step()` within a single test.
- **Do NOT assert on `isVisible()` synchronously** — always `await expect(locator).toBeVisible()`, never `expect(await locator.isVisible()).toBe(true)`.
- **Do NOT hardcode viewport sizes** — use Playwright device descriptors from config.
- **Do NOT commit `.auth/` or storage state files** — add to `.gitignore`.
- **Do NOT use `page.waitForNavigation()`** — deprecated. Use `page.waitForURL()`.
- **Do NOT run visual regression tests locally and commit snapshots** — always generate baselines in CI (Linux) for consistency.
