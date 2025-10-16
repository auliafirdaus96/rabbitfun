import { test, expect } from '@playwright/test';

test.describe('RabbitFun - Enhanced E2E Tests', () => {
  test('should load homepage with core elements', async ({ page }) => {
    // Go to full URL directly
    const response = await page.goto('http://localhost:8082');
    expect(response?.ok()).toBeTruthy();

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');

    // Check page title
    const title = await page.title();
    expect(title).toContain('Rabbitfun');
    console.log('✅ Page title:', title);

    // Check header exists
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    console.log('✅ Header visible');

    // Check hero section exists
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    console.log('✅ Hero section visible');

    // Check main content exists
    await expect(page.locator('main')).toBeVisible();
    console.log('✅ Main content visible');

    // Take a screenshot
    await page.screenshot({ path: 'homepage-test.png', fullPage: true });
    console.log('✅ Screenshot taken');
  });

  test('should display create token button', async ({ page }) => {
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('domcontentloaded');

    // Check for create token button
    const createButton = page.locator('[data-testid="create-token-button"]');

    // Wait for button to be visible
    await expect(createButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Create token button visible');

    // Check button text
    const buttonText = await createButton.textContent();
    expect(buttonText).toContain('Create Token');
    console.log('✅ Create button text:', buttonText);

    // Check if button is clickable
    expect(await createButton.isEnabled()).toBeTruthy();
    console.log('✅ Create button is enabled');
  });

  test('should display connect wallet button', async ({ page }) => {
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('domcontentloaded');

    // Check for connect wallet button
    const connectButton = page.locator('[data-testid="connect-wallet-button"]');

    // Wait for button to be visible
    await expect(connectButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Connect wallet button visible');

    // Check button text
    const buttonText = await connectButton.textContent();
    expect(buttonText).toContain('Connect Wallet');
    console.log('✅ Connect button text:', buttonText);

    // Check if button is clickable
    expect(await connectButton.isEnabled()).toBeTruthy();
    console.log('✅ Connect button is enabled');
  });

  test('should have RabbitFun branding', async ({ page }) => {
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('domcontentloaded');

    // Look for RabbitFun text in hero section
    const heroTitle = page.locator('[data-testid="hero-section"] h1 span');
    await expect(heroTitle).toBeVisible();

    const brandText = await heroTitle.textContent();
    expect(brandText).toBe('RabbitFun');
    console.log('✅ Brand text visible:', brandText);

    // Look for tagline
    const tagline = page.locator('[data-testid="hero-section"] p span');
    if (await tagline.isVisible()) {
      const taglineText = await tagline.textContent();
      console.log('✅ Tagline visible:', taglineText);
    }
  });

  test('should handle responsive design', async ({ page }) => {
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('domcontentloaded');

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    const header = page.locator('[data-testid="header"]');
    await expect(header).toBeVisible();
    console.log('✅ Desktop header visible');

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    await expect(header).toBeVisible();
    console.log('✅ Mobile header visible');

    // Check if create token button adapts to mobile
    const createButton = page.locator('[data-testid="create-token-button"]');
    const mobileCreateButton = page.locator('button:has-text("🚀")');

    // Either desktop or mobile button should be visible
    const hasCreateButton = await createButton.isVisible() || await mobileCreateButton.isVisible();
    expect(hasCreateButton).toBeTruthy();
    console.log('✅ Responsive create button working');
  });

  test('should load without console errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:8082');
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Check for critical JavaScript errors
    const criticalErrors = errors.filter(error =>
      error.includes('TypeError') ||
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    );

    console.log(`Console errors found: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    expect(criticalErrors.length).toBe(0);
    console.log('✅ No critical JavaScript errors');
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('domcontentloaded');

    // Check for proper HTML structure
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('head')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();

    // Check for meta tags
    const metaDescription = page.locator('meta[name="description"]');
    if (await metaDescription.isVisible()) {
      const description = await metaDescription.getAttribute('content');
      console.log('✅ Meta description found:', description?.substring(0, 50) + '...');
    }

    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    expect(await viewport.isVisible()).toBeTruthy();
    console.log('✅ Viewport meta tag found');

    // Check for proper heading structure
    const h1 = page.locator('h1');
    expect(await h1.count()).toBeGreaterThan(0);
    console.log('✅ H1 tag found');
  });
});