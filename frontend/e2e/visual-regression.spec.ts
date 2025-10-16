import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should match homepage screenshot', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Take a full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match token list screenshot', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Focus on the token list area
    const tokenList = page.locator('main, [data-testid="token-list"], .container');
    await expect(tokenList.first()).toBeVisible();

    // Take screenshot of token list
    await expect(tokenList.first()).toHaveScreenshot('token-list.png', {
      animations: 'disabled',
    });
  });

  test('should match individual token card screenshot', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const firstTokenCard = page.locator('[data-testid="token-card"]').first();
    await expect(firstTokenCard).toBeVisible();

    // Take screenshot of token card
    await expect(firstTokenCard).toHaveScreenshot('token-card.png', {
      animations: 'disabled',
    });
  });

  test('should match token detail page screenshot', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });
    await page.locator('[data-testid="token-card"]').first().click();

    // Wait for token detail page to load
    await page.waitForURL(/\/token\//);
    await page.waitForSelector('[data-testid="token-detail"]', { timeout: 10000 });

    // Take full page screenshot of token detail
    await expect(page).toHaveScreenshot('token-detail.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match navigation screenshot', async ({ page }) => {
    await page.waitForSelector('header, nav', { timeout: 10000 });

    const navigation = page.locator('header, nav');
    await expect(navigation.first()).toBeVisible();

    // Take screenshot of navigation
    await expect(navigation.first()).toHaveScreenshot('navigation.png', {
      animations: 'disabled',
    });
  });

  test('should match search interface screenshot', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const searchInput = page.locator('input[placeholder*="search"], [data-testid="search-input"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('Rabbit');
      await page.waitForTimeout(1000);

      // Take screenshot of search results
      const searchResults = page.locator('[data-testid="search-results"], main');
      if (await searchResults.isVisible()) {
        await expect(searchResults).toHaveScreenshot('search-results.png', {
          animations: 'disabled',
        });
      }
    } else {
      test.skip('Search functionality not available');
    }
  });

  test('should match mobile viewport screenshots', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Take mobile homepage screenshot
    await expect(page).toHaveScreenshot('mobile-homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test mobile menu if present
    const mobileMenuButton = page.locator('button[aria-label*="menu"], [data-testid="mobile-menu-button"]');

    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);

      // Take screenshot of mobile menu
      await expect(page).toHaveScreenshot('mobile-menu.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match tablet viewport screenshots', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Take tablet homepage screenshot
    await expect(page).toHaveScreenshot('tablet-homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match dark mode screenshots', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');

    if (await darkModeToggle.isVisible()) {
      // Take light mode screenshot first
      await expect(page).toHaveScreenshot('light-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });

      // Switch to dark mode
      await darkModeToggle.click();
      await page.waitForTimeout(1000);

      // Take dark mode screenshot
      await expect(page).toHaveScreenshot('dark-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
    } else {
      test.skip('Dark mode functionality not available');
    }
  });

  test('should match hover states', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const firstTokenCard = page.locator('[data-testid="token-card"]').first();
    await expect(firstTokenCard).toBeVisible();

    // Hover over token card
    await firstTokenCard.hover();
    await page.waitForTimeout(300);

    // Take screenshot of hover state
    await expect(firstTokenCard).toHaveScreenshot('token-card-hover.png', {
      animations: 'disabled',
    });
  });

  test('should match loading states', async ({ page }) => {
    // Test loading state by visiting a fresh page
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Quick screenshot to catch loading states
    await expect(page).toHaveScreenshot('loading-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match error states', async ({ page }) => {
    // Navigate to a non-existent page to test 404
    await page.goto('/non-existent-page', { waitUntil: 'networkidle' });

    // Take screenshot of error page
    await expect(page).toHaveScreenshot('error-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match form interactions', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const createButton = page.locator('button:has-text("Create"), [data-testid="create-token-button"]');

    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for form to load
      await page.waitForSelector('form, [data-testid="create-token-form"]', { timeout: 5000 });

      // Take screenshot of form
      const form = page.locator('form, [data-testid="create-token-form"]');
      if (await form.isVisible()) {
        await expect(form).toHaveScreenshot('create-token-form.png', {
          animations: 'disabled',
        });
      }
    } else {
      test.skip('Create token functionality not available');
    }
  });

  test('should match modal/overlay screenshots', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Look for buttons that might open modals
    const actionButton = page.locator('button:has-text("Connect"), button:has-text("Trade"), button:has-text("Details")');

    if (await actionButton.first().isVisible()) {
      await actionButton.first().click();
      await page.waitForTimeout(500);

      // Look for modal
      const modal = page.locator('[role="dialog"], [data-testid="modal"], .modal');

      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('modal.png', {
          animations: 'disabled',
        });
      }
    } else {
      test.skip('Modal functionality not available');
    }
  });

  test('should match different font sizes', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Test with larger font size
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addStyleTag({
      content: 'body { font-size: 18px; }',
    });

    await expect(page).toHaveScreenshot('large-font-size.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test with smaller font size
    await page.addStyleTag({
      content: 'body { font-size: 14px; }',
    });

    await expect(page).toHaveScreenshot('small-font-size.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match high contrast mode', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Emulate high contrast mode
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });

    await expect(page).toHaveScreenshot('high-contrast-mode.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match reduced motion preferences', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await expect(page).toHaveScreenshot('reduced-motion.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Component Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should match button variations', async ({ page }) => {
    await page.waitForSelector('button', { timeout: 10000 });

    // Find different button types
    const primaryButton = page.locator('button:has-text("Create"), button:has-text("Launch")');
    const secondaryButton = page.locator('button:has-text("Connect"), button:has-text("Trade")');
    const iconButton = page.locator('button svg').first();

    if (await primaryButton.first().isVisible()) {
      await expect(primaryButton.first()).toHaveScreenshot('primary-button.png');
    }

    if (await secondaryButton.first().isVisible()) {
      await expect(secondaryButton.first()).toHaveScreenshot('secondary-button.png');
    }

    if (await iconButton.locator('..').isVisible()) {
      await expect(iconButton.locator('..')).toHaveScreenshot('icon-button.png');
    }
  });

  test('should match input field variations', async ({ page }) => {
    // Look for forms with input fields
    const createButton = page.locator('button:has-text("Create")');

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const textInput = page.locator('input[type="text"], input[type="search"]').first();
      const selectInput = page.locator('select').first();
      const textArea = page.locator('textarea').first();

      if (await textInput.isVisible()) {
        await expect(textInput).toHaveScreenshot('text-input.png');
      }

      if (await selectInput.isVisible()) {
        await expect(selectInput).toHaveScreenshot('select-input.png');
      }

      if (await textArea.isVisible()) {
        await expect(textArea).toHaveScreenshot('textarea-input.png');
      }
    } else {
      test.skip('Form with inputs not available');
    }
  });

  test('should match card component variations', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const tokenCards = page.locator('[data-testid="token-card"]');
    const cardCount = await tokenCards.count();

    // Take screenshots of different card states
    if (cardCount > 0) {
      // First card (normal state)
      await expect(tokenCards.first()).toHaveScreenshot('card-normal.png');

      // Hover state
      await tokenCards.first().hover();
      await page.waitForTimeout(300);
      await expect(tokenCards.first()).toHaveScreenshot('card-hover.png');

      // If there are multiple cards, check if they have different states
      if (cardCount > 1) {
        await expect(tokenCards.nth(1)).toHaveScreenshot('card-variation.png');
      }
    }
  });

  test('should match navigation components', async ({ page }) => {
    await page.waitForSelector('header, nav', { timeout: 10000 });

    const navigation = page.locator('header, nav');
    await expect(navigation.first()).toHaveScreenshot('navigation-component.png');

    // Check for mobile navigation
    const mobileMenuButton = page.locator('button[aria-label*="menu"]');

    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);

      const mobileMenu = page.locator('[data-testid="mobile-menu"], nav[aria-expanded="true"]');
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toHaveScreenshot('mobile-navigation.png');
      }
    }
  });

  test('should match loading and skeleton components', async ({ page }) => {
    // Navigate to a page quickly to catch loading states
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Look for skeleton loaders or loading indicators
    const skeleton = page.locator('[data-testid="skeleton"], .skeleton, [class*="skeleton"]');
    const spinner = page.locator('[data-testid="spinner"], .spinner, [class*="loading"], [class*="spinner"]');

    if (await skeleton.first().isVisible()) {
      await expect(skeleton.first()).toHaveScreenshot('skeleton-loader.png');
    }

    if (await spinner.first().isVisible()) {
      await expect(spinner.first()).toHaveScreenshot('loading-spinner.png');
    }
  });
});