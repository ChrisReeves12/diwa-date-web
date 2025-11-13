import { Page, expect } from '@playwright/test';

/**
 * Common test utilities for Playwright tests
 */

/**
 * Wait for a page to be fully loaded including all network requests
 */
export async function waitForPageLoad(page: Page, timeout = 30000) {
    await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string, fullPage = true) {
    await page.screenshot({
        path: `e2e/screenshots/${name}.png`,
        fullPage
    });
}

/**
 * Fill a form field and verify it was filled correctly
 */
export async function fillAndVerify(page: Page, selector: string, value: string) {
    const field = page.locator(selector);
    await field.fill(value);
    await expect(field).toHaveValue(value);
}

/**
 * Click an element and wait for navigation
 */
export async function clickAndWaitForNavigation(page: Page, selector: string) {
    await Promise.all([
        page.waitForNavigation(),
        page.locator(selector).click()
    ]);
}

/**
 * Check if an element exists without throwing an error
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
    return (await page.locator(selector).count()) > 0;
}

/**
 * Wait for an element to appear and be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Scroll to an element and ensure it's in view
 */
export async function scrollToElement(page: Page, selector: string) {
    await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Mock API responses for testing
 */
export async function mockApiResponse(page: Page, url: string, response: any) {
    await page.route(url, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response)
        });
    });
}

/**
 * Test responsive design at different viewport sizes
 */
export const VIEWPORT_SIZES = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 },
    smallDesktop: { width: 1366, height: 768 }
};

export async function testAtViewport(page: Page, viewport: keyof typeof VIEWPORT_SIZES, testFn: () => Promise<void>) {
    await page.setViewportSize(VIEWPORT_SIZES[viewport]);
    await testFn();
}

/**
 * Check for console errors during test execution
 */
export function setupConsoleErrorTracking(page: Page) {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    return {
        getErrors: () => consoleErrors,
        expectNoErrors: () => expect(consoleErrors).toHaveLength(0)
    };
}

/**
 * Login helper (modify based on your authentication system)
 */
export async function login(page: Page, email: string, password: string) {
    // Modify this based on your actual login flow
    await page.goto('/login');
    await fillAndVerify(page, 'input[type="email"]', email);
    await fillAndVerify(page, 'input[type="password"]', password);
    await page.locator('button[type="submit"]').click();

    // Wait for successful login (modify based on your app)
    // await page.waitForURL('/dashboard');
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
    // Modify based on your logout mechanism
    const logoutButton = page.locator('[data-testid="logout"], button:has-text("Logout"), button:has-text("Sign Out")');
    if (await elementExists(page, '[data-testid="logout"]')) {
        await logoutButton.click();
    }
}

/**
 * Clear all browser data (cookies, localStorage, etc.)
 */
export async function clearBrowserData(page: Page) {
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    // Clear cookies
    const context = page.context();
    await context.clearCookies();
}

/**
 * Clean up test user from database
 */
export async function cleanupTestUser(page: Page, email: string) {
    try {
        const response = await page.request.delete(`/api/test/cleanup?email=${encodeURIComponent(email)}`);
        if (!response.ok()) {
            console.warn(`Failed to cleanup user ${email}: ${response.status()}`);
        }
    } catch (error) {
        console.warn(`Error cleaning up user ${email}:`, error);
    }
}

/**
 * Create the test user with predefined credentials
 */
export async function createTestUser(page: Page) {
    try {
        const response = await page.request.post('/api/test/create-user');

        if (!response.ok()) {
            const errorData = await response.json();
            throw new Error(`Failed to create test user: ${errorData.message || response.status()}`);
        }

        const result = await response.json();
        return result.user;
    } catch (error) {
        console.error('Error creating test user:', error);
        throw error;
    }
}

/**
 * Handle location autocomplete selection
 */
export async function selectLocationFromAutocomplete(page: Page, searchText: string, optionText?: string) {
    // Wait for Google Maps to load (important for autocomplete)
    await page.waitForTimeout(3000);

    // Find the location input field - try multiple selectors
    let locationInput = page.locator('input[name="location"]');

    // If name="location" doesn't exist, try id="location"
    if (await locationInput.count() === 0) {
        locationInput = page.locator('input[id="location"]');
    }

    // If neither exist, try any input in the location container
    if (await locationInput.count() === 0) {
        locationInput = page.locator('.location-search-container input[type="text"]');
    }

    await expect(locationInput).toBeVisible();

    // Clear and type in the search text slowly to trigger autocomplete
    await locationInput.clear();
    await locationInput.type(searchText, { delay: 100 });

    // Give Google Maps time to fetch suggestions
    await page.waitForTimeout(2000);

    // Try different possible selectors for the dropdown
    const dropdownSelectors = [
        '.location-suggestions .suggestion-item',
        '.suggestion-item',
        '.searched-locations .searched-locality',
        '.pac-container .pac-item'  // Google Places Autocomplete default
    ];

    let suggestions;
    for (const selector of dropdownSelectors) {
        suggestions = page.locator(selector);
        if (await suggestions.count() > 0) {
            break;
        }
        await page.waitForTimeout(1000);
    }

    if (!suggestions || await suggestions.count() === 0) {
        throw new Error('No location suggestions found. Google Maps API might not be loaded or autocomplete is not working.');
    }

    // If specific option text is provided, click on that suggestion
    if (optionText) {
        const specificSuggestion = suggestions.filter({ hasText: optionText });
        await expect(specificSuggestion.first()).toBeVisible();
        await specificSuggestion.first().click();
    } else {
        // Otherwise, click on the first suggestion
        await expect(suggestions.first()).toBeVisible();
        await suggestions.first().click();
    }

    // Wait for the dropdown to close
    await page.waitForTimeout(1000);
}