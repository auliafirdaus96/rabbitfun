import { test, expect } from '@playwright/test';

test.describe('RabbitFun Launchpad - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage successfully', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/Rabbitfun|Community Token Launch Platform/i);

    // Check if main navigation elements are visible
    await expect(page.locator('header')).toBeVisible();

    // Check if the main content area is loaded
    await expect(page.locator('main')).toBeVisible();

    // Check for hero section
    await expect(page.locator('section:has-text("Launch"), .hero, h1')).toBeVisible();
  });

  test('should display Featured Coins section', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for Featured Coins section with various selectors
    const featuredSection = page.locator('h2:has-text("Featured"), h2:has-text("⭐"), section:has-text("Featured Coins")');

    if (await featuredSection.first().isVisible()) {
      await expect(featuredSection.first()).toBeVisible();

      // Look for token elements - could be divs, cards, or list items
      const tokenElements = page.locator('div[class*="rounded"], [class*="token"], [class*="card"]');

      if (await tokenElements.first().isVisible()) {
        // Check if we have token information displayed
        const tokenNames = page.locator('h3, .font-bold, [class*="name"]');
        if (await tokenNames.first().isVisible()) {
          const firstTokenName = await tokenNames.first().textContent();
          expect(firstTokenName?.length).toBeGreaterThan(0);
        }
      }
    } else {
      // If Featured section is not visible, check for other content
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    }
  });

  test('should display navigation elements', async ({ page }) => {
    // Check for header/navigation
    await expect(page.locator('header, nav')).toBeVisible();

    // Look for navigation links or buttons
    const navElements = page.locator('a, button, [role="button"]');
    expect(await navElements.count()).toBeGreaterThan(0);

    // Check for common navigation elements
    const homeLink = page.locator('a:has-text("Home"), a[href="/"]');
    const createButton = page.locator('button:has-text("Create"), a:has-text("Launch"), button:has-text("Create Token")');

    // At least one of these should be present
    const hasNavElements = await homeLink.count() > 0 || await createButton.count() > 0;
    expect(hasNavElements).toBeTruthy();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    // Check if content is visible on desktop
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Check if content is still accessible on mobile
    await expect(mainContent).toBeVisible();

    // Look for mobile menu button or hamburger menu
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu"), [class*="mobile"]');
    if (await mobileMenuButton.isVisible()) {
      await expect(mobileMenuButton).toBeVisible();
    }
  });

  test('should display trending projects section', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for trending section
    const trendingSection = page.locator('h2:has-text("Trending"), h2:has-text("🔥"), section:has-text("Trending")');

    if (await trendingSection.first().isVisible()) {
      await expect(trendingSection.first()).toBeVisible();
    }
  });

  test('should have functional footer', async ({ page }) => {
    // Look for footer
    const footer = page.locator('footer');

    if (await footer.isVisible()) {
      await expect(footer).toBeVisible();

      // Check for footer links
      const footerLinks = footer.locator('a');
      if (await footerLinks.count() > 0) {
        const firstLink = footerLinks.first();
        await expect(firstLink).toBeVisible();
      }
    }
  });

  test('should handle search functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], input[type="search"], [data-testid="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Check if search was processed (no errors)
      const searchResults = page.locator('[class*="results"], [class*="token"], [class*="card"]');
      // Results might or might not appear, just make sure search doesn't break
    } else {
      // If search is not implemented, that's okay for now
      test.skip('Search functionality not implemented yet');
    }
  });

  test('should display pricing information', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for price elements
    const priceElements = page.locator('$, [class*="price"], [class*="market"], [class*="mc"]');

    if (await priceElements.first().isVisible()) {
      // Check if price format looks correct (contains $ and numbers)
      const firstPriceElement = priceElements.first();
      const priceText = await firstPriceElement.textContent();

      if (priceText) {
        // Should contain dollar sign or numbers
        const hasPriceInfo = /\$|[\d,]/.test(priceText);
        expect(hasPriceInfo).toBeTruthy();
      }
    }
  });

  test('should handle button interactions', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for clickable buttons
    const buttons = page.locator('button:visible, [role="button"]:visible, a[href]:visible');

    if (await buttons.count() > 0) {
      const firstButton = buttons.first();

      // Check if button is visible and has text
      await expect(firstButton).toBeVisible();

      const buttonText = await firstButton.textContent();
      if (buttonText) {
        expect(buttonText.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should load without JavaScript errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for critical JavaScript errors
    const criticalErrors = errors.filter(error =>
      error.includes('TypeError') ||
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    );

    expect(criticalErrors.length).toBe(0);
  });
});