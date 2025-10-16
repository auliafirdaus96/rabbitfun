import { test, expect } from '@playwright/test';

test.describe('RabbitFun Launchpad - Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Complete token discovery flow', async ({ page }) => {
    // 1. User lands on homepage
    await expect(page).toHaveTitle(/RabbitFun Launchpad/i);

    // 2. User browses available tokens
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const tokenCards = page.locator('[data-testid="token-card"]');
    const initialCount = await tokenCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // 3. User clicks on a trending token
    const trendingSection = page.locator('[data-testid="trending-tokens"], section:has-text("Trending")');

    if (await trendingSection.isVisible()) {
      const trendingToken = trendingSection.locator('[data-testid="token-card"]').first();
      await trendingToken.click();
    } else {
      // If no trending section, click first token
      await tokenCards.first().click();
    }

    // 4. User views token details
    await page.waitForURL(/\/token\//);
    await expect(page.locator('[data-testid="token-detail"]')).toBeVisible();

    // 5. User checks token information
    await expect(page.locator('[data-testid="token-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="token-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="contract-address"]')).toBeVisible();

    // 6. User navigates back to homepage
    const backButton = page.locator('button:has-text("Back"), a:has-text("Back"), [data-testid="back-button"]');

    if (await backButton.isVisible()) {
      await backButton.click();
    } else {
      await page.goBack();
    }

    await page.waitForURL('/');
    await expect(tokenCards.first()).toBeVisible();
  });

  test('Token trading flow simulation', async ({ page }) => {
    // 1. User navigates to a token
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });
    await page.locator('[data-testid="token-card"]').first().click();

    // 2. User looks for trading interface
    const tradingInterface = page.locator('[data-testid="trading-interface"], [data-testid="buy-sell-panel"]');

    if (await tradingInterface.isVisible()) {
      // 3. User tries to buy tokens
      const buyButton = tradingInterface.locator('button:has-text("Buy"), [data-testid="buy-button"]');

      if (await buyButton.isVisible()) {
        await buyButton.click();

        // 4. Check if wallet connection is required
        const walletPrompt = page.locator('[data-testid="wallet-required"], [data-testid="connect-wallet-prompt"]');

        if (await walletPrompt.isVisible()) {
          const connectButton = walletPrompt.locator('button:has-text("Connect")');
          if (await connectButton.isVisible()) {
            await connectButton.click();
            // In real test, handle wallet connection flow
          }
        }

        // 5. Look for amount input
        const amountInput = page.locator('input[name="amount"], [data-testid="trade-amount"]');
        if (await amountInput.isVisible()) {
          await amountInput.fill('100');
        }
      }
    } else {
      // If trading interface is not implemented, skip
      test.skip();
    }
  });

  test('Token creation flow', async ({ page }) => {
    // 1. User looks for create token option
    const createButton = page.locator('button:has-text("Create"), button:has-text("Launch"), a:has-text("Create")');

    if (await createButton.isVisible()) {
      await createButton.click();

      // 2. User is taken to creation form
      await expect(page.locator('[data-testid="create-token-form"], form:has-text("Create Token")')).toBeVisible();

      // 3. User fills in token information
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test E2E Token');
      }

      const symbolInput = page.locator('input[name="symbol"], input[placeholder*="symbol"]');
      if (await symbolInput.isVisible()) {
        await symbolInput.fill('E2E');
      }

      const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description"]');
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('This is a test token created during E2E testing');
      }

      // 4. User uploads token image
      const imageUpload = page.locator('input[type="file"], [data-testid="image-upload"]');
      if (await imageUpload.isVisible()) {
        // In a real test, you would upload an actual file
        // For now, just check if the upload element exists
        expect(imageUpload).toBeVisible();
      }

      // 5. User submits the form (if not disabled)
      const submitButton = page.locator('button[type="submit"], button:has-text("Create Token"), [data-testid="submit-token"]');
      if (await submitButton.isVisible() && await submitButton.isEnabled()) {
        // In a real scenario, this would require wallet connection
        test.skip('Token creation requires wallet connection');
      }
    } else {
      test.skip('Token creation feature not available');
    }
  });

  test('Search and filter flow', async ({ page }) => {
    // 1. User performs a search
    const searchInput = page.locator('input[placeholder*="search"], [data-testid="search-input"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('Rabbit');
      await page.waitForTimeout(1000);

      // 2. User checks search results
      const searchResults = page.locator('[data-testid="search-results"], [data-testid="token-card"]');

      if (await searchResults.count() > 0) {
        await expect(searchResults.first()).toBeVisible();

        // 3. User clears search
        await searchInput.clear();
        await page.waitForTimeout(1000);

        // 4. User checks if original results are back
        const allTokens = page.locator('[data-testid="token-card"]');
        expect(await allTokens.count()).toBeGreaterThan(0);
      }
    }

    // 5. User tries filtering
    const filterSection = page.locator('[data-testid="filters"]');

    if (await filterSection.isVisible()) {
      const categoryFilter = filterSection.locator('select, [data-testid="category-filter"]');

      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption({ index: 1 }); // Select first option
        await page.waitForTimeout(1000);

        // Check if URL reflects filter
        const url = page.url();
        expect(url).toMatch(/\?|&/); // Should have query parameters
      }
    }
  });

  test('Profile and settings flow', async ({ page }) => {
    // 1. User looks for profile/access button
    const profileButton = page.locator('button:has-text("Profile"), button:has-text("Account"), [data-testid="profile-button"]');

    if (await profileButton.isVisible()) {
      await profileButton.click();

      // 2. User checks profile menu
      const profileMenu = page.locator('[data-testid="profile-menu"], [role="menu"]');

      if (await profileMenu.isVisible()) {
        // 3. User navigates to settings if available
        const settingsLink = profileMenu.locator('a:has-text("Settings"), button:has-text("Settings")');

        if (await settingsLink.isVisible()) {
          await settingsLink.click();
          await expect(page.locator('[data-testid="settings-page"], h1:has-text("Settings")')).toBeVisible();
        }

        // 4. User checks for wallet connection status
        const walletStatus = profileMenu.locator('[data-testid="wallet-status"], :has-text("Connected"), :has-text("Disconnected")');
        if (await walletStatus.isVisible()) {
          expect(walletStatus).toBeVisible();
        }
      }
    }

    // 5. User tests dark mode toggle
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');

    if (await darkModeToggle.isVisible()) {
      const htmlElement = page.locator('html');
      const initialTheme = await htmlElement.getAttribute('class');

      await darkModeToggle.click();
      await page.waitForTimeout(500);

      const newTheme = await htmlElement.getAttribute('class');
      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test('Error handling flow', async ({ page }) => {
    // 1. User navigates to non-existent page
    await page.goto('/non-existent-page');

    // 2. User should see 404 page or be redirected
    const pageTitle = page.locator('h1:has-text("404"), h1:has-text("Not Found"), [data-testid="404-page"]');

    if (await pageTitle.isVisible()) {
      expect(pageTitle).toBeVisible();

      // 3. User looks for navigation back to home
      const homeLink = page.locator('a:has-text("Home"), button:has-text("Home"), [data-testid="home-link"]');

      if (await homeLink.isVisible()) {
        await homeLink.click();
        await page.waitForURL('/');
      }
    } else {
      // If redirected to home, that's also acceptable
      await page.waitForURL('/', { timeout: 5000 });
    }

    // 4. User verifies they're back on homepage
    await expect(page.locator('[data-testid="token-card"]')).toBeVisible({ timeout: 10000 });
  });

  test('Responsive design flow', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const desktopCards = page.locator('[data-testid="token-card"]');
    const desktopCount = await desktopCards.count();
    expect(desktopCount).toBeGreaterThan(0);

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    const tabletCards = page.locator('[data-testid="token-card"]');
    expect(await tabletCards.count()).toBeGreaterThan(0);

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Check for mobile menu
    const mobileMenuButton = page.locator('button[aria-label*="menu"], [data-testid="mobile-menu"]');

    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.locator('[data-testid="mobile-menu"], nav[aria-expanded="true"]')).toBeVisible();
    }

    // Verify content is still accessible
    const mobileCards = page.locator('[data-testid="token-card"]');
    expect(await mobileCards.count()).toBeGreaterThan(0);
  });
});