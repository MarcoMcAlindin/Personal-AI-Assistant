---
description: Enforces Playwright testing standards across all VibeOS agents — locator strategy, test isolation, assertion patterns, and CI compliance.
trigger: glob
globs: tests/**, web/src/**/*.test.*, web/src/**/*.spec.*, mobile/src/**/*.test.*, mobile/src/**/*.spec.*
---

# Playwright Testing Standards (Rule 30)

All agents writing or modifying Playwright tests must follow these standards. Violations will be flagged during Mr. Pink's audit.

## 1. Locator Priority (Mandatory Order)

Use the most semantic locator available. This is not a suggestion — it is the enforced order:

| Priority | Locator | When to use |
|----------|---------|-------------|
| 1 | `getByRole('button', { name: 'Send' })` | Always prefer — mirrors accessibility tree |
| 2 | `getByLabel('Email address')` | Form inputs with visible labels |
| 3 | `getByText('Hello World')` | Visible text content |
| 4 | `getByPlaceholder('Search...')` | Inputs with placeholder text |
| 5 | `getByAltText('Logo')` | Images with alt text |
| 6 | `getByTestId('vllm-status')` | When no semantic locator is possible |
| 7 | CSS/XPath | **NEVER** — forbidden in VibeOS tests |

### Enforcement
- `page.locator('.class')` or `page.locator('#id')` in test files → automatic audit fail
- `page.$()` or `page.$$()` → forbidden, use locator API
- Always use `{ exact: true }` when text could be ambiguous

## 2. Assertion Rules

### Use Web-First Assertions (auto-retry)
```typescript
// CORRECT — auto-retries until timeout
await expect(locator).toBeVisible();
await expect(locator).toHaveText('expected');
await expect(locator).toHaveCount(3);

// WRONG — one-shot check, flaky
expect(await locator.isVisible()).toBe(true);
expect(await locator.textContent()).toBe('expected');
```

### Every Test Must Assert
A test without `expect()` is not a test. Navigation alone (`page.goto`) does not constitute a test — you must verify something rendered.

## 3. Test Isolation

- Each test gets a fresh `BrowserContext` — do not share state between tests
- Use `test.beforeEach` for per-test setup, `fixtures` for shared infrastructure
- Never use `test.describe.serial` — if order matters, use `test.step()` within one test
- Clean up seeded data in `test.afterEach` if the backend doesn't auto-reset

## 4. No Hard Waits

```typescript
// FORBIDDEN
await page.waitForTimeout(3000);

// CORRECT alternatives
await expect(locator).toBeVisible();                    // wait for element
await page.waitForURL('**/dashboard');                  // wait for navigation
await page.waitForLoadState('networkidle');              // wait for network
await expect(async () => {                              // custom retry
  const count = await locator.count();
  expect(count).toBeGreaterThan(0);
}).toPass({ timeout: 10_000 });
```

## 5. Skill Compliance

Before writing any Playwright test, agents MUST check:
- `playwright-e2e-test-orchestrator/SKILL.md` — for E2E browser tests
- `playwright-api-test-runner/SKILL.md` — for API-only tests

Use the POM classes, fixtures, and config patterns defined in these skills. Do not reinvent patterns that already exist.

## 6. File Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| E2E web test | `tests/e2e/web/<feature>.spec.ts` | `chat.spec.ts` |
| E2E mobile test | `tests/e2e/mobile-web/<feature>.spec.ts` | `tab-navigation.spec.ts` |
| API test | `tests/api/<feature>.api.spec.ts` | `tasks.api.spec.ts` |
| Page Object | `tests/pages/<Feature>Page.ts` | `ChatPage.ts` |
| Fixture | `tests/fixtures/<name>.ts` | `base.ts` |
| Utility | `tests/utils/<name>.ts` | `helpers.ts` |

## 7. CI Requirements

- Tests must pass with `workers: 1` and `retries: 2` (CI config)
- Visual regression snapshots must be generated in CI (Linux), never committed from local machines
- Trace files (`trace: 'on-first-retry'`) must be uploaded as artifacts on failure
- The `playwright-report/` directory must be uploaded as a GitHub Actions artifact

## 8. What To Test vs What Not To Test

### Test (E2E)
- User-visible flows: send a message, create a task, view feeds
- Navigation between screens
- Error states: offline status, empty data, failed requests
- OLED theme compliance (background colors, accent colors)
- Responsive behavior at mobile viewports

### Do NOT Test (E2E)
- Internal component state or React hooks — use Vitest for unit tests
- Third-party library internals
- Exact pixel layouts (unless doing visual regression with `toHaveScreenshot`)
- Backend business logic — use pytest for that

## 9. Violations

The following are automatic fails in the performance log:

- Using `page.waitForTimeout()` anywhere
- Using `{ force: true }` on any action
- Using raw CSS selectors (`page.locator('.btn')`)
- Tests without assertions
- Committing `.auth/` or storage state files
- Visual snapshots generated on macOS/Windows and committed
- Skipping the POM pattern for a screen that already has a Page Object
