import { test, expect } from '@playwright/test';

test.describe('HackHub Authentication E2E', () => {
  test('E2E-001: Login page renders correctly', async ({ page }) => {
    await page.goto('/auth?panel=login');

    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('E2E-002: Registration page renders correctly', async ({ page }) => {
    await page.goto('/auth?panel=register');

    await expect(page.locator('#register-name')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  });

  test('E2E-003: Login form displays Zod validation errors for empty fields', async ({ page }) => {
    await page.goto('/auth?panel=login');

    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.locator('#login-email-error')).toBeVisible();
    await expect(page.locator('#login-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true');
  });
});
