#!/usr/bin/env node

/**
 * Security Scanning Automation Script
 * Performs comprehensive security checks on the Rabbit Launchpad application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const OUTPUT_DIR = path.join(__dirname, '../security-reports');
const PROJECT_ROOT = path.join(__dirname, '..');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Security scan results
const securityResults = {
  timestamp: new Date().toISOString(),
  scans: {},
  overallScore: 0,
  vulnerabilities: [],
  recommendations: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📊',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    scan: '🔍'
  }[type] || '📊';

  console.log(`${prefix} [${timestamp}] ${message}`);
}

function writeReport(filename, data) {
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  log(`Report saved: ${filePath}`, 'success');
}

async function checkCommand(command, description) {
  log(`Checking: ${description}`, 'scan');

  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`${description}: Available`, 'success');
    return { available: true, version: result.trim() };
  } catch (error) {
    log(`${description}: Not available - ${error.message}`, 'warning');
    return { available: false, error: error.message };
  }
}

// 1. Dependency Vulnerability Scanning
async function scanDependencies() {
  log('Starting dependency vulnerability scan', 'scan');

  const scanResults = {
    npmAudit: null,
    snyk: null,
    retirejs: null
  };

  // npm audit
  try {
    log('Running npm audit...', 'scan');
    const auditResult = execSync('npm audit --json', { encoding: 'utf8', stdio: 'pipe' });
    const auditData = JSON.parse(auditResult);

    scanResults.npmAudit = {
      vulnerabilities: auditData.vulnerabilities || {},
      metadata: auditData.metadata,
      totalVulnerabilities: Object.keys(auditData.vulnerabilities || {}).length,
      criticalCount: Object.values(auditData.vulnerabilities || {})
        .filter(v => v.severity === 'critical').length,
      highCount: Object.values(auditData.vulnerabilities || {})
        .filter(v => v.severity === 'high').length
    };

    log(`Found ${scanResults.npmAudit.totalVulnerabilities} vulnerabilities`,
      scanResults.npmAudit.totalVulnerabilities > 0 ? 'warning' : 'success');

  } catch (error) {
    log(`npm audit failed: ${error.message}`, 'error');
  }

  // Check for Snyk
  const snykCheck = await checkCommand('snyk --version', 'Snyk CLI');
  if (snykCheck.available) {
    try {
      log('Running Snyk scan...', 'scan');
      const snykResult = execSync('snyk test --json', { encoding: 'utf8', stdio: 'pipe' });
      scanResults.snyk = JSON.parse(snykResult);
      log(`Snyk scan completed`, 'success');
    } catch (error) {
      log(`Snyk scan failed: ${error.message}`, 'error');
    }
  }

  // Check for Retire.js
  const retirejsCheck = await checkCommand('retire --version', 'Retire.js');
  if (retirejsCheck.available) {
    try {
      log('Running Retire.js scan...', 'scan');
      const retireResult = execSync('retire --outputformat json', { encoding: 'utf8', stdio: 'pipe' });
      scanResults.retirejs = JSON.parse(retireResult);
      log(`Retire.js scan completed`, 'success');
    } catch (error) {
      log(`Retire.js scan failed: ${error.message}`, 'error');
    }
  }

  securityResults.scans.dependencies = scanResults;
  writeReport('dependency-scan.json', scanResults);
}

// 2. Static Code Analysis
async function scanStaticCode() {
  log('Starting static code analysis', 'scan');

  const scanResults = {
    eslint: null,
    sonarjs: null,
    codeql: null,
    customRules: []
  };

  // ESLint security rules
  try {
    log('Running ESLint with security rules...', 'scan');
    const eslintResult = execSync('npx eslint . --ext .ts,.js --format json --config .eslintrc.js',
      { encoding: 'utf8', stdio: 'pipe' });

    scanResults.eslint = {
      issues: JSON.parse(eslintResult),
      totalIssues: JSON.parse(eslintResult).length
    };

    log(`Found ${scanResults.eslint.totalIssues} ESLint issues`,
      scanResults.eslint.totalIssues > 0 ? 'warning' : 'success');

  } catch (error) {
    log(`ESLint scan failed: ${error.message}`, 'error');
  }

  // Custom security patterns
  const securityPatterns = [
    {
      pattern: /password\s*=\s*['"`][^'"`]+['"`]/gi,
      description: 'Hardcoded password detected',
      severity: 'high'
    },
    {
      pattern: /api[_-]?key\s*=\s*['"`][^'"`]+['"`]/gi,
      description: 'Hardcoded API key detected',
      severity: 'critical'
    },
    {
      pattern: /secret[_-]?key\s*=\s*['"`][^'"`]+['"`]/gi,
      description: 'Hardcoded secret detected',
      severity: 'critical'
    },
    {
      pattern: /eval\s*\(/gi,
      description: 'Use of eval() detected',
      severity: 'high'
    },
    {
      pattern: /process\.env\.([A-Z_]+)/gi,
      description: 'Environment variable usage',
      severity: 'low'
    }
  ];

  const codeFiles = [];
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
        scanDirectory(filePath);
      } else if (file.match(/\.(js|ts|jsx|tsx)$/)) {
        codeFiles.push(filePath);
      }
    }
  }

  scanDirectory(PROJECT_ROOT);

  for (const file of codeFiles) {
    const content = fs.readFileSync(file, 'utf8');

    for (const pattern of securityPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        scanResults.customRules.push({
          file,
          pattern: pattern.description,
          severity: pattern.severity,
          matches: matches.length,
          lines: findLineNumbers(content, pattern.pattern)
        });
      }
    }
  }

  if (scanResults.customRules.length > 0) {
    log(`Found ${scanResults.customRules.length} security issues in source code`, 'warning');
  } else {
    log('No security issues found in source code', 'success');
  }

  securityResults.scans.staticCode = scanResults;
  writeReport('static-code-scan.json', scanResults);
}

function findLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const lineNumbers = [];

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      lineNumbers.push(index + 1);
    }
  });

  return lineNumbers;
}

// 3. API Security Testing
async function scanAPIEndpoints() {
  log('Starting API security testing', 'scan');

  const scanResults = {
    endpoints: [],
    vulnerabilities: [],
    securityHeaders: {},
    authentication: {},
    rateLimiting: {}
  };

  // Test endpoints for security issues
  const testCases = [
    {
      name: 'SQL Injection',
      path: '/api/tokens?search=\' OR 1=1 --',
      method: 'GET',
      expectedBehavior: 'Should return empty results or error',
      test: async (endpoint) => {
        try {
          const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
            headers: {
              'User-Agent': 'Security-Scanner/1.0'
            }
          });

          // Check if response indicates SQL injection vulnerability
          if (response.data && typeof response.data === 'object') {
            const dataStr = JSON.stringify(response.data);
            if (dataStr.includes('mysql') || dataStr.includes('postgresql') ||
                dataStr.includes('sqlite') || dataStr.includes('syntax error')) {
              return { vulnerable: true, reason: 'Database error in response' };
            }
          }

          return { vulnerable: false };
        } catch (error) {
          return { vulnerable: false, error: error.message };
        }
      }
    },
    {
      name: 'XSS in Search',
      path: '/api/tokens?search=<script>alert("xss")</script>',
      method: 'GET',
      expectedBehavior: 'Should sanitize input',
      test: async (endpoint) => {
        try {
          const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
            headers: {
              'User-Agent': 'Security-Scanner/1.0'
            }
          });

          const responseStr = JSON.stringify(response.data);
          if (responseStr.includes('<script>') || responseStr.includes('alert("xss")')) {
            return { vulnerable: true, reason: 'XSS payload in response' };
          }

          return { vulnerable: false };
        } catch (error) {
          return { vulnerable: false, error: error.message };
        }
      }
    },
    {
      name: 'Path Traversal',
      path: '/api/tokens/../../../etc/passwd',
      method: 'GET',
      expectedBehavior: 'Should reject path traversal',
      test: async (endpoint) => {
        try {
          const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
            headers: {
              'User-Agent': 'Security-Scanner/1.0'
            }
          });

          if (response.status === 200 && response.data && typeof response.data === 'string') {
            if (response.data.includes('root:') || response.data.includes('bin/bash')) {
              return { vulnerable: true, reason: 'System file content in response' };
            }
          }

          return { vulnerable: false };
        } catch (error) {
          return { vulnerable: false, error: error.message };
        }
      }
    }
  ];

  for (const testCase of testCases) {
    log(`Testing: ${testCase.name}`, 'scan');

    const result = await testCase.test(testCase);

    if (result.vulnerable) {
      log(`VULNERABILITY FOUND: ${testCase.name} - ${result.reason}`, 'error');
      scanResults.vulnerabilities.push({
        type: testCase.name,
        severity: 'high',
        description: result.reason,
        endpoint: testCase.path,
        method: testCase.method
      });
    } else {
      log(`${testCase.name}: Safe`, 'success');
    }

    scanResults.endpoints.push({
      name: testCase.name,
      path: testCase.path,
      method: testCase.method,
      status: result.vulnerable ? 'vulnerable' : 'safe'
    });
  }

  // Check security headers
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    const headers = response.headers;

    const securityHeaders = {
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'x-xss-protection': headers['x-xss-protection'],
      'strict-transport-security': headers['strict-transport-security'],
      'content-security-policy': headers['content-security-policy'],
      'referrer-policy': headers['referrer-policy']
    };

    scanResults.securityHeaders = securityHeaders;

    // Check for missing headers
    const missingHeaders = Object.entries(securityHeaders)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingHeaders.length > 0) {
      scanResults.vulnerabilities.push({
        type: 'Missing Security Headers',
        severity: 'medium',
        description: `Missing security headers: ${missingHeaders.join(', ')}`,
        endpoint: '*',
        method: '*'
      });
    }

    log(`Security headers check: ${missingHeaders.length === 0 ? 'All present' : `${missingHeaders.length} missing`}`,
      missingHeaders.length === 0 ? 'success' : 'warning');

  } catch (error) {
    log(`Security headers check failed: ${error.message}`, 'error');
  }

  securityResults.scans.apiSecurity = scanResults;
  writeReport('api-security-scan.json', scanResults);
}

// 4. Authentication and Authorization Testing
async function scanAuthSecurity() {
  log('Starting authentication security testing', 'scan');

  const scanResults = {
    passwordPolicy: null,
    sessionManagement: null,
    jwtSecurity: null,
    rbac: null
  };

  // Test JWT security
  try {
    // Test with invalid JWT
    const invalidTokenResponse = await axios.get(`${BASE_URL}/api/users`, {
      headers: {
        'Authorization': 'Bearer invalid.jwt.token'
      }
    });

    scanResults.jwtSecurity = {
      invalidTokenRejected: invalidTokenResponse.status === 401,
      expiredTokenRejected: false // Would need to generate expired token
    };

    log('JWT token validation: Working', scanResults.jwtSecurity.invalidTokenRejected ? 'success' : 'error');

  } catch (error) {
    log(`JWT security test failed: ${error.message}`, 'error');
  }

  // Test rate limiting on authentication
  try {
    const authRequests = [];
    for (let i = 0; i < 10; i++) {
      authRequests.push(
        axios.post(`${BASE_URL}/api/auth/connect`, {
          address: '0x1234567890123456789012345678901234567890',
          signature: 'invalid_signature'
        }).catch(error => error)
      );
    }

    const authResults = await Promise.allSettled(authRequests);
    const rateLimitedRequests = authResults.filter(
      result => result.status === 'fulfilled' && result.value.status === 429
    ).length;

    scanResults.rateLimiting = {
      authRateLimitingEnabled: rateLimitedRequests > 0,
      blockedRequests: rateLimitedRequests
    };

    log(`Authentication rate limiting: ${rateLimitedRequests > 0 ? 'Working' : 'Not detected'}`,
      rateLimitedRequests > 0 ? 'success' : 'warning');

  } catch (error) {
    log(`Rate limiting test failed: ${error.message}`, 'error');
  }

  securityResults.scans.authSecurity = scanResults;
  writeReport('auth-security-scan.json', scanResults);
}

// 5. File Security Scanning
async function scanFileSecurity() {
  log('Starting file security scanning', 'scan');

  const scanResults = {
    sensitiveFiles: [],
    permissions: [],
    configuration: []
  };

  // Check for sensitive files
  const sensitiveFilePatterns = [
    '.env',
    '.env.local',
    '.env.production',
    'id_rsa',
    'id_rsa.pub',
    'private.key',
    'certificate.pem',
    'database.sql',
    'secrets.json',
    'config.json'
  ];

  for (const pattern of sensitiveFilePatterns) {
    const files = findFiles(PROJECT_ROOT, pattern);

    if (files.length > 0) {
      scanResults.sensitiveFiles.push({
        pattern,
        files,
        exposed: files.some(file => isFileExposed(file))
      });

      if (files.some(file => isFileExposed(file))) {
        log(`SECURITY ISSUE: Sensitive file exposed - ${pattern}`, 'error');
      }
    }
  }

  // Check configuration files
  const configFiles = [
    'package.json',
    'tsconfig.json',
    'jest.config.js',
    'docker-compose.yml',
    '.eslintrc.js'
  ];

  for (const configFile of configFiles) {
    const filePath = path.join(PROJECT_ROOT, configFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for secrets in config files
      if (content.includes('password') || content.includes('secret') ||
          content.includes('api_key') || content.includes('private_key')) {
        scanResults.configuration.push({
          file: configFile,
          issue: 'Potential secret in configuration file'
        });
        log(`SECURITY ISSUE: Potential secret in ${configFile}`, 'warning');
      }
    }
  }

  if (scanResults.sensitiveFiles.length === 0 && scanResults.configuration.length === 0) {
    log('No file security issues found', 'success');
  }

  securityResults.scans.fileSecurity = scanResults;
  writeReport('file-security-scan.json', scanResults);
}

function findFiles(dir, pattern) {
  const files = [];
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));

  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
        scanDirectory(itemPath);
      } else if (regex.test(item)) {
        files.push(itemPath);
      }
    }
  }

  scanDirectory(dir);
  return files;
}

function isFileExposed(filePath) {
  // Check if file is in a publicly accessible directory
  const publicDirs = ['public', 'dist', 'build', 'static'];
  const relativePath = path.relative(PROJECT_ROOT, filePath);

  return publicDirs.some(dir => relativePath.startsWith(dir));
}

// 6. Container Security Scanning
async function scanContainerSecurity() {
  log('Starting container security scanning', 'scan');

  const scanResults = {
    dockerfile: null,
    dockerCompose: null,
    imageVulnerabilities: null
  };

  // Check Dockerfile
  const dockerfilePath = path.join(PROJECT_ROOT, 'Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

    const dockerfileIssues = [];

    // Check for running as root
    if (!dockerfileContent.includes('USER') && !dockerfileContent.includes('adduser')) {
      dockerfileIssues.push({
        issue: 'Running as root user',
        severity: 'high',
        recommendation: 'Add USER instruction to run as non-root user'
      });
    }

    // Check for latest tag
    if (dockerfileContent.includes(':latest')) {
      dockerfileIssues.push({
        issue: 'Using latest tag',
        severity: 'medium',
        recommendation: 'Use specific version tags instead of latest'
      });
    }

    // Check for exposed ports
    if (dockerfileContent.includes('EXPOSE') && !dockerfileContent.includes('EXPOSE 3001')) {
      dockerfileIssues.push({
        issue: 'Unexpected exposed ports',
        severity: 'medium',
        recommendation: 'Only expose necessary ports'
      });
    }

    scanResults.dockerfile = {
      hasIssues: dockerfileIssues.length > 0,
      issues: dockerfileIssues
    };

    if (dockerfileIssues.length > 0) {
      log(`Found ${dockerfileIssues.length} Dockerfile security issues`, 'warning');
    } else {
      log('Dockerfile security: Good', 'success');
    }
  }

  // Check docker-compose.yml
  const dockerComposePath = path.join(PROJECT_ROOT, 'docker-compose.yml');
  if (fs.existsSync(dockerComposePath)) {
    const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');

    const composeIssues = [];

    // Check for default passwords
    if (dockerComposeContent.includes('password') &&
        (dockerComposeContent.includes('postgres') || dockerComposeContent.includes('mysql'))) {
      composeIssues.push({
        issue: 'Default database password in docker-compose',
        severity: 'high',
        recommendation: 'Use environment variables for passwords'
      });
    }

    // Check for exposed ports
    const portMatches = dockerComposeContent.match(/ports:\s*\n([\s\S]*?)\n\s\w+:/m);
    if (portMatches) {
      const exposedPorts = portMatches[1].split('\n').filter(line => line.trim());
      if (exposedPorts.length > 3) {
        composeIssues.push({
          issue: 'Too many exposed ports',
          severity: 'medium',
          recommendation: 'Only expose necessary ports'
        });
      }
    }

    scanResults.dockerCompose = {
      hasIssues: composeIssues.length > 0,
      issues: composeIssues
    };

    if (composeIssues.length > 0) {
      log(`Found ${composeIssues.length} docker-compose security issues`, 'warning');
    } else {
      log('Docker Compose security: Good', 'success');
    }
  }

  securityResults.scans.containerSecurity = scanResults;
  writeReport('container-security-scan.json', scanResults);
}

// Calculate overall security score
function calculateOverallScore() {
  let totalChecks = 0;
  let passedChecks = 0;
  const allVulnerabilities = [];

  // Analyze each scan
  Object.values(securityResults.scans).forEach(scan => {
    if (!scan) return;

    if (scan.dependencies) {
      totalChecks += 3;
      if (scan.dependencies.npmAudit) {
        if (scan.dependencies.npmAudit.totalVulnerabilities === 0) passedChecks++;
        allVulnerabilities.push(...scan.dependencies.npmAudit.highCount, ...scan.dependencies.npmAudit.criticalCount);
      }
    }

    if (scan.staticCode) {
      totalChecks += 1;
      if (scan.staticCode.customRules.length === 0) passedChecks++;
      allVulnerabilities.push(...scan.staticCode.customRules.filter(r => r.severity === 'high' || r.severity === 'critical'));
    }

    if (scan.apiSecurity) {
      totalChecks += 1;
      if (scan.apiSecurity.vulnerabilities.length === 0) passedChecks++;
      allVulnerabilities.push(...scan.apiSecurity.vulnerabilities);
    }

    if (scan.authSecurity) {
      totalChecks += 1;
      if (scan.authSecurity.rateLimiting && scan.authSecurity.rateLimiting.authRateLimitingEnabled) {
        passedChecks++;
      }
    }

    if (scan.fileSecurity) {
      totalChecks += 1;
      if (scan.fileSecurity.sensitiveFiles.length === 0 && scan.fileSecurity.configuration.length === 0) {
        passedChecks++;
      }
    }

    if (scan.containerSecurity) {
      totalChecks += 2;
      let containerPassed = 0;
      if (scan.containerSecurity.dockerfile && !scan.containerSecurity.dockerfile.hasIssues) containerPassed++;
      if (scan.containerSecurity.dockerCompose && !scan.containerSecurity.dockerCompose.hasIssues) containerPassed++;
      if (containerPassed === 2) passedChecks++;
    }
  });

  securityResults.overallScore = Math.round((passedChecks / totalChecks) * 100);
  securityResults.totalChecks = totalChecks;
  securityResults.passedChecks = passedChecks;
  securityResults.vulnerabilities = allVulnerabilities;

  return securityResults.overallScore;
}

// Generate recommendations
function generateRecommendations() {
  const recommendations = [];

  if (securityResults.scans.dependencies?.npmAudit?.totalVulnerabilities > 0) {
    recommendations.push({
      category: 'Dependencies',
      priority: 'high',
      title: 'Update vulnerable dependencies',
      description: `Found ${securityResults.scans.dependencies.npmAudit.totalVulnerabilities} vulnerable packages. Run 'npm audit fix' to update them.`,
      command: 'npm audit fix'
    });
  }

  if (securityResults.scans.staticCode?.customRules?.length > 0) {
    recommendations.push({
      category: 'Code Security',
      priority: 'high',
      title: 'Fix hardcoded secrets and insecure code patterns',
      description: `Found ${securityResults.scans.staticCode.customRules.length} security issues in source code.`,
      action: 'Review and fix all hardcoded secrets and insecure code patterns'
    });
  }

  if (securityResults.scans.apiSecurity?.vulnerabilities?.length > 0) {
    recommendations.push({
      category: 'API Security',
      priority: 'critical',
      title: 'Fix API security vulnerabilities',
      description: `Found ${securityResults.scans.apiSecurity.vulnerabilities.length} API security issues.`,
      action: 'Implement proper input validation, sanitization, and security headers'
    });
  }

  if (securityResults.scans.authSecurity?.rateLimiting?.authRateLimitingEnabled === false) {
    recommendations.push({
      category: 'Authentication',
      priority: 'high',
      title: 'Implement rate limiting on authentication',
      description: 'Authentication endpoints should have rate limiting to prevent brute force attacks.',
      action: 'Configure rate limiting middleware on auth endpoints'
    });
  }

  if (securityResults.scans.containerSecurity?.dockerfile?.hasIssues) {
    recommendations.push({
      category: 'Container Security',
      priority: 'medium',
      title: 'Improve Dockerfile security',
      description: 'Dockerfile has security issues that should be addressed.',
      action: 'Follow Docker security best practices'
    });
  }

  if (securityResults.overallScore < 70) {
    recommendations.push({
      category: 'Overall Security',
      priority: 'high',
      title: 'Improve overall security posture',
      description: `Current security score is ${securityResults.overallScore}%. Comprehensive security improvements needed.`,
      action: 'Address all identified security issues and implement security best practices'
    });
  }

  securityResults.recommendations = recommendations;
  return recommendations;
}

// Main execution function
async function main() {
  console.log('🔒 Rabbit Launchpad Security Scanning');
  console.log('=====================================\n');

  try {
    // Run all security scans
    await scanDependencies();
    await scanStaticCode();
    await scanAPIEndpoints();
    await scanAuthSecurity();
    await scanFileSecurity();
    await scanContainerSecurity();

    // Calculate overall score
    const score = calculateOverallScore();

    // Generate recommendations
    generateRecommendations();

    // Generate final report
    const finalReport = {
      ...securityResults,
      score,
      grade: getSecurityGrade(score),
      generatedAt: new Date().toISOString()
    };

    writeReport('security-scan-report.json', finalReport);

    // Display results
    console.log('\n📊 Security Scan Results');
    console.log('====================================');
    console.log(`🎯 Overall Security Score: ${score}/100 (${getSecurityGrade(score)})`);
    console.log(`✅ Passed Checks: ${securityResults.passedChecks}/${securityResults.totalChecks}`);
    console.log(`⚠️  Vulnerabilities Found: ${securityResults.vulnerabilities.length}`);

    if (securityResults.recommendations.length > 0) {
      console.log('\n📋 Recommendations:');
      console.log('====================================');
      securityResults.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`   ${rec.description}`);
      });
    }

    console.log('\n📄 Detailed reports saved to security-reports/');

    // Exit with appropriate code
    if (score < 70) {
      console.log('\n❌ Security scan completed with issues found');
      process.exit(1);
    } else {
      console.log('\n✅ Security scan completed successfully');
      process.exit(0);
    }

  } catch (error) {
    console.error(`\n❌ Security scan failed: ${error.message}`);
    process.exit(1);
  }
}

function getSecurityGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Security scan interrupted by user');
  process.exit(0);
});

// Run the security scan
if (require.main === module) {
  main();
}

module.exports = {
  scanDependencies,
  scanStaticCode,
  scanAPIEndpoints,
  scanAuthSecurity,
  scanFileSecurity,
  scanContainerSecurity
};