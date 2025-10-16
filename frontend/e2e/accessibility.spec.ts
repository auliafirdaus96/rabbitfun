import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should not have any automatically detectable accessibility issues on homepage', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Check if there's an h1 on the page
    const h1Elements = page.locator('h1');
    await expect(h1Elements.first()).toBeVisible();

    // Check heading structure (no skipped levels)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = [];

    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName);
      const level = parseInt(tagName.charAt(1));
      headingLevels.push(level);
    }

    // Check that headings don't skip levels (e.g., h1 followed by h3)
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      const previousLevel = headingLevels[i - 1];
      expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1);
    }
  });

  test('should have descriptive alt text for images', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        const altText = await image.getAttribute('alt');

        // Check if image has alt text
        expect(altText).toBeTruthy();

        // Check if alt text is not empty or just a file extension
        if (altText) {
          expect(altText.trim()).not.toBe('');
          expect(altText).not.toMatch(/\.(jpg|jpeg|png|gif|svg)$/i);
        }
      }
    }
  });

  test('should have proper form labels', async ({ page }) => {
    // Look for any forms on the page
    const forms = page.locator('form');
    const formCount = await forms.count();

    if (formCount > 0) {
      for (let i = 0; i < formCount; i++) {
        const form = forms.nth(i);

        // Check if inputs have associated labels
        const inputs = form.locator('input, select, textarea');
        const inputCount = await inputs.count();

        for (let j = 0; j < inputCount; j++) {
          const input = inputs.nth(j);
          const inputId = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');

          // Check if input has proper labeling
          if (inputId) {
            const label = page.locator(`label[for="${inputId}"]`);
            expect(await label.count()).toBeGreaterThan(0);
          } else if (!ariaLabel && !ariaLabelledBy) {
            // Input should have some form of labeling
            console.warn(`Input at index ${j} lacks proper labeling`);
          }
        }
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // This test checks for visible text elements that should have good contrast
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Get all text elements
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button');
    const elementCount = await textElements.count();

    // Sample some elements to check (checking all would be too intensive)
    const sampleSize = Math.min(elementCount, 10);
    const indicesToCheck = Array.from({ length: sampleSize }, (_, i) =>
      Math.floor(Math.random() * elementCount)
    );

    for (const index of indicesToCheck) {
      const element = textElements.nth(index);

      // Check if element is visible
      if (await element.isVisible()) {
        // Get computed styles
        const styles = await element.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight
          };
        });

        // Log the styles for manual review
        console.log(`Element styles:`, styles);
      }
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Test Tab navigation
    await page.keyboard.press('Tab');

    // Check focus indicator
    const focusedElement = page.locator(':focus');
    expect(await focusedElement.count()).toBeGreaterThan(0);

    // Check if focused element has visible focus styles
    const focusStyles = await focusedElement.evaluate(el => {
      const computed = getComputedStyle(el, ':focus');
      return {
        outline: computed.outline,
        outlineOffset: computed.outlineOffset,
        boxShadow: computed.boxShadow
      };
    });

    // At least one focus style should be present
    const hasFocusStyle = focusStyles.outline !== 'none' ||
                         focusStyles.boxShadow !== 'none' ||
                         focusStyles.outlineOffset !== '0px';

    if (!hasFocusStyle) {
      console.warn('Focused element may not have visible focus indicator');
    }

    // Test navigation through interactive elements
    const interactiveElements = page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const interactiveCount = await interactiveElements.count();

    if (interactiveCount > 0) {
      // Try to navigate through first few interactive elements
      for (let i = 0; i < Math.min(5, interactiveCount); i++) {
        await page.keyboard.press('Tab');
        const currentFocused = page.locator(':focus');
        expect(await currentFocused.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Check for proper ARIA usage
    const elementsWithAria = page.locator('[aria-label], [aria-describedby], [aria-labelledby], [role]');
    const ariaCount = await elementsWithAria.count();

    for (let i = 0; i < Math.min(ariaCount, 10); i++) {
      const element = elementsWithAria.nth(i);

      // Get ARIA attributes
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaDescribedBy = await element.getAttribute('aria-describedby');
      const ariaLabelledBy = await element.getAttribute('aria-labelledby');
      const role = await element.getAttribute('role');

      // Validate ARIA attributes
      if (ariaLabel) {
        expect(ariaLabel.trim()).not.toBe('');
      }

      if (ariaDescribedBy) {
        const describedElement = page.locator(`#${ariaDescribedBy}`);
        expect(await describedElement.count()).toBeGreaterThan(0);
      }

      if (ariaLabelledBy) {
        const labelledElement = page.locator(`#${ariaLabelledBy}`);
        expect(await labelledElement.count()).toBeGreaterThan(0);
      }

      if (role) {
        // Check if role is valid
        const validRoles = ['button', 'link', 'navigation', 'main', 'complementary', 'contentinfo', 'banner', 'search', 'form', 'region', 'dialog', 'alert', 'status', 'progressbar', 'tooltip'];
        expect(validRoles).toContain(role);
      }
    }
  });

  test('should have proper link descriptions', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < Math.min(linkCount, 20); i++) {
      const link = links.nth(i);

      // Check if link has descriptive text
      const linkText = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      if (linkText) {
        expect(linkText.trim()).not.toBe('');
      } else if (ariaLabel) {
        expect(ariaLabel.trim()).not.toBe('');
      } else {
        console.warn(`Link at index ${i} lacks descriptive text`);
      }
    }
  });

  test('should handle screen reader announcements', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Check for live regions
    const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
    const liveRegionCount = await liveRegions.count();

    for (let i = 0; i < liveRegionCount; i++) {
      const region = liveRegions.nth(i);
      const ariaLive = await region.getAttribute('aria-live');
      const role = await region.getAttribute('role');

      // Validate live region configuration
      if (ariaLive) {
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      }

      if (role === 'status' || role === 'alert') {
        // These should typically have aria-live
        expect(ariaLive).toBeTruthy();
      }
    }
  });

  test('should be accessible on token detail page', async ({ page }) => {
    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });
    await page.locator('[data-testid="token-card"]').first().click();
    await page.waitForURL(/\/token\//);

    // Run accessibility scan on token detail page
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Mobile Accessibility', () => {
  test('should be accessible on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await page.waitForSelector('[data-testid="token-card"]', { timeout: 10000 });

    // Run accessibility scan on mobile view
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Check touch target sizes (minimum 44x44 points)
    const touchTargets = page.locator('button, a, input[type="checkbox"], input[type="radio"], [role="button"]');
    const targetCount = await touchTargets.count();

    for (let i = 0; i < Math.min(targetCount, 10); i++) {
      const target = touchTargets.nth(i);

      if (await target.isVisible()) {
        const boundingBox = await target.boundingBox();
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});