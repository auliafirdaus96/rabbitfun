#!/usr/bin/env node

/**
 * Performance Testing Script
 *
 * This script performs basic performance testing on the Rabbit Launchpad API
 * Usage: node scripts/perf-test.js
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceTest {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runBasicLoadTest() {
    console.log('🚀 Starting Basic Load Test');
    console.log('='.repeat(50));

    const endpoints = [
      { path: '/health', method: 'GET', name: 'Health Check' },
      { path: '/api', method: 'GET', name: 'API Info' },
      { path: '/api/tokens', method: 'GET', name: 'Token List' },
      { path: '/api/tokens?limit=10', method: 'GET', name: 'Token List (Limited)' }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }

    this.generateSummary();
  }

  async testEndpoint(endpoint, iterations = 50) {
    console.log(`\n📊 Testing: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.method} ${endpoint.path}`);

    const times = [];
    let errors = 0;
    let successCount = 0;

    // Warm up
    try {
      await this.makeRequest(endpoint);
    } catch (error) {
      // Ignore warm up errors
    }

    // Main test
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      try {
        await this.makeRequest(endpoint);
        const endTime = performance.now();
        const duration = endTime - startTime;
        times.push(duration);
        successCount++;
      } catch (error) {
        errors++;
      }
    }

    const stats = this.calculateStats(times, errors, iterations);
    this.results.push({
      name: endpoint.name,
      path: endpoint.path,
      method: endpoint.method,
      ...stats
    });

    console.log(`   ✅ Success: ${successCount}/${iterations}`);
    console.log(`   ⚡ Average: ${stats.avg}ms`);
    console.log(`   📈 P95: ${stats.p95}ms`);
    console.log(`   📈 P99: ${stats.p99}ms`);
    console.log(`   🔥 RPS: ${stats.rps}`);
    console.log(`   ❌ Error Rate: ${stats.errorRate}%`);
  }

  async makeRequest(endpoint) {
    const config = {
      timeout: 10000,
      validateStatus: (status) => status < 500
    };

    if (endpoint.method === 'GET') {
      return await axios.get(`${this.baseUrl}${endpoint.path}`, config);
    } else if (endpoint.method === 'POST') {
      return await axios.post(`${this.baseUrl}${endpoint.path}`, endpoint.data, config);
    }
  }

  calculateStats(times, errors, total) {
    if (times.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errorRate: 100,
        rps: 0
      };
    }

    const sorted = times.sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    const totalTime = Math.max(...times) / 1000; // Convert to seconds

    return {
      avg: Math.round(sum / times.length * 100) / 100,
      min: Math.round(Math.min(...times) * 100) / 100,
      max: Math.round(Math.max(...times) * 100) / 100,
      p50: Math.round(sorted[Math.floor(sorted.length * 0.5)] * 100) / 100,
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
      p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100,
      errorRate: Math.round((errors / total) * 100 * 100) / 100,
      rps: Math.round(total / totalTime * 100) / 100
    };
  }

  generateSummary() {
    console.log('\n📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));

    this.results.forEach(result => {
      const status = this.getStatus(result.avg, result.errorRate);
      console.log(`${status.icon} ${result.name.padEnd(25)} | Avg: ${result.avg.toString().padStart(6)}ms | P95: ${result.p95.toString().padStart(6)}ms | RPS: ${result.rps.toString().padStart(6)} | Errors: ${result.errorRate.toString().padStart(5)}%`);
    });

    console.log('\n📈 Performance Status:');
    const overall = this.getOverallStatus();
    console.log(`${overall.icon} Overall: ${overall.message}`);

    console.log('\n💡 Recommendations:');
    this.getRecommendations();

    // Save detailed report
    this.saveReport();
  }

  getStatus(avgTime, errorRate) {
    if (errorRate > 5) {
      return { icon: '❌', status: 'CRITICAL' };
    } else if (errorRate > 1 || avgTime > 1000) {
      return { icon: '⚠️', status: 'WARNING' };
    } else if (avgTime > 500) {
      return { icon: '🟡', status: 'SLOW' };
    } else {
      return { icon: '✅', status: 'GOOD' };
    }
  }

  getOverallStatus() {
    const criticalCount = this.results.filter(r => r.errorRate > 5).length;
    const warningCount = this.results.filter(r => r.errorRate > 1 || r.avg > 1000).length;
    const slowCount = this.results.filter(r => r.avg > 500 && r.errorRate <= 1).length;

    if (criticalCount > 0) {
      return { icon: '❌', message: 'CRITICAL - High error rates detected' };
    } else if (warningCount > 0) {
      return { icon: '⚠️', message: 'WARNING - Performance issues detected' };
    } else if (slowCount > 0) {
      return { icon: '🟡', message: 'SLOW - Response times need improvement' };
    } else {
      return { icon: '✅', message: 'GOOD - Performance is acceptable' };
    }
  }

  getRecommendations() {
    const slowEndpoints = this.results.filter(r => r.avg > 500);
    const highErrorEndpoints = this.results.filter(r => r.errorRate > 1);

    if (slowEndpoints.length > 0) {
      console.log('   • Consider implementing caching for slow endpoints');
      console.log('   • Optimize database queries');
      console.log('   • Add database indexes');
    }

    if (highErrorEndpoints.length > 0) {
      console.log('   • Investigate error causes in failing endpoints');
      console.log('   • Implement better error handling');
      console.log('   • Add retry logic for transient errors');
    }

    if (slowEndpoints.length === 0 && highErrorEndpoints.length === 0) {
      console.log('   • Performance is good - consider load testing for production readiness');
      console.log('   • Monitor performance in production');
    }
  }

  saveReport() {
    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.getOverallStatus()
    };

    fs.writeFileSync(
      'performance-test-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Detailed report saved to performance-test-report.json');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Performance Testing Script');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/perf-test.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --url <url>        Base URL to test (default: http://localhost:3001)');
    console.log('  --help, -h         Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/perf-test.js');
    console.log('  node scripts/perf-test.js --url http://localhost:3001');
    process.exit(0);
  }

  const urlIndex = args.indexOf('--url');
  const baseUrl = urlIndex !== -1 ? args[urlIndex + 1] : 'http://localhost:3001';

  const tester = new PerformanceTest(baseUrl);

  try {
    await tester.runBasicLoadTest();
    console.log('\n🎉 Performance Test Completed!');
  } catch (error) {
    console.error('\n❌ Performance Test Failed:', error.message);
    process.exit(1);
  }
}

// Handle errors
if (require.main === module) {
  main().catch((error) => {
    console.error('Performance testing failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTest;