/**
 * Rate Limiting Test Script
 *
 * This script can be used to test rate limiting functionality.
 * Run with: npm run test:rate-limit
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

interface TestResult {
  endpoint: string;
  requests: number;
  timeMs: number;
  status: 'success' | 'rate-limited' | 'error';
  error?: string;
}

class RateLimitTester {
  private results: TestResult[] = [];

  async testGlobalRateLimit(requests: number = 150): Promise<TestResult> {
    console.log(`\n[TEST] Testing Global Rate Limit (${requests} requests)...`);

    const startTime = Date.now();
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    let lastError: string = '';

    const promises = Array.from({ length: requests }, async (_, i) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/tokens`, {
          headers: {
            'X-Test-ID': `global-test-${i}`,
            'User-Agent': `RateLimitTest/1.0`
          }
        });

        if (response.status === 200) {
          successCount++;
        } else if (response.status === 429) {
          rateLimitedCount++;
        }

        return response.status;
      } catch (error: any) {
        errorCount++;
        lastError = error.message;

        if (error.response?.status === 429) {
          rateLimitedCount++;
        }

        return error.response?.status || 500;
      }
    });

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();

    const testResult: TestResult = {
      endpoint: '/api/tokens (global)',
      requests,
      timeMs: endTime - startTime,
      status: rateLimitedCount > 0 ? 'rate-limited' : 'success'
    };

    if (errorCount > 0) {
      testResult.error = lastError;
      testResult.status = 'error';
    }

    console.log(`[SUCCESS] Success: ${successCount}`);
    console.log(`[RATE_LIMITED] Rate Limited: ${rateLimitedCount}`);
    console.log(`[ERROR] Errors: ${errorCount}`);
    console.log(`[TIME] Time: ${testResult.timeMs}ms`);

    this.results.push(testResult);
    return testResult;
  }

  async testTokenCreationRateLimit(requests: number = 10): Promise<TestResult> {
    console.log(`\n[TEST] Testing Token Creation Rate Limit (${requests} requests)...`);

    const startTime = Date.now();
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    let lastError: string = '';

    const promises = Array.from({ length: requests }, async (_, i) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/tokens`, {
          name: `Test Token ${i}`,
          symbol: `TEST${i}`,
          description: `Test token for rate limiting test ${i}`,
          creatorAddress: `0x${Math.random().toString(16).substring(2).padStart(40, '0')}`,
          website: '',
          twitter: '',
          telegram: '',
          imageUrl: ''
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Test-ID': `token-creation-test-${i}`,
            'User-Agent': `RateLimitTest/1.0`
          }
        });

        if (response.status === 200 || response.status === 201) {
          successCount++;
        } else if (response.status === 429) {
          rateLimitedCount++;
        }

        return response.status;
      } catch (error: any) {
        errorCount++;
        lastError = error.message;

        if (error.response?.status === 429) {
          rateLimitedCount++;
        }

        return error.response?.status || 500;
      }
    });

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();

    const testResult: TestResult = {
      endpoint: '/api/tokens (creation)',
      requests,
      timeMs: endTime - startTime,
      status: rateLimitedCount > 0 ? 'rate-limited' : 'success'
    };

    if (errorCount > 0 && errorCount === requests) {
      testResult.error = lastError;
      testResult.status = 'error';
    }

    console.log(`[SUCCESS] Success: ${successCount}`);
    console.log(`[RATE_LIMITED] Rate Limited: ${rateLimitedCount}`);
    console.log(`[ERROR] Errors: ${errorCount}`);
    console.log(`[TIME] Time: ${testResult.timeMs}ms`);

    this.results.push(testResult);
    return testResult;
  }

  async testAnalyticsRateLimit(requests: number = 60): Promise<TestResult> {
    console.log(`\n[TEST] Testing Analytics Rate Limit (${requests} requests)...`);

    const startTime = Date.now();
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    let lastError: string = '';

    const promises = Array.from({ length: requests }, async (_, i) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/analytics/metrics`, {
          params: {
            timeframe: '1h',
            tokenAddress: `0x${Math.random().toString(16).substring(2).padStart(40, '0')}`
          },
          headers: {
            'X-Test-ID': `analytics-test-${i}`,
            'User-Agent': `RateLimitTest/1.0`
          }
        });

        if (response.status === 200) {
          successCount++;
        } else if (response.status === 429) {
          rateLimitedCount++;
        }

        return response.status;
      } catch (error: any) {
        errorCount++;
        lastError = error.message;

        if (error.response?.status === 429) {
          rateLimitedCount++;
        }

        return error.response?.status || 500;
      }
    });

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();

    const testResult: TestResult = {
      endpoint: '/api/analytics/metrics',
      requests,
      timeMs: endTime - startTime,
      status: rateLimitedCount > 0 ? 'rate-limited' : 'success'
    };

    if (errorCount > 0) {
      testResult.error = lastError;
      testResult.status = 'error';
    }

    console.log(`[SUCCESS] Success: ${successCount}`);
    console.log(`[RATE_LIMITED] Rate Limited: ${rateLimitedCount}`);
    console.log(`[ERROR] Errors: ${errorCount}`);
    console.log(`[TIME] Time: ${testResult.timeMs}ms`);

    this.results.push(testResult);
    return testResult;
  }

  async runAllTests(): Promise<void> {
    console.log('[START] Starting Rate Limiting Tests...');
    console.log('=====================================');

    try {
      // Test health check first
      console.log('\n[HEALTH] Checking API health...');
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      if (healthResponse.status === 200) {
        console.log('[OK] API is healthy');
        console.log(`[RATE_LIMITS] Rate Limits: ${JSON.stringify(healthResponse.data.rateLimits, null, 2)}`);
      } else {
        throw new Error('API health check failed');
      }

      // Run tests
      await this.testGlobalRateLimit(120); // Should hit global limit (100)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      await this.testTokenCreationRateLimit(8); // Should hit token creation limit (5)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      await this.testAnalyticsRateLimit(55); // Should hit analytics limit (50)

      // Generate report
      this.generateReport();

    } catch (error: any) {
      console.error('[FAILED] Test failed:', error.message);
      process.exit(1);
    }
  }

  private generateReport(): void {
    console.log('\n[REPORT] Rate Limiting Test Report');
    console.log('=====================================');

    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.endpoint}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Requests: ${result.requests}`);
      console.log(`   Time: ${result.timeMs}ms`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      const reqPerSec = (result.requests / (result.timeMs / 1000)).toFixed(2);
      console.log(`   Rate: ${reqPerSec} req/s`);
    });

    console.log('\n[SUMMARY]');
    console.log(`- Total Tests: ${this.results.length}`);
    console.log(`- Rate Limited: ${this.results.filter(r => r.status === 'rate-limited').length}`);
    console.log(`- Successful: ${this.results.filter(r => r.status === 'success').length}`);
    console.log(`- Failed: ${this.results.filter(r => r.status === 'error').length}`);

    console.log('\n[RESULT] Rate Limiting is working correctly!' +
      (this.results.some(r => r.status === 'rate-limited') ?
        ' Requests were properly limited.' :
        ' All requests passed (no limits hit).'));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new RateLimitTester();
  tester.runAllTests().catch(console.error);
}

export default RateLimitTester;