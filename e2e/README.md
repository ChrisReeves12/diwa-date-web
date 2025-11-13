# E2E Testing with Playwright

This directory contains end-to-end tests for the diwa-date-web application using [Playwright](https://playwright.dev/).

## Getting Started

### Prerequisites
- Node.js and npm installed
- Playwright browsers installed (done automatically during setup)

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step by step
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Test Structure

```
e2e/
├── README.md                 # This file
├── example.spec.ts          # Basic example tests
├── advanced-features.spec.ts # Advanced Playwright features
├── utils/
│   └── test-helpers.ts      # Utility functions
└── screenshots/             # Test screenshots (gitignored)
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/expected title/);
  });
});
```

### Using Test Utilities

```typescript
import { test, expect } from '@playwright/test';
import { waitForPageLoad, takeScreenshot, fillAndVerify } from './utils/test-helpers';

test('should use utilities', async ({ page }) => {
  await page.goto('/');
  await waitForPageLoad(page);
  await takeScreenshot(page, 'homepage');
});
```

## Configuration

The Playwright configuration is in `playwright.config.ts` at the project root. Key features:

- **Cross-browser testing**: Chromium, Firefox, WebKit
- **Mobile testing**: iPhone and Android emulation
- **Automatic dev server**: Starts `npm run dev` before tests
- **Screenshots and videos**: Captured on failure
- **Parallel execution**: Tests run in parallel for speed

## Best Practices

### 1. Use Data Test IDs
Add `data-testid` attributes to elements you want to test:

```html
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.locator('[data-testid="submit-button"]').click();
```

### 2. Wait for Elements Properly
```typescript
// Good: Wait for element to be visible
await page.waitForSelector('[data-testid="content"]', { state: 'visible' });

// Good: Wait for network to be idle
await page.waitForLoadState('networkidle');

// Avoid: Fixed timeouts
// await page.waitForTimeout(5000); // Don't do this
```

### 3. Use Page Object Model for Complex Pages
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-button"]');
  }
}
```

### 4. Test User Journeys, Not Just Pages
```typescript
test('user can complete signup flow', async ({ page }) => {
  // Navigate to signup
  await page.goto('/signup');
  
  // Fill form
  await fillAndVerify(page, '[data-testid="email"]', 'test@example.com');
  
  // Submit and verify redirect
  await page.click('[data-testid="submit"]');
  await expect(page).toHaveURL('/welcome');
  
  // Verify welcome message
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
});
```

## Debugging Tests

### 1. Use Playwright UI Mode
```bash
npm run test:e2e:ui
```
This opens an interactive UI where you can see tests running and debug failures.

### 2. Use Debug Mode
```bash
npm run test:e2e:debug
```
This runs tests with the Playwright Inspector for step-by-step debugging.

### 3. Screenshots and Videos
Failed tests automatically capture:
- Screenshots (`screenshot: 'only-on-failure'`)
- Videos (`video: 'retain-on-failure'`)
- Traces (`trace: 'on-first-retry'`)

### 4. Console Logs
Use the console error tracking utility:
```typescript
import { setupConsoleErrorTracking } from './utils/test-helpers';

test('should not have console errors', async ({ page }) => {
  const { expectNoErrors } = setupConsoleErrorTracking(page);
  
  await page.goto('/');
  
  expectNoErrors();
});
```

## CI/CD Integration

The configuration automatically detects CI environments and:
- Runs tests in headless mode
- Retries failed tests 2 times
- Uses a single worker for stability
- Generates JUnit XML reports for CI systems

## Common Patterns

### Testing Forms
```typescript
test('should handle form submission', async ({ page }) => {
  await page.goto('/contact');
  
  await fillAndVerify(page, '[data-testid="name"]', 'John Doe');
  await fillAndVerify(page, '[data-testid="email"]', 'john@example.com');
  
  await page.click('[data-testid="submit"]');
  
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### Testing API Interactions
```typescript
test('should handle API responses', async ({ page }) => {
  // Mock API response
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ users: [] })
    });
  });

  await page.goto('/users');
  await expect(page.locator('[data-testid="no-users"]')).toBeVisible();
});
```

### Testing Responsive Design
```typescript
import { testAtViewport, VIEWPORT_SIZES } from './utils/test-helpers';

test('should work on mobile', async ({ page }) => {
  await testAtViewport(page, 'mobile', async () => {
    await page.goto('/');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
});
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout in `playwright.config.ts` or use proper waiting strategies
2. **Flaky tests**: Use `page.waitForLoadState('networkidle')` and avoid fixed timeouts
3. **Element not found**: Use `data-testid` attributes and check element visibility states
4. **Browser not starting**: Run `npx playwright install` to reinstall browsers

### Getting Help

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Discord](https://discord.gg/playwright-807756831384403968)
- [Best Practices Guide](https://playwright.dev/docs/best-practices) 