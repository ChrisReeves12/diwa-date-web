import { test, expect, Page } from '@playwright/test';
import { fillAndVerify, waitForPageLoad, takeScreenshot, cleanupTestUser, selectLocationFromAutocomplete } from './utils/test-helpers';

test.describe.serial('Registration', () => {
    const registrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@test.com',
        location: 'Torrance, CA, USA',
        userGender: 'male' as const,
        seekingGender: 'female' as const,
        password: 'Password1!',
        dateOfBirth: '1987-10-20'
    };

    test.beforeEach(async ({ page, context }) => {
        await context.clearCookies();
        await cleanupTestUser(page, registrationData.email);
    });

    test.afterEach(async ({ page }) => {
        await cleanupTestUser(page, registrationData.email);
    });

    test('should successfully register a new user', async ({ page }) => {
        // Navigate to registration
        await page.goto('/registration');
        await waitForPageLoad(page);

        expect(page).toHaveURL('/registration');
        expect(page).toHaveTitle(/Registration/i);

        // Skip gender selection for now and fill out personal information
        await fillAndVerify(page, 'input[name="firstName"]', registrationData.firstName);
        await fillAndVerify(page, 'input[name="lastName"]', registrationData.lastName);
        await fillAndVerify(page, 'input[name="email"]', registrationData.email);
        await fillAndVerify(page, 'input[name="password"]', registrationData.password);
        await fillAndVerify(page, 'input[name="confirmPassword"]', registrationData.password);
        await fillAndVerify(page, 'input[name="dateOfBirth"]', registrationData.dateOfBirth);
        await selectGenderOptions(page, registrationData.userGender, registrationData.seekingGender);

        // Handle location autocomplete selection
        await selectLocationFromAutocomplete(page, 'torrance', 'Torrance, CA, USA');

        // Accept terms of service
        await acceptTermsOfService(page);

        // Submit the form
        const submitButton = page.locator('button[type="submit"]:has-text("Create Account")');
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        await page.waitForURL('/', { timeout: 10000 });
        expect(page).toHaveTitle(/Search/i);
    });
});

/**
 * Accept terms
 */
async function acceptTermsOfService(page: Page) {
    // Find the terms of service checkbox container
    const termsContainer = page.locator('.terms-of-service-container');
    await expect(termsContainer).toBeVisible();

    // Find the checkbox element inside the container
    const checkbox = termsContainer.locator('.checkbox-container');
    await expect(checkbox).toBeVisible();

    // Check if it's already checked
    const isChecked = await checkbox.evaluate(el => el.classList.contains('checked'));

    if (!isChecked) {
        await checkbox.click();

        // Verify it got checked
        await expect(checkbox).toHaveClass(/checked/);
    }
}

/**
 * Select gender options in the registration form
 */
export async function selectGenderOptions(page: Page, userGender: 'male' | 'female', seekingGender: 'male' | 'female') {
    const radioSections = page.locator('.radio-button-section');
    const sectionCount = await radioSections.count();

    if (sectionCount === 1) {
        const radioSection = radioSections.first();
        const iAmSection = radioSection.locator('.choice-container').first();
        const lookingForSection = radioSection.locator('.choice-container').nth(1);

        expect(iAmSection).toBeVisible();
        expect(lookingForSection).toBeVisible();

        const userGenderOption = iAmSection.locator(`#user-sex-choice-${userGender}`);
        const seekingGenderOption = lookingForSection.locator(`#seeking-sex-choice-${seekingGender}`);

        expect(userGenderOption).toBeVisible();
        expect(seekingGenderOption).toBeVisible();

        await userGenderOption.click();
        await seekingGenderOption.click();
    } else {
        throw new Error(`Expected 1 radio section for gender selection, but found ${sectionCount}. The form structure might be different than expected.`);
    }
}