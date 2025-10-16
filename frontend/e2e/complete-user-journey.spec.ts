import { test, expect } from '@playwright/test';
import { generateRandomWallet } from '../utils/test-helpers';

test.describe('Complete User Journey - Rabbit Launchpad', () => {
  let userWallet: string;
  let createdTokenAddress: string;

  test.beforeEach(async ({ page }) => {
    // Generate a random wallet for each test
    userWallet = generateRandomWallet();

    // Mock wallet connection
    await page.addInitScript(() => {
      window.ethereum = {
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') {
            return [window.testWallet];
          }
          if (method === 'eth_chainId') {
            return '0x38'; // BSC Mainnet
          }
          return null;
        },
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.evaluate((wallet) => {
      window.testWallet = wallet;
    }, userWallet);
  });

  test('Complete token creation and trading flow', async ({ page }) => {
    // 1. Navigate to the platform
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Rabbit');

    // 2. Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');

    // Wait for wallet connection modal and mock approval
    await page.waitForSelector('[data-testid="wallet-connect-modal"]');
    await page.click('[data-testid="approve-connection"]');

    // Verify wallet is connected
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-address"]')).toContainText(
      userWallet.substring(0, 6) + '...' + userWallet.substring(userWallet.length - 4)
    );

    // 3. Navigate to token creation
    await page.click('[data-testid="create-token-button"]');

    // 4. Fill token creation form
    await page.fill('[data-testid="token-name"]', 'Test Token ' + Date.now());
    await page.fill('[data-testid="token-symbol"]', 'TEST' + Math.floor(Math.random() * 1000));
    await page.fill('[data-testid="token-description"]', 'A test token for E2E testing purposes');

    // Add social links
    await page.fill('[data-testid="token-twitter"]', '@testtoken');
    await page.fill('[data-testid="token-telegram"]', 'https://t.me/testtoken');
    await page.fill('[data-testid="token-website"]', 'https://testtoken.com');

    // Upload token image (if file input exists)
    const imageInput = page.locator('[data-testid="token-image"]');
    if (await imageInput.isVisible()) {
      await imageInput.setInputFiles('tests/fixtures/token-image.png');
    }

    // 5. Submit token creation
    await page.click('[data-testid="create-token-submit"]');

    // 6. Handle transaction confirmation
    await page.waitForSelector('[data-testid="transaction-modal"]');
    await page.click('[data-testid="confirm-transaction"]');

    // 7. Wait for token creation success
    await page.waitForSelector('[data-testid="token-created-success"]');
    await expect(page.locator('[data-testid="token-created-success"]')).toContainText('Token created successfully');

    // 8. Get the created token address
    const addressElement = page.locator('[data-testid="token-address"]');
    await expect(addressElement).toBeVisible();
    createdTokenAddress = await addressElement.textContent();

    // 9. Navigate to token page
    await page.click('[data-testid="view-token-button"]');

    // 10. Verify token page loads correctly
    await expect(page.locator('[data-testid="token-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="token-name"]')).toContainText('Test Token');

    // 11. Test buying tokens
    await page.click('[data-testid="buy-tokens-button"]');

    // Fill buy form
    await page.fill('[data-testid="buy-amount"]', '0.1');

    // Calculate expected tokens (mock calculation)
    const expectedTokens = '10000000'; // Mock value

    await page.click('[data-testid="confirm-buy"]');

    // 12. Handle buy transaction
    await page.waitForSelector('[data-testid="buy-transaction-modal"]');
    await page.click('[data-testid="confirm-buy-transaction"]');

    // 13. Wait for buy success
    await page.waitForSelector('[data-testid="buy-success"]');
    await expect(page.locator('[data-testid="buy-success"]')).toContainText('Tokens purchased successfully');

    // 14. Verify token stats updated
    const raisedAmount = page.locator('[data-testid="raised-amount"]');
    await expect(raisedAmount).toBeVisible();

    const holderCount = page.locator('[data-testid="holder-count"]');
    await expect(holderCount).toContainText('1');

    // 15. Test selling tokens
    await page.click('[data-testid="sell-tokens-button"]');

    // Fill sell form
    await page.fill('[data-testid="sell-amount"]', expectedTokens);

    await page.click('[data-testid="confirm-sell"]');

    // 16. Handle sell transaction
    await page.waitForSelector('[data-testid="sell-transaction-modal"]');
    await page.click('[data-testid="confirm-sell-transaction"]');

    // 17. Wait for sell success
    await page.waitForSelector('[data-testid="sell-success"]');
    await expect(page.locator('[data-testid="sell-success"]')).toContainText('Tokens sold successfully');

    // 18. Navigate back to home
    await page.click('[data-testid="back-to-home"]');

    // 19. Verify token appears in listings
    await page.fill('[data-testid="search-input"]', 'TEST');
    await expect(page.locator(`[data-testid="token-card-${createdTokenAddress}"]`)).toBeVisible();
  });

  test('User dashboard and portfolio management', async ({ page }) => {
    // Connect wallet first
    await page.goto('/');
    await page.click('[data-testid="connect-wallet-button"]');
    await page.waitForSelector('[data-testid="wallet-connect-modal"]');
    await page.click('[data-testid="approve-connection"]');

    // Navigate to dashboard
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="dashboard-link"]');

    // Verify dashboard loads
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();

    // Check portfolio section
    await expect(page.locator('[data-testid="portfolio-section"]')).toBeVisible();

    // Check created tokens section
    await expect(page.locator('[data-testid="created-tokens-section"]')).toBeVisible();

    // Check transaction history
    await expect(page.locator('[data-testid="transaction-history"]')).toBeVisible();

    // Test profile editing
    await page.click('[data-testid="edit-profile-button"]');

    await page.fill('[data-testid="profile-username"]', 'testuser' + Date.now());
    await page.fill('[data-testid="profile-email"]', 'test@example.com');
    await page.fill('[data-testid="profile-bio"]', 'E2E test user bio');

    await page.click('[data-testid="save-profile"]');

    // Verify success message
    await expect(page.locator('[data-testid="profile-saved-success"]')).toBeVisible();
  });

  test('Token discovery and filtering', async ({ page }) => {
    await page.goto('/');

    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'Rabbit');
    await page.click('[data-testid="search-button"]');

    // Verify search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // Test filtering options
    await page.click('[data-testid="filter-dropdown"]');

    // Filter by verified tokens
    await page.click('[data-testid="filter-verified"]');
    await page.click('[data-testid="apply-filters"]');

    // Verify filtered results
    const tokenCards = page.locator('[data-testid="token-card"]');
    const count = await tokenCards.count();

    if (count > 0) {
      // Check that all shown tokens are verified
      for (let i = 0; i < count; i++) {
        await expect(tokenCards.nth(i).locator('[data-testid="verified-badge"]')).toBeVisible();
      }
    }

    // Test sorting
    await page.click('[data-testid="sort-dropdown"]');
    await page.click('[data-testid="sort-by-market-cap"]');

    // Verify sorting is applied
    await expect(page.locator('[data-testid="sorting-applied"]')).toBeVisible();

    // Test pagination
    if (count > 0) {
      await page.click('[data-testid="next-page"]');
      await page.waitForLoadState('networkidle');
    }
  });

  test('Error handling and edge cases', async ({ page }) => {
    await page.goto('/');

    // Test wallet connection failure
    await page.route('**/api/auth/connect', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Connection failed'
        })
      });
    });

    await page.click('[data-testid="connect-wallet-button"]');
    await page.waitForSelector('[data-testid="connection-error"]');
    await expect(page.locator('[data-testid="connection-error"]')).toContainText('Connection failed');

    // Test insufficient balance error
    await page.unroute('**/api/auth/connect');
    await page.goto('/token/0x1234567890123456789012345678901234567890');

    await page.route('**/api/tokens/calculate/buy', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Insufficient balance'
        })
      });
    });

    await page.click('[data-testid="buy-tokens-button"]');
    await page.fill('[data-testid="buy-amount"]', '1000');
    await page.click('[data-testid="confirm-buy"]');

    await expect(page.locator('[data-testid="insufficient-balance-error"]')).toBeVisible();

    // Test network error handling
    await page.route('**/api/tokens/**', route => {
      route.abort('failed');
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
  });

  test('Responsive design testing', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Test mobile token creation flow
    await page.click('[data-testid="mobile-create-token"]');
    await expect(page.locator('[data-testid="mobile-token-form"]')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    // Verify tablet layout
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    // Verify desktop layout
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  test('Accessibility testing', async ({ page }) => {
    await page.goto('/');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Skip to main content
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Test ARIA labels
    const connectButton = page.locator('[data-testid="connect-wallet-button"]');
    await expect(connectButton).toHaveAttribute('aria-label');

    // Test color contrast (basic check)
    const primaryButton = page.locator('[data-testid="create-token-button"]');
    const styles = await primaryButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      };
    });

    // Verify colors are not the same (basic contrast check)
    expect(styles.color).not.toBe(styles.backgroundColor);

    // Test screen reader compatibility
    await page.goto('/');
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toHaveAttribute('role', 'heading');
  });

  test('Performance testing', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Test search performance
    const searchStart = Date.now();
    await page.fill('[data-testid="search-input"]', 'test');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="search-results"]');
    const searchTime = Date.now() - searchStart;

    // Search should complete within 1 second
    expect(searchTime).toBeLessThan(1000);

    // Test token creation performance
    await page.click('[data-testid="create-token-button"]');
    const formStart = Date.now();
    await page.fill('[data-testid="token-name"]', 'Performance Test');
    await page.fill('[data-testid="token-symbol"]', 'PERF');
    await page.fill('[data-testid="token-description"]', 'Testing form performance');
    const formTime = Date.now() - formStart;

    // Form should be responsive within 100ms
    expect(formTime).toBeLessThan(100);
  });

  test('Security testing', async ({ page }) => {
    await page.goto('/');

    // Test XSS prevention
    const xssPayload = '<script>alert("xss")</script>';
    await page.fill('[data-testid="search-input"]', xssPayload);
    await page.click('[data-testid="search-button"]');

    // Should not execute script
    await expect(page.locator('text=xss')).not.toBeVisible();

    // Test CSRF protection (check for CSRF token)
    await page.click('[data-testid="connect-wallet-button"]');
    const csrfToken = await page.locator('[name="csrf_token"]').count();
    expect(csrfToken).toBeGreaterThan(0);

    // Test secure headers
    const response = await page.goto('/');
    const headers = response?.headers();

    expect(headers?.['x-frame-options']).toBeDefined();
    expect(headers?.['x-content-type-options']).toBeDefined();
    expect(headers?.['x-xss-protection']).toBeDefined();

    // Test input validation
    await page.goto('/launchpad');
    await page.fill('[data-testid="token-name"]', '');
    await page.click('[data-testid="create-token-submit"]');

    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Token name is required');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any created test data
    if (createdTokenAddress) {
      try {
        await page.evaluate(async (address) => {
          // Call cleanup API if available
          if (window.cleanupTestData) {
            await window.cleanupTestData(address);
          }
        }, createdTokenAddress);
      } catch (error) {
        console.log('Cleanup failed:', error);
      }
    }

    // Disconnect wallet
    await page.evaluate(() => {
      if (window.ethereum) {
        window.ethereum = null;
      }
    });
  });
});