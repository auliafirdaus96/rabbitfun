import { test, expect } from '@playwright/test';

test.describe('Debug Tests', () => {
  test('should access homepage and show page structure', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check page title with correct case
    await expect(page).toHaveTitle(/Rabbitfun/i);

    // Take screenshot to see what's actually on the page
    await page.screenshot({ path: 'debug-homepage.png', fullPage: true });

    // Get page content for debugging
    const bodyText = await page.locator('body').textContent();
    console.log('Page body text:', bodyText?.substring(0, 200) + '...');

    // Check for any visible elements
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Look for common elements that might exist
    const possibleSelectors = [
      'div',
      'section',
      'h1', 'h2', 'h3',
      'button',
      'a',
      '[class*="hero"]',
      '[class*="header"]',
      '[class*="footer"]',
      '[class*="nav"]'
    ];

    let foundElements = 0;
    for (const selector of possibleSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`Found ${count} elements with selector: ${selector}`);
        foundElements++;
      }
    }

    expect(foundElements).toBeGreaterThan(0);

    // Try to find any text content
    const textElements = page.locator('h1, h2, h3, p, span, div');
    if (await textElements.first().isVisible()) {
      const firstText = await textElements.first().textContent();
      console.log('First text element:', firstText);
      expect(firstText?.length).toBeGreaterThan(0);
    }
  });

  test('should show development server is running', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();

    // Check if we're on the right URL
    expect(page.url()).toContain('localhost:8081');
  });
});