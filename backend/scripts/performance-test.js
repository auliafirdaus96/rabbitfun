#!/usr/bin/env node

/**
 * Performance Testing Script for Rabbit Launchpad API
 * Tests API endpoints under various load conditions
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 50;
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER) || 10;
const DURATION = parseInt(process.env.DURATION) || 30000; // 30 seconds

// Test results
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  endpoints: {}
};

// Test endpoints
const endpoints = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/health',
    expectedStatus: 200,
    timeout: 5000
  },
  {
    name: 'Get Tokens',
    method: 'GET',
    path: '/api/tokens?page=1&limit=20',
    expectedStatus: 200,
    timeout: 10000
  },
  {
    name: 'Search Tokens',
    method: 'GET',
    path: '/api/tokens?search=test&limit=10',
    expectedStatus: 200,
    timeout: 5000
  },
  {
    name: 'Get Analytics',
    method: 'GET',
    path: '/api/analytics/overview',
    expectedStatus: 200,
    timeout: 15000
  }
];

// Utility functions
function generateRandomWallet() {
  return '0x' + Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function generateTokenData() {
  return {
    name: `PerfTestToken${Date.now()}${Math.random().toString(36).substring(7)}`,
    symbol: `PERF${Math.floor(Math.random() * 10000)}`,
    description: 'Performance testing token',
    image: `https://picsum.photos/200/200?random=${Math.random()}`,
    twitter: '@perftest',
    telegram: 'https://t.me/perftest',
    website: 'https://perftest.com'
  };
}

async function makeRequest(endpoint, userData = null) {
  const startTime = performance.now();

  try {
    const config = {
      method: endpoint.method,
      url: `${BASE_URL}${endpoint.path}`,
      timeout: endpoint.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Performance-Test-Script',
        ...(userData && {
          'X-User-Address': userData.walletAddress,
          'Authorization': `Bearer ${userData.token}`
        })
      }
    };

    // Add body for POST requests
    if (endpoint.method === 'POST' && endpoint.name === 'Create Token') {
      config.data = generateTokenData();
    }

    const response = await axios(config);
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    results.totalRequests++;
    results.successfulRequests++;
    results.responseTimes.push(responseTime);

    // Track endpoint-specific metrics
    if (!results.endpoints[endpoint.name]) {
      results.endpoints[endpoint.name] = {
        requests: 0,
        successes: 0,
        failures: 0,
        responseTimes: []
      };
    }

    results.endpoints[endpoint.name].requests++;
    results.endpoints[endpoint.name].successes++;
    results.endpoints[endpoint.name].responseTimes.push(responseTime);

    return {
      success: true,
      responseTime,
      status: response.status
    };

  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    results.totalRequests++;
    results.failedRequests++;
    results.responseTimes.push(responseTime);

    if (!results.endpoints[endpoint.name]) {
      results.endpoints[endpoint.name] = {
        requests: 0,
        successes: 0,
        failures: 0,
        responseTimes: []
      };
    }

    results.endpoints[endpoint.name].requests++;
    results.endpoints[endpoint.name].failures++;
    results.endpoints[endpoint.name].responseTimes.push(responseTime);

    results.errors.push({
      endpoint: endpoint.name,
      error: error.message,
      responseTime,
      status: error.response?.status
    });

    return {
      success: false,
      responseTime,
      error: error.message
    };
  }
}

// Authentication helper
async function authenticateUser() {
  try {
    const walletAddress = generateRandomWallet();
    const response = await axios.post(`${BASE_URL}/api/auth/connect`, {
      address: walletAddress,
      signature: 'mock_signature_for_testing'
    });

    return {
      walletAddress,
      token: response.data.token || 'mock_token'
    };
  } catch (error) {
    return {
      walletAddress: generateRandomWallet(),
      token: 'mock_token'
    };
  }
}

// Load testing function
async function runLoadTest() {
  console.log(`🚀 Starting performance test with ${CONCURRENT_USERS} concurrent users`);
  console.log(`📊 Each user will make ${REQUESTS_PER_USER} requests over ${DURATION}ms`);
  console.log(`🌐 Testing against: ${BASE_URL}`);

  const startTime = performance.now();
  const userPromises = [];

  // Create concurrent users
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    const userPromise = simulateUser(i);
    userPromises.push(userPromise);
  }

  // Wait for all users to complete
  await Promise.all(userPromises);
  const endTime = performance.now();

  // Calculate statistics
  const totalTime = endTime - startTime;
  const avgResponseTime = results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length;
  const minResponseTime = Math.min(...results.responseTimes);
  const maxResponseTime = Math.max(...results.responseTimes);
  const requestsPerSecond = (results.totalRequests / totalTime) * 1000;

  // Calculate percentiles
  const sortedTimes = [...results.responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

  console.log('\n📈 Performance Test Results');
  console.log('================================');
  console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`📊 Total Requests: ${results.totalRequests}`);
  console.log(`✅ Successful: ${results.successfulRequests}`);
  console.log(`❌ Failed: ${results.failedRequests}`);
  console.log(`📈 Success Rate: ${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`);
  console.log(`🚀 Requests/sec: ${requestsPerSecond.toFixed(2)}`);
  console.log('');
  console.log('Response Times:');
  console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Min: ${minResponseTime.toFixed(2)}ms`);
  console.log(`  Max: ${maxResponseTime.toFixed(2)}ms`);
  console.log(`  50th percentile: ${p50.toFixed(2)}ms`);
  console.log(`  95th percentile: ${p95.toFixed(2)}ms`);
  console.log(`  99th percentile: ${p99.toFixed(2)}ms`);

  // Endpoint-specific results
  console.log('\n📊 Endpoint Performance:');
  console.log('================================');
  for (const [endpointName, metrics] of Object.entries(results.endpoints)) {
    const endpointAvgTime = metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length;
    const endpointSuccessRate = (metrics.successes / metrics.requests) * 100;

    console.log(`${endpointName}:`);
    console.log(`  Requests: ${metrics.requests}`);
    console.log(`  Success Rate: ${endpointSuccessRate.toFixed(2)}%`);
    console.log(`  Avg Response Time: ${endpointAvgTime.toFixed(2)}ms`);
    console.log('');
  }

  // Show errors if any
  if (results.errors.length > 0) {
    console.log('❌ Errors:');
    console.log('================================');
    results.errors.slice(0, 10).forEach((error, index) => {
      console.log(`${index + 1}. ${error.endpoint}: ${error.error} (${error.responseTime.toFixed(2)}ms)`);
    });

    if (results.errors.length > 10) {
      console.log(`... and ${results.errors.length - 10} more errors`);
    }
  }

  // Performance assessment
  console.log('\n🎯 Performance Assessment:');
  console.log('================================');

  if (avgResponseTime < 500) {
    console.log('✅ Excellent performance (< 500ms average)');
  } else if (avgResponseTime < 1000) {
    console.log('⚠️  Good performance (< 1s average)');
  } else {
    console.log('❌ Poor performance (> 1s average)');
  }

  if (p95 < 1000) {
    console.log('✅ 95th percentile < 1s - Excellent');
  } else if (p95 < 2000) {
    console.log('⚠️  95th percentile < 2s - Acceptable');
  } else {
    console.log('❌ 95th percentile > 2s - Needs optimization');
  }

  const successRate = (results.successfulRequests / results.totalRequests) * 100;
  if (successRate > 99) {
    console.log('✅ Excellent reliability (> 99% success rate)');
  } else if (successRate > 95) {
    console.log('⚠️  Good reliability (> 95% success rate)');
  } else {
    console.log('❌ Poor reliability (< 95% success rate)');
  }

  return results;
}

// Simulate a single user's behavior
async function simulateUser(userId) {
  const userData = await authenticateUser();

  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    // Random delay between requests
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    // Select random endpoint
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    await makeRequest(endpoint, userData);
  }
}

// Stress test function
async function runStressTest() {
  console.log('🔥 Running stress test - maximum load');

  const stressUsers = 200; // Higher number for stress test
  const stressPromises = [];

  for (let i = 0; i < stressUsers; i++) {
    const stressPromise = makeRequest(endpoints[1]); // Test token listing
    stressPromises.push(stressPromise);
  }

  const startTime = performance.now();
  await Promise.all(stressPromises);
  const endTime = performance.now();

  console.log(`Stress test completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log(`Concurrent requests: ${stressUsers}`);

  const stressResults = stressPromises.map(promise => promise.result);
  const successfulStress = stressResults.filter(r => r.success).length;
  const stressSuccessRate = (successfulStress / stressUsers) * 100;

  console.log(`Stress test success rate: ${stressSuccessRate.toFixed(2)}%`);
}

// Spike test function
async function runSpikeTest() {
  console.log('⚡ Running spike test - sudden traffic increase');

  // Normal load
  const normalUsers = 20;
  const normalPromises = [];

  for (let i = 0; i < normalUsers; i++) {
    normalPromises.push(makeRequest(endpoints[1]));
  }

  await Promise.all(normalPromises);
  console.log('Normal load completed');

  // Spike
  const spikeUsers = 100;
  const spikePromises = [];

  for (let i = 0; i < spikeUsers; i++) {
    spikePromises.push(makeRequest(endpoints[2])); // Search endpoint
  }

  const spikeStart = performance.now();
  await Promise.all(spikePromises);
  const spikeEnd = performance.now();

  console.log(`Spike completed in ${((spikeEnd - spikeStart) / 1000).toFixed(2)}s`);
  console.log(`Spike requests: ${spikeUsers}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'load';

  console.log('🐰 Rabbit Launchpad Performance Testing');
  console.log('==========================================\n');

  try {
    // Health check first
    console.log('🏥 Checking server health...');
    const healthResponse = await makeRequest(endpoints[0]);

    if (!healthResponse.success) {
      console.error('❌ Server is not healthy. Aborting tests.');
      process.exit(1);
    }

    console.log('✅ Server is healthy\n');

    switch (testType) {
      case 'load':
        await runLoadTest();
        break;
      case 'stress':
        await runStressTest();
        break;
      case 'spike':
        await runSpikeTest();
        break;
      case 'all':
        await runLoadTest();
        console.log('\n');
        await runStressTest();
        console.log('\n');
        await runSpikeTest();
        break;
      default:
        console.error('❌ Invalid test type. Use: load, stress, spike, or all');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  runLoadTest,
  runStressTest,
  runSpikeTest,
  makeRequest,
  generateTokenData,
  generateRandomWallet
};