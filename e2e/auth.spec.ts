import { test, expect } from '@playwright/test';
import { cleanupTestUser, createTestUser, fillAndVerify, waitForPageLoad } from './utils/test-helpers';

test.describe.serial('Authentication', () => {
    // Test credentials provided by the user
    const testCredentials = {
        email: 'johndoe@test.com',
        password: 'Password1!'
    };

    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await cleanupTestUser(page, testCredentials.email);
        await createTestUser(page);
    });

    test.afterEach(async ({ page }) => {
        await cleanupTestUser(page, testCredentials.email);
    });

    test('should successfully log in and log out a user', async ({ page }) => {
        // Navigate to login page
        await page.goto('/login');
        await waitForPageLoad(page);

        // Verify we're on the login page
        await expect(page).toHaveURL('/login');
        await expect(page).toHaveTitle(/Sign In/i);

        // Fill in login form
        await fillAndVerify(page, 'input[type="email"]', testCredentials.email);
        await fillAndVerify(page, 'input[type="password"]', testCredentials.password);

        // Submit the form
        const signInButton = page.locator('button[type="submit"]:has-text("Sign In")');
        await expect(signInButton).toBeVisible();

        // Click sign in and wait for navigation
        await signInButton.click();

        // Wait for navigation or error message
        try {
            await page.waitForURL('/', { timeout: 10000 });
        } catch (error) {
            // If navigation doesn't happen, check if login failed
            const errorMessage = page.locator('.error-message');
            if (await errorMessage.isVisible()) {
                throw new Error(`Login failed: ${await errorMessage.textContent()}`);
            }
            // If no error message, continue to check current URL
        }

        // Verify successful login by checking if we're redirected to homepage
        await expect(page).toHaveURL('/');

        // Wait for the page to fully load after login
        await waitForPageLoad(page);

        // Verify that user is logged in by checking for user-specific elements
        // The top bar should show user profile/notification center instead of login buttons
        const memberLoginButton = page.locator('a:has-text("Member Login")');
        await expect(memberLoginButton).not.toBeVisible();

        // Look for the notification center or user profile area which indicates logged in state
        const notificationCenter = page.locator('.notification-center-container');
        await expect(notificationCenter).toBeVisible();

        // Now test logout functionality
        // Click on the user profile area to open the account menu
        const profileContainer = page.locator('.profile-container');
        await expect(profileContainer).toBeVisible();
        await profileContainer.click();

        // Wait for the user account menu to appear
        const accountMenu = page.locator('.user-profile-account-menu-container');
        await expect(accountMenu).toBeVisible();

        // Click the sign out button
        const signOutButton = page.locator('button:has-text("Sign Out")');
        await expect(signOutButton).toBeVisible();

        // Click sign out and wait for redirect
        await signOutButton.click();

        // Wait for logout to complete
        await page.waitForTimeout(2000); // Give time for logout action

        // Verify successful logout
        await waitForPageLoad(page);

        // After logout, the login button should be visible again
        const memberLoginButtonAfterLogout = page.locator('a:has-text("Member Login")');
        await expect(memberLoginButtonAfterLogout).toBeVisible();

        // The notification center should not be visible after logout
        const notificationCenterAfterLogout = page.locator('.notification-center-container');
        await expect(notificationCenterAfterLogout).not.toBeVisible();
    });

    test('should show error message for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await waitForPageLoad(page);

        // Try to login with invalid credentials
        await fillAndVerify(page, 'input[type="email"]', 'invalid@example.com');
        await fillAndVerify(page, 'input[type="password"]', 'wrongpassword');

        const signInButton = page.locator('button[type="submit"]:has-text("Sign In")');
        await signInButton.click();

        // Wait for error message to appear
        const errorMessage = page.locator('.error-message');
        await expect(errorMessage).toBeVisible();

        // Verify we're still on the login page (no redirect on failed login)
        await expect(page).toHaveURL('/login');
    });

    test('should require both email and password fields', async ({ page }) => {
        await page.goto('/login');
        await waitForPageLoad(page);

        // Try to submit form without filling any fields
        const signInButton = page.locator('button[type="submit"]:has-text("Sign In")');
        await signInButton.click();

        // Check that form validation prevents submission
        const emailField = page.locator('input[type="email"]');
        const passwordField = page.locator('input[type="password"]');

        // Both fields should be required
        await expect(emailField).toHaveAttribute('required');
        await expect(passwordField).toHaveAttribute('required');

        // Verify we're still on login page
        await expect(page).toHaveURL('/login');
    });

    test('should navigate to registration page from login page', async ({ page }) => {
        await page.goto('/login');
        await waitForPageLoad(page);

        // Click the registration link from the bottom of the form
        const registerLink = page.locator('.register-link a:has-text("Register")');
        await expect(registerLink).toBeVisible();
        await registerLink.click();

        // Verify navigation to registration page
        await expect(page).toHaveURL('/registration');
    });
}); 