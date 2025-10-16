import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test('Page load performance metrics', async ({ page }) => {
    // Enable performance monitoring
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        largestContentfulPaint: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || 0,
        cumulativeLayoutShift: (performance.getEntriesByType('layout-shift') as any[]).reduce((sum, entry) => sum + entry.value, 0)
      };
    });

    console.log('Performance Metrics:', performanceMetrics);

    // Performance assertions
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
    expect(performanceMetrics.loadComplete).toBeLessThan(3000); // 3 seconds
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds
    expect(performanceMetrics.cumulativeLayoutShift).toBeLessThan(0.1); // Good CLS
  });

  test('Token search performance under load', async ({ page }) => {
    await page.goto('/');

    // Measure search performance
    const searchTimes = [];
    const searchQueries = ['test', 'rabbit', 'token', 'defi', 'meme'];

    for (const query of searchQueries) {
      const startTime = performance.now();

      await page.fill('[data-testid="search-input"]', query);
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });

      const endTime = performance.now();
      searchTimes.push(endTime - startTime);

      // Clear search for next iteration
      await page.fill('[data-testid="search-input"]', '');
      await page.keyboard.press('Escape');
    }

    const averageSearchTime = searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length;
    const maxSearchTime = Math.max(...searchTimes);

    console.log('Search Performance:', {
      average: averageSearchTime.toFixed(2) + 'ms',
      max: maxSearchTime.toFixed(2) + 'ms',
      allTimes: searchTimes.map(t => t.toFixed(2) + 'ms')
    });

    expect(averageSearchTime).toBeLessThan(1000); // 1 second average
    expect(maxSearchTime).toBeLessThan(2000); // 2 seconds max
  });

  test('Token creation form performance', async ({ page }) => {
    await page.goto('/launchpad');

    // Mock wallet connection
    await page.addInitScript(() => {
      window.ethereum = {
        request: async () => ['0x1234567890123456789012345678901234567890'],
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.click('[data-testid="connect-wallet-button"]');
    await page.waitForTimeout(500); // Wait for connection

    // Measure form fill performance
    const formFields = [
      { selector: '[data-testid="token-name"]', value: 'Performance Test Token' },
      { selector: '[data-testid="token-symbol"]', value: 'PERF' },
      { selector: '[data-testid="token-description"]', value: 'A token for testing performance metrics' },
      { selector: '[data-testid="token-twitter"]', value: '@perftoken' },
      { selector: '[data-testid="token-telegram"]', value: 'https://t.me/perftoken' },
      { selector: '[data-testid="token-website"]', value: 'https://perftoken.com' }
    ];

    const fillTimes = [];

    for (const field of formFields) {
      const startTime = performance.now();
      await page.fill(field.selector, field.value);
      const endTime = performance.now();
      fillTimes.push(endTime - startTime);
    }

    const averageFillTime = fillTimes.reduce((sum, time) => sum + time, 0) / fillTimes.length;

    console.log('Form Fill Performance:', {
      average: averageFillTime.toFixed(2) + 'ms',
      fieldTimes: formFields.map((field, index) => ({
        field: field.selector,
        time: fillTimes[index].toFixed(2) + 'ms'
      }))
    });

    expect(averageFillTime).toBeLessThan(50); // 50ms average per field
  });

  test('Pagination performance with large datasets', async ({ page }) => {
    await page.goto('/');

    // Mock large dataset
    await page.route('**/api/tokens**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tokens: Array.from({ length: 100 }, (_, i) => ({
              id: `token-${i}`,
              name: `Token ${i}`,
              symbol: `TOK${i}`,
              address: `0x${i.toString(16).padStart(40, '0')}`,
              currentPrice: '0.001',
              marketCap: '1000',
              isVerified: i % 10 === 0,
              isFeatured: i % 20 === 0,
              createdAt: new Date().toISOString()
            })),
            pagination: {
              page: 1,
              limit: 100,
              total: 1000,
              pages: 10
            }
          }
        })
      });
    });

    // Measure pagination performance
    const paginationTimes = [];

    for (let page = 1; page <= 5; page++) {
      const startTime = performance.now();

      await page.click(`[data-testid="page-${page}"]`);
      await page.waitForSelector('[data-testid="token-card"]', { timeout: 3000 });

      const endTime = performance.now();
      paginationTimes.push(endTime - startTime);
    }

    const averagePaginationTime = paginationTimes.reduce((sum, time) => sum + time, 0) / paginationTimes.length;

    console.log('Pagination Performance:', {
      average: averagePaginationTime.toFixed(2) + 'ms',
      allTimes: paginationTimes.map((t, i) => `Page ${i + 1}: ${t.toFixed(2)}ms`)
    });

    expect(averagePaginationTime).toBeLessThan(500); // 500ms average for pagination
  });

  test('Real-time updates performance', async ({ page }) => {
    await page.goto('/');

    // Connect to WebSocket for real-time updates
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:8081');
        ws.onopen = () => {
          console.log('WebSocket connected for performance test');
          resolve(true);
        };
        ws.onmessage = (event) => {
          console.log('Received message:', event.data);
        };
      });
    });

    // Mock real-time updates
    await page.route('**/api/updates/stream', (route) => {
      // Simulate Server-Sent Events
      const stream = new ReadableStream({
        start(controller) {
          const sendUpdate = () => {
            const data = {
              type: 'price_update',
              tokenAddress: '0x1234567890123456789012345678901234567890',
              newPrice: (Math.random() * 0.01).toFixed(6),
              timestamp: Date.now()
            };
            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          };

          // Send updates every 100ms for testing
          const interval = setInterval(sendUpdate, 100);

          setTimeout(() => {
            clearInterval(interval);
            controller.close();
          }, 2000); // Run for 2 seconds
        }
      });

      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: stream
      });
    });

    // Subscribe to updates
    await page.evaluate(() => {
      const eventSource = new EventSource('/api/updates/stream');
      let updateCount = 0;
      let updateTimes = [];

      eventSource.onmessage = (event) => {
        updateCount++;
        updateTimes.push(performance.now());

        if (updateCount >= 10) {
          eventSource.close();
          console.log('Received', updateCount, 'updates in', updateTimes[updateTimes.length - 1] - updateTimes[0], 'ms');
        }
      });
    });

    // Wait for real-time updates to complete
    await page.waitForTimeout(3000);

    // Verify performance is acceptable
    const updateLatency = await page.evaluate(() => {
      return window.updateLatency || 0;
    });

    expect(updateLatency).toBeLessThan(200); // 200ms max latency
  });

  test('Memory usage monitoring', async ({ page }) => {
    await page.goto('/');

    // Monitor memory usage during various operations
    const memorySnapshots = [];

    const takeMemorySnapshot = async (label: string) => {
      const memoryInfo = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
          jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0
        };
      });

      memorySnapshots.push({
        label,
        ...memoryInfo,
        timestamp: Date.now()
      });
    };

    // Initial memory snapshot
    await takeMemorySnapshot('initial');

    // Navigate to different pages
    await page.goto('/launchpad');
    await takeMemorySnapshot('after-launchpad');

    await page.goto('/');
    await takeMemorySnapshot('after-home');

    // Simulate heavy interaction
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="search-input"]', `test${i}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
    }
    await takeMemorySnapshot('after-search-heavy');

    // Check for memory leaks
    const initialMemory = memorySnapshots[0].usedJSHeapSize;
    const finalMemory = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;

    console.log('Memory Usage Analysis:', {
      initial: (initialMemory / 1024 / 1024).toFixed(2) + ' MB',
      final: (finalMemory / 1024 / 1024).toFixed(2) + ' MB',
      increase: (memoryIncrease / 1024 / 1024).toFixed(2) + ' MB',
      snapshots: memorySnapshots.map(snapshot => ({
        label: snapshot.label,
        memory: (snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB'
      }))
    });

    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
  });

  test('Network performance with slow connections', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async (route) => {
      // Add artificial delay
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    const startTime = performance.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = performance.now() - startTime;

    console.log('Slow connection load time:', loadTime.toFixed(2) + 'ms');

    // Should still load within reasonable time even on slow connections
    expect(loadTime).toBeLessThan(10000); // 10 seconds

    // Test interactive elements during slow connection
    const interactionStart = performance.now();
    await page.click('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', 'test');
    const interactionTime = performance.now() - interactionStart;

    console.log('Slow connection interaction time:', interactionTime.toFixed(2) + 'ms');

    // UI should remain responsive
    expect(interactionTime).toBeLessThan(1000); // 1 second
  });

  test('Concurrent user simulation', async ({ page }) => {
    await page.goto('/');

    // Simulate multiple concurrent operations
    const concurrentOperations = [
      () => page.fill('[data-testid="search-input"]', 'concurrent1'),
      () => page.fill('[data-testid="search-input"]', 'concurrent2'),
      () => page.click('[data-testid="filter-dropdown"]'),
      () => page.click('[data-testid="sort-dropdown"]'),
      () => page.hover('[data-testid="token-card"]:first-child'),
      () => page.scroll('[data-testid="token-list"]', { scrollTop: 500 })
    ];

    const startTime = performance.now();

    // Execute all operations concurrently
    await Promise.all(concurrentOperations.map(op => op()));

    const endTime = performance.now();
    const concurrentTime = endTime - startTime;

    console.log('Concurrent operations time:', concurrentTime.toFixed(2) + 'ms');

    // Concurrent operations should complete efficiently
    expect(concurrentTime).toBeLessThan(2000); // 2 seconds
  });

  test('Bundle size and loading performance', async ({ page }) => {
    // Monitor resource loading
    const resources: any[] = [];

    page.on('response', (response) => {
      resources.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] || 0,
        type: response.headers()['content-type'] || 'unknown'
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Analyze loaded resources
    const jsResources = resources.filter(r => r.type.includes('javascript'));
    const cssResources = resources.filter(r => r.type.includes('css'));
    const imageResources = resources.filter(r => r.type.includes('image'));

    const totalJSSize = jsResources.reduce((sum, r) => sum + parseInt(r.size || 0), 0);
    const totalCSSSize = cssResources.reduce((sum, r) => sum + parseInt(r.size || 0), 0);

    console.log('Bundle Analysis:', {
      jsFiles: jsResources.length,
      totalJSSize: (totalJSSize / 1024).toFixed(2) + ' KB',
      cssFiles: cssResources.length,
      totalCSSSize: (totalCSSSize / 1024).toFixed(2) + ' KB',
      imageFiles: imageResources.length,
      totalResources: resources.length
    });

    // Bundle size should be reasonable
    expect(totalJSSize).toBeLessThan(1024 * 1024); // 1MB JS bundle
    expect(totalCSSSize).toBeLessThan(200 * 1024); // 200KB CSS
  });
});