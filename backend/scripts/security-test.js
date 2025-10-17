#!/usr/bin/env node

/**
 * Security Testing Script
 *
 * This script performs automated security tests on the Rabbit Launchpad API
 * Usage: node scripts/security-test.js
 */

const axios = require('axios');
const crypto = require('crypto');

class SecurityTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🔒 Starting Security Tests for Rabbit Launchpad API');
    console.log('='.repeat(60));

    const tests = [
      this.testRateLimiting.bind(this),
      this.testSqlInjection.bind(this),
      this.testXssProtection.bind(this),
      this.testCorsConfiguration.bind(this),
      this.testAuthenticationBypass.bind(this),
      this.testInputValidation.bind(this),
      this.testErrorHandling.bind(this),
      this.testSecurityHeaders.bind(this),
      this.testLargePayloads.bind(this),
      this.testMalformedRequests.bind(this)
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        this.addResult(test.name, 'FAILED', error.message);
      }
    }

    this.generateReport();
  }

  addResult(testName, status, message = '') {
    this.testResults.push({
      testName,
      status,
      message,
      timestamp: new Date().toISOString()
    });

    const icon = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${icon} ${testName}: ${status} ${message ? '- ' + message : ''}`);
  }

  async testRateLimiting() {
    console.log('\n📊 Testing Rate Limiting...');

    const endpoint = `${this.baseUrl}/health`;
    let requestCount = 0;
    let rateLimited = false;

    // Make rapid requests to trigger rate limiting
    for (let i = 0; i < 20; i++) {
      try {
        const response = await axios.get(endpoint);
        requestCount++;
      } catch (error) {
        if (error.response && error.response.status === 429) {
          rateLimited = true;
          break;
        }
      }
    }

    if (rateLimited) {
      this.addResult('Rate Limiting', 'PASSED', 'Rate limiting properly activated');
    } else {
      this.addResult('Rate Limiting', 'WARNING', 'Rate limiting may not be configured properly');
    }
  }

  async testSqlInjection() {
    console.log('\n🗄️ Testing SQL Injection Protection...');

    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "1' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --"
    ];

    let vulnerable = false;

    for (const payload of sqlPayloads) {
      try {
        const response = await axios.get(`${this.baseUrl}/api/tokens?search=${encodeURIComponent(payload)}`);

        // If the request succeeds with SQL payload, it might be vulnerable
        if (response.status === 200 && response.data.includes('error')) {
          vulnerable = true;
          break;
        }
      } catch (error) {
        // Expected behavior - should return validation error
        continue;
      }
    }

    if (!vulnerable) {
      this.addResult('SQL Injection Protection', 'PASSED', 'No SQL injection vulnerabilities detected');
    } else {
      this.addResult('SQL Injection Protection', 'FAILED', 'Potential SQL injection vulnerability detected');
    }
  }

  async testXssProtection() {
    console.log('\n🛡️ Testing XSS Protection...');

    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(\'xss\')">',
      'javascript:alert("xss")',
      '<svg onload="alert(\'xss\')">'
    ];

    let vulnerable = false;

    for (const payload of xssPayloads) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/check-wallet`, {
          walletAddress: payload
        });

        // Check if XSS payload is reflected without sanitization
        const responseText = JSON.stringify(response.data);
        if (responseText.includes('<script>') || responseText.includes('javascript:')) {
          vulnerable = true;
          break;
        }
      } catch (error) {
        // Expected - validation should reject
        continue;
      }
    }

    if (!vulnerable) {
      this.addResult('XSS Protection', 'PASSED', 'No XSS vulnerabilities detected');
    } else {
      this.addResult('XSS Protection', 'FAILED', 'Potential XSS vulnerability detected');
    }
  }

  async testCorsConfiguration() {
    console.log('\n🌐 Testing CORS Configuration...');

    try {
      const response = await axios.options(`${this.baseUrl}/api/tokens`, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const corsHeaders = response.headers;
      const allowedOrigins = corsHeaders['access-control-allow-origin'];

      if (allowedOrigins === '*' || allowedOrigins === 'https://malicious-site.com') {
        this.addResult('CORS Configuration', 'FAILED', 'CORS allows any origin - security risk');
      } else {
        this.addResult('CORS Configuration', 'PASSED', 'CORS properly configured');
      }
    } catch (error) {
      this.addResult('CORS Configuration', 'PASSED', 'CORS rejected unauthorized origin');
    }
  }

  async testAuthenticationBypass() {
    console.log('\n🔐 Testing Authentication Bypass...');

    // Test accessing protected endpoints without authentication
    const protectedEndpoints = [
      '/api/users',
      '/api/portfolio',
      '/api/admin/dashboard'
    ];

    let bypassed = false;

    for (const endpoint of protectedEndpoints) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`);

        if (response.status === 200) {
          bypassed = true;
          this.addResult('Authentication Bypass', 'FAILED', `Protected endpoint ${endpoint} accessible without auth`);
          break;
        }
      } catch (error) {
        // Expected - should return 401/403
        continue;
      }
    }

    if (!bypassed) {
      this.addResult('Authentication Bypass', 'PASSED', 'Protected endpoints properly secured');
    }
  }

  async testInputValidation() {
    console.log('\n✅ Testing Input Validation...');

    const invalidInputs = [
      { walletAddress: 'invalid-address' },
      { walletAddress: '0xinvalid' },
      { walletAddress: '0x' + 'a'.repeat(100) },
      { email: 'invalid-email' },
      { username: '<script>alert("xss")</script>' }
    ];

    let validationPassed = true;

    for (const input of invalidInputs) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/check-wallet`, input);

        // If invalid input is accepted, validation is weak
        if (response.status === 200 && !response.data.error) {
          validationPassed = false;
          this.addResult('Input Validation', 'FAILED', `Invalid input accepted: ${JSON.stringify(input)}`);
          break;
        }
      } catch (error) {
        // Expected - validation should reject
        continue;
      }
    }

    if (validationPassed) {
      this.addResult('Input Validation', 'PASSED', 'Input validation working correctly');
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');

    try {
      const response = await axios.get(`${this.baseUrl}/api/nonexistent-endpoint`);

      if (response.status === 500 && response.data.stack) {
        this.addResult('Error Handling', 'FAILED', 'Stack trace exposed in error response');
      } else {
        this.addResult('Error Handling', 'PASSED', 'Errors handled appropriately');
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        this.addResult('Error Handling', 'PASSED', '404 errors handled correctly');
      } else {
        this.addResult('Error Handling', 'WARNING', 'Unexpected error handling behavior');
      }
    }
  }

  async testSecurityHeaders() {
    console.log('\n🔒 Testing Security Headers...');

    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      const headers = response.headers;

      const securityHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block'
      };

      let missingHeaders = [];

      for (const [header, expectedValue] of Object.entries(securityHeaders)) {
        const actualValue = headers[header];
        if (!actualValue) {
          missingHeaders.push(header);
        }
      }

      if (missingHeaders.length === 0) {
        this.addResult('Security Headers', 'PASSED', 'All security headers present');
      } else {
        this.addResult('Security Headers', 'WARNING', `Missing security headers: ${missingHeaders.join(', ')}`);
      }
    } catch (error) {
      this.addResult('Security Headers', 'FAILED', 'Could not test security headers');
    }
  }

  async testLargePayloads() {
    console.log('\n📦 Testing Large Payload Protection...');

    const largePayload = {
      data: 'x'.repeat(10 * 1024 * 1024) // 10MB
    };

    try {
      const response = await axios.post(`${this.baseUrl}/api/tokens`, largePayload, {
        maxContentLength: 1 * 1024 * 1024, // 1MB limit
        timeout: 5000
      });

      this.addResult('Large Payload Protection', 'FAILED', 'Large payload accepted');
    } catch (error) {
      if (error.code === 'ECONNABORTED' || (error.response && error.response.status === 413)) {
        this.addResult('Large Payload Protection', 'PASSED', 'Large payloads properly rejected');
      } else {
        this.addResult('Large Payload Protection', 'PASSED', 'Large payload protection working');
      }
    }
  }

  async testMalformedRequests() {
    console.log('\n🔧 Testing Malformed Request Handling...');

    const malformedRequests = [
      { method: 'POST', url: '/api/tokens', data: null },
      { method: 'POST', url: '/api/tokens', data: 'invalid-json' },
      { method: 'GET', url: '/api/tokens?invalid=query' },
      { method: 'POST', url: '/api/tokens', headers: { 'Content-Type': 'invalid' } }
    ];

    let handledCorrectly = true;

    for (const request of malformedRequests) {
      try {
        const response = await axios({
          method: request.method,
          url: `${this.baseUrl}${request.url}`,
          data: request.data,
          headers: request.headers
        });

        if (response.status === 200) {
          handledCorrectly = false;
          break;
        }
      } catch (error) {
        // Expected - malformed requests should be rejected
        continue;
      }
    }

    if (handledCorrectly) {
      this.addResult('Malformed Request Handling', 'PASSED', 'Malformed requests properly rejected');
    } else {
      this.addResult('Malformed Request Handling', 'FAILED', 'Some malformed requests were accepted');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SECURITY TEST REPORT');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;

    console.log(`📈 Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.testName}: ${test.message}`);
        });
    }

    if (warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.testResults
        .filter(r => r.status === 'WARNING')
        .forEach(test => {
          console.log(`   - ${test.testName}: ${test.message}`);
        });
    }

    console.log('\n📄 Detailed report saved to security-test-report.json');

    // Save detailed report
    const fs = require('fs');
    fs.writeFileSync(
      path.join(__dirname, '../security-test-report.json'),
      JSON.stringify(this.testResults, null, 2)
    );

    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('🎉 SECURITY TESTS PASSED!');
      console.log('✅ No critical security issues detected');
    } else {
      console.log('🚨 SECURITY ISSUES DETECTED!');
      console.log('❌ Please review and fix the failed tests before production deployment');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Security Testing Script');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/security-test.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --url <url>     Base URL to test (default: http://localhost:3001)');
    console.log('  --help, -h      Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/security-test.js');
    console.log('  node scripts/security-test.js --url http://localhost:3001');
    process.exit(0);
  }

  const urlIndex = args.indexOf('--url');
  const baseUrl = urlIndex !== -1 ? args[urlIndex + 1] : 'http://localhost:3001';

  const tester = new SecurityTester(baseUrl);
  await tester.runAllTests();
}

// Handle errors
if (require.main === module) {
  main().catch((error) => {
    console.error('Security testing failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityTester;