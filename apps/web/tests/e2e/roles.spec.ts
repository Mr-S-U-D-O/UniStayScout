import { test, expect } from '@playwright/test';

test.describe('Role Flows and Map Behaviors', () => {
  test('should display the login screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=Email Address')).toBeVisible();
    await expect(page.locator('text=Password')).toBeVisible();
  });

  test('should navigate to register mode', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign up here');
    await expect(page.locator('text=Create an account')).toBeVisible();
    await expect(page.locator('text=Full Name')).toBeVisible();
  });
});
