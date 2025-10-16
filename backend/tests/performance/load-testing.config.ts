import { config } from '@k6/core';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const tokenCreationTime = new Rate('token_creation_time');
export const searchResponseTime = new Rate('search_response_time');
export const apiResponseTime = new Rate('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 10 },  // Stay at 10 users
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 50 },  // Stay at 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 100 }, // Stay at 100 users
    { duration: '30s', target: 200 }, // Ramp up to 200 users
    { duration: '2m', target: 200 }, // Stay at 200 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.1'], // Error rate under 10%
    errors: ['rate<0.05'], // Custom error rate under 5%
    token_creation_time: ['p(95)<2000'], // Token creation under 2s
    search_response_time: ['p(95)<500'], // Search under 500ms
    api_response_time: ['p(95)<300'], // API calls under 300ms
  },
  noConnectionReuse: false,
  userAgent: 'K6/1.0 RabbitLaunchpad LoadTest',
  discardResponseBodies: true, // Reduce memory usage
};

// Base URL for tests
const BASE_URL = 'http://localhost:3001';

// Test data generation
function generateRandomWallet(): string {
  return '0x' + Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateTokenData() {
  return {
    name: `LoadTestToken${Date.now()}${Math.random().toString(36).substring(7)}`,
    symbol: `LT${Math.floor(Math.random() * 10000)}`,
    description: 'Load testing token for performance benchmarking',
    image: `https://picsum.photos/200/200?random=${Math.random()}`,
    twitter: '@loadtest',
    telegram: 'https://t.me/loadtest',
    website: 'https://loadtest.com'
  };
}

// Helper functions
function makeRequest(path: string, method: string = 'GET', body?: any) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'K6 Load Test',
    },
  };

  if (body) {
    params['body'] = JSON.stringify(body);
  }

  const response = http[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](
    `${BASE_URL}${path}`,
    params
  );

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);

  return response;
}

// Main test scenarios
export default function () {
  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health check passed': (r) => r.status === 200,
  });

  // Test scenarios
  const scenarios = [
    testTokenCreation,
    testTokenSearch,
    testTokenListing,
    testUserRegistration,
    testAnalyticsAPI,
  ];

  // Randomly select a scenario to simulate realistic user behavior
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  randomScenario();
}

function testTokenCreation() {
  const startTime = Date.now();

  // Connect wallet (mock)
  const walletData = {
    address: generateRandomWallet(),
    signature: 'mock_signature'
  };

  const connectResponse = makeRequest('/api/auth/connect', 'POST', walletData);
  const connectSuccess = check(connectResponse, {
    'wallet connected': (r) => r.status === 200,
  });

  if (connectSuccess) {
    // Create token
    const tokenData = generateTokenData();
    const createResponse = makeRequest('/api/tokens', 'POST', tokenData);

    const creationSuccess = check(createResponse, {
      'token created': (r) => r.status === 200 || r.status === 201,
      'token creation time < 2000ms': (r) => r.timings.duration < 2000,
    });

    if (creationSuccess) {
      const creationTime = Date.now() - startTime;
      tokenCreationTime.add(true, { creation_time: creationTime });
    }
  }

  sleep(Math.random() * 2 + 1); // Random delay 1-3 seconds
}

function testTokenSearch() {
  const searchQueries = ['test', 'token', 'defi', 'rabbit', 'meme', 'btc', 'eth'];
  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  const startTime = Date.now();
  const response = makeRequest(`/api/tokens?search=${randomQuery}&limit=20`);

  const searchSuccess = check(response, {
    'search completed': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
    'search returned results': (r) => {
      const data = JSON.parse(r.body as string);
      return data.success && data.data.tokens.length > 0;
    },
  });

  if (searchSuccess) {
    const searchTime = Date.now() - startTime;
    searchResponseTime.add(true, { response_time: searchTime });
  }

  sleep(Math.random() * 1 + 0.5); // Random delay 0.5-1.5 seconds
}

function testTokenListing() {
  const params = [
    { page: 1, limit: 20 },
    { page: 2, limit: 50 },
    { page: 1, limit: 100, sortBy: 'marketCap', sortOrder: 'desc' },
    { page: 1, limit: 20, isVerified: true },
    { page: 1, limit: 20, isFeatured: true }
  ];

  const randomParams = params[Math.floor(Math.random() * params.length)];
  const queryString = new URLSearchParams(randomParams as any).toString();

  const response = makeRequest(`/api/tokens?${queryString}`);

  check(response, {
    'token listing loaded': (r) => r.status === 200,
    'listing response time < 300ms': (r) => r.timings.duration < 300,
    'listing has data': (r) => {
      const data = JSON.parse(r.body as string);
      return data.success && data.data.tokens && data.data.pagination;
    },
  });

  sleep(Math.random() * 0.5 + 0.5); // Random delay 0.5-1 second
}

