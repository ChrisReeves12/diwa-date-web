import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('should load the homepage successfully', async ({ page }) => {
        // Navigate to the homepage
        await page.goto('/');

        // Wait for the page to load
        await page.waitForLoadState('networkidle');

        // Check that the page title is set
        await expect(page).toHaveTitle(/diwa date/i);
    });

    test('should have proper meta tags', async ({ page }) => {
        await page.goto('/');

        // Check for viewport meta tag (important for responsive design)
        const viewportMeta = page.locator('meta[name="viewport"]').first();
        await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
    });
});

test.describe('Navigation', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('should navigate between pages', async ({ page }) => {
        await page.goto('/');
    });
});

test.describe('Responsive Design', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('should work on mobile viewport', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Check that the page loads properly on mobile
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveTitle(/diwa date/i);
    });

    test('should work on tablet viewport', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        await page.waitForLoadState('networkidle');
        await expect(page).toHaveTitle(/diwa date/i);
    });
}); 