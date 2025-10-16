import { test, expect } from '@playwright/test';

test.describe('Simple Tests', () => {
  test('should access localhost directly', async ({ page }) => {
    // Go to full URL directly
    const response = await page.goto('http://localhost:8082');
    expect(response?.ok()).toBeTruthy();

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');

    // Take a screenshot
    await page.screenshot({ path: 'simple-test.png' });

    // Check that we have some content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    expect(title).toContain('Rabbitfun');
  });

  test('should load content', async ({ page }) => {
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('domcontentloaded');

    // Look for any element with content
    const contentElements = page.locator('div, section, main, h1, h2, h3');

    // Wait a bit for content to load
    await page.waitForTimeout(2000);

    const count = await contentElements.count();
    console.log(`Found ${count} content elements`);

    expect(count).toBeGreaterThan(0);

    // Check if we can find any text
    const hasText = await page.locator('*:has-text("Launch")').count() > 0 ||
                   await page.locator('*:has-text("Token")').count() > 0 ||
                   await page.locator('*:has-text("Create")').count() > 0;

    console.log('Has relevant text:', hasText);
  });
});