function testUserRegistration() {
  const userData = {
    walletAddress: generateRandomWallet(),
    username: `loadtestuser${Date.now()}`,
    email: `loadtest${Date.now()}@example.com`,
    displayName: 'Load Test User'
  };

  const response = makeRequest('/api/users', 'POST', userData);

  check(response, {
    'user registered': (r) => r.status === 200 || r.status === 201,
    'registration time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(Math.random() * 1 + 1); // Random delay 1-2 seconds
}

function testAnalyticsAPI() {
  const analyticsEndpoints = [
    '/api/analytics/overview',
    '/api/analytics/trending',
    '/api/analytics/stats',
    '/api/analytics/volume'
  ];

  const randomEndpoint = analyticsEndpoints[Math.floor(Math.random() * analyticsEndpoints.length)];

  const startTime = Date.now();
  const response = makeRequest(randomEndpoint);

  const success = check(response, {
    'analytics data loaded': (r) => r.status === 200,
    'analytics response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (success) {
    const responseTime = Date.now() - startTime;
    apiResponseTime.add(true, { response_time });
  }

  sleep(Math.random() * 2 + 1); // Random delay 1-3 seconds
}

// Stress test scenario
export function stressTest() {
  // This is a separate stress test that can be run independently
  const userCount = 500;
  const rampUpTime = 30; // seconds

  console.log(`Starting stress test with ${userCount} users over ${rampUpTime}s`);

  for (let i = 0; i < userCount; i++) {
    // Simulate different user behaviors
    const behaviors = [
      testTokenCreation,
      testTokenSearch,
      testTokenListing,
      testUserRegistration,
      testAnalyticsAPI
    ];

    const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    randomBehavior();

    // Small delay between users
    sleep(rampUpTime * 1000 / userCount);
  }
}

// Spike test scenario
export function spikeTest() {
  // Simulate sudden traffic spike
  console.log('Starting spike test - sudden traffic increase');

  // Normal load
  for (let i = 0; i < 10; i++) {
    testTokenListing();
    sleep(0.1);
  }

  // Spike
  for (let i = 0; i < 100; i++) {
    testTokenSearch();
    sleep(0.05);
  }

  // Back to normal
  for (let i = 0; i < 10; i++) {
    testTokenListing();
    sleep(0.1);
  }
}

// Soak test scenario
export function soakTest() {
  // Long-running test to check for memory leaks and performance degradation
  console.log('Starting soak test - 30 minutes of sustained load');

  const duration = 30 * 60; // 30 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < duration * 1000) {
    testTokenListing();
    testTokenSearch();

    // Check for performance degradation every 5 minutes
    if (Math.random() < 0.1) { // 10% chance
      console.log('Soak test progress:', Math.floor((Date.now() - startTime) / 1000 / 60), 'minutes');
    }

    sleep(1);
  }
}

// Performance monitoring
export function handleSummary(data) {
  console.log('\n=== Performance Test Summary ===');
  console.log(`Total requests: ${data.metrics.http_reqs.count}`);
  console.log(`Failed requests: ${data.metrics.http_req_failed.count}`);
  console.log(`Error rate: ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%`);
  console.log(`Average response time: ${data.metrics.http_req_duration.avg.toFixed(2)}ms`);
  console.log(`95th percentile: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms`);
  console.log(`99th percentile: ${data.metrics.http_req_duration['p(99)'].toFixed(2)}ms`);

  if (data.metrics.errors) {
    console.log(`Custom error rate: ${(data.metrics.errors.rate * 100).toFixed(2)}%`);
  }

  if (data.metrics.token_creation_time) {
    console.log(`Token creation avg time: ${data.metrics.token_creation_time.avg.toFixed(2)}ms`);
  }

  if (data.metrics.search_response_time) {
    console.log(`Search response avg time: ${data.metrics.search_response_time.avg.toFixed(2)}ms`);
  }

  console.log('=================================\n');
}

// Test utilities
export function generateTestData(count: number) {
  const tokens = [];
  const users = [];

  for (let i = 0; i < count; i++) {
    tokens.push(generateTokenData());
    users.push({
      walletAddress: generateRandomWallet(),
      username: `user${i}`,
      email: `user${i}@example.com`
    });
  }

  return { tokens, users };
}

export function validateResponse(response: any, expectedFields: string[]) {
  const data = JSON.parse(response.body as string);

  for (const field of expectedFields) {
    if (!(field in data)) {
      console.error(`Missing field: ${field}`);
      return false;
    }
  }

  return true;
}