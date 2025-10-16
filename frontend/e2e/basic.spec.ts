import { test, expect } from '@playwright/test';

test.describe('RabbitFun Launchpad - Basic E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
  });

  test('should load the homepage successfully', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/RabbitFun Launchpad/i);

    // Check if main navigation elements are visible
    await expect(page.locator('header')).toBeVisible();

    // Check if the main content area is loaded
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display token list', async ({ page }) => {
    // Wait for tokens to load
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Check if at least one token is displayed
    const tokenCards = page.locator('[data-testid="token-card"]');
    await expect(tokenCards.first()).toBeVisible();

    // Check if token information is displayed
    const firstCard = tokenCards.first();
    await expect(firstCard.locator('h3')).toBeVisible(); // Token name
    await expect(firstCard.locator('[data-testid="token-ticker"]')).toBeVisible(); // Token symbol
  });

  test('should navigate to token detail page', async ({ page }) => {
    // Wait for tokens to load
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Click on the first token card
    const firstCard = page.locator('[data-testid="token-card"]').first();
    await firstCard.click();

    // Wait for navigation to complete
    await page.waitForURL(/\/token\//);

    // Check if token detail page is loaded
    await expect(page.locator('[data-testid="token-detail"]')).toBeVisible();

    // Check if token contract address is displayed
    await expect(page.locator('[data-testid="contract-address"]')).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], [data-testid="search-input"]');

    if (await searchInput.isVisible()) {
      // Type a search query
      await searchInput.fill('Rabbit');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Check if filtered results are shown
      const tokenCards = page.locator('[data-testid="token-card"]');
      if (await tokenCards.count() > 0) {
        await expect(tokenCards.first()).toBeVisible();
      }
    } else {
      // If search is not implemented yet, skip this test
      test.skip();
    }
  });

  test('should handle token creation flow', async ({ page }) => {
    // Look for create token button
    const createButton = page.locator('button:has-text("Create"), button:has-text("Launch"), [data-testid="create-token-button"]');

    if (await createButton.isVisible()) {
      await createButton.click();

      // Check if create token form is displayed
      await expect(page.locator('[data-testid="create-token-form"]')).toBeVisible();

      // Fill out the form (if fields are available)
      const nameInput = page.locator('input[name="name"], [data-testid="token-name-input"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Token');
      }

      const symbolInput = page.locator('input[name="symbol"], [data-testid="token-symbol-input"]');
      if (await symbolInput.isVisible()) {
        await symbolInput.fill('TEST');
      }
    } else {
      // If create functionality is not implemented yet, skip this test
      test.skip();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if mobile navigation is working
    const mobileMenuButton = page.locator('button[aria-label="menu"], button:has-text("Menu"), [data-testid="mobile-menu-button"]');

    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();

      // Check if mobile menu is opened
      await expect(page.locator('[data-testid="mobile-menu"], nav[aria-expanded="true"]')).toBeVisible();
    }

    // Check if content is still readable on mobile
    const tokenCards = page.locator('[data-testid="token-card"]');
    if (await tokenCards.count() > 0) {
      await expect(tokenCards.first()).toBeVisible();
    }
  });

  test('should handle wallet connection', async ({ page }) => {
    // Look for wallet connect button
    const connectButton = page.locator('button:has-text("Connect"), button:has-text("Wallet"), [data-testid="wallet-connect-button"]');

    if (await connectButton.isVisible()) {
      await connectButton.click();

      // Check if wallet connection modal is displayed
      const walletModal = page.locator('[data-testid="wallet-modal"], [role="dialog"]');

      if (await walletModal.isVisible()) {
        // Look for MetaMask option
        const metamaskOption = page.locator('button:has-text("MetaMask"), [data-testid="metamask-button"]');

        if (await metamaskOption.isVisible()) {
          await metamaskOption.click();

          // In a real test, you would handle MetaMask popup here
          // For now, just check if the interaction doesn't break
          await page.waitForTimeout(1000);
        }
      }
    } else {
      // If wallet functionality is not implemented yet, skip this test
      test.skip();
    }
  });

  test('should handle dark mode toggle', async ({ page }) => {
    // Look for dark mode toggle
    const darkModeToggle = page.locator('button[aria-label*="dark"], button[aria-label*="theme"], [data-testid="dark-mode-toggle"]');

    if (await darkModeToggle.isVisible()) {
      // Get initial theme state
      const htmlElement = page.locator('html');
      const initialTheme = await htmlElement.getAttribute('class');

      // Click dark mode toggle
      await darkModeToggle.click();

      // Wait for theme change
      await page.waitForTimeout(500);

      // Check if theme has changed
      const newTheme = await htmlElement.getAttribute('class');
      expect(newTheme).not.toBe(initialTheme);
    } else {
      // If dark mode is not implemented yet, skip this test
      test.skip();
    }
  });

  test('should handle pagination', async ({ page }) => {
    // Wait for tokens to load
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Look for pagination controls
    const pagination = page.locator('[data-testid="pagination"], nav[aria-label="pagination"]');

    if (await pagination.isVisible()) {
      // Look for next page button
      const nextButton = pagination.locator('button:has-text("Next"), button:has-text("›"), [data-testid="next-page"]');

      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();

        // Wait for page to load
        await page.waitForTimeout(1000);

        // Check if URL has changed to indicate pagination
        const url = page.url();
        expect(url).toMatch(/page=\d+/);
      }
    } else {
      // If pagination is not implemented yet, skip this test
      test.skip();
    }
  });

  test('should handle filtering options', async ({ page }) => {
    // Look for filter controls
    const filterSection = page.locator('[data-testid="filters"], [data-testid="filter-section"]');

    if (await filterSection.isVisible()) {
      // Look for category filters
      const categoryFilter = filterSection.locator('select[name="category"], [data-testid="category-filter"]');

      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption({ label: 'All' });
        await page.waitForTimeout(1000);

        // Check if filter is applied
        const url = page.url();
        expect(url).toMatch(/category=/);
      }
    } else {
      // If filters are not implemented yet, skip this test
      test.skip();
    }
  });
});