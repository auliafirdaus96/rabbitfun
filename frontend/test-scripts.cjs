#!/usr/bin/env node

/**
 * Test Scripts for RabbitFun Launchpad
 * Convenience scripts for running different test scenarios
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n📍 ${step}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function runCommand(command, description, options = {}) {
  try {
    logStep(`Running: ${description}`);
    log(`Command: ${command}`, 'blue');

    const result = execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options
    });

    logSuccess(`Completed: ${description}`);
    return result;
  } catch (error) {
    logError(`Failed: ${description}`);
    logError(`Error: ${error.message}`);
    process.exit(1);
  }
}

function checkTestFiles() {
  logStep('Checking test files...');

  const testDirs = [
    'src/utils/__tests__',
    'src/components/__tests__',
    'src/hooks/__tests__',
    'src/integration',
    'src/e2e'
  ];

  let totalTests = 0;

  testDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath).filter(file =>
        file.endsWith('.test.ts') ||
        file.endsWith('.test.tsx') ||
        file.endsWith('.spec.ts') ||
        file.endsWith('.spec.tsx')
      );
      totalTests += files.length;
      log(`  📁 ${dir}: ${files.length} test files`, 'blue');
    } else {
      logWarning(`  📁 ${dir}: Directory not found`);
    }
  });

  logSuccess(`Found ${totalTests} test files total`);
  return totalTests > 0;
}

function runUnitTests() {
  logStep('Running Unit Tests');
  runCommand('npm test -- --testPathPattern="__tests__" --verbose', 'Unit Tests');
}

function runComponentTests() {
  logStep('Running Component Tests');
  runCommand('npm test -- --testPathPattern="components" --verbose', 'Component Tests');
}

function runHookTests() {
  logStep('Running Hook Tests');
  runCommand('npm test -- --testPathPattern="hooks" --verbose', 'Hook Tests');
}

function runIntegrationTests() {
  logStep('Running Integration Tests');

  const integrationPath = path.join(__dirname, 'src/integration');
  if (!fs.existsSync(integrationPath)) {
    logWarning('Integration tests directory not found. Skipping...');
    return;
  }

  runCommand('npm test -- --testPathPattern="integration" --verbose', 'Integration Tests');
}

function runE2ETests() {
  logStep('Running E2E Tests');

  const e2ePath = path.join(__dirname, 'src/e2e');
  if (!fs.existsSync(e2ePath)) {
    logWarning('E2E tests directory not found. Skipping...');
    return;
  }

  // Try Playwright first, then Cypress
  try {
    runCommand('npx playwright test', 'Playwright E2E Tests');
  } catch (playwrightError) {
    logWarning('Playwright not found, trying Cypress...');
    try {
      runCommand('npx cypress run', 'Cypress E2E Tests');
    } catch (cypressError) {
      logError('Neither Playwright nor Cypress found. Please install one of them for E2E testing.');
    }
  }
}

function runCoverageTests() {
  logStep('Running Tests with Coverage');
  runCommand('npm test -- --coverage --coverageReporters=text-lcov | npx coveralls', 'Coverage Tests');
}

function runWatchMode() {
  logStep('Starting Test Watch Mode');
  log('👀 Watching for file changes... Press Ctrl+C to exit', 'yellow');
  runCommand('npm test -- --watch', 'Watch Mode');
}

function runTestsByPattern(pattern) {
  logStep(`Running Tests matching pattern: ${pattern}`);
  runCommand(`npm test -- --testNamePattern="${pattern}" --verbose`, `Pattern Tests: ${pattern}`);
}

function runTestsByFile(filePath) {
  logStep(`Running Tests for file: ${filePath}`);
  runCommand(`npm test -- "${filePath}" --verbose`, `File Tests: ${filePath}`);
}

function lintTests() {
  logStep('Linting Test Files');
  runCommand('npx eslint src/**/__tests__/**/*.{ts,tsx} --ext .ts,.tsx', 'Test File Linting');
}

function typeCheckTests() {
  logStep('Type Checking Test Files');
  runCommand('npx tsc --noEmit --project tsconfig.json --include "src/**/__tests__/**/*"', 'Test File Type Checking');
}

function generateTestReport() {
  logStep('Generating Test Report');

  // Create reports directory if it doesn't exist
  const reportsDir = path.join(__dirname, 'test-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Run tests with JUnit reporter
  runCommand(
    'npm test -- --ci --reporters=default --reporters=jest-junit --outputFile=test-reports/junit.xml',
    'Test Report Generation'
  );

  logSuccess('Test report generated in test-reports/junit.xml');
}

function cleanupTestFiles() {
  logStep('Cleaning up test artifacts');

  const cleanupDirs = [
    'coverage',
    'test-reports',
    'node_modules/.cache'
  ];

  cleanupDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        log(`  🗑️  Cleaned: ${dir}`, 'blue');
      } catch (error) {
        logWarning(`  ⚠️  Could not clean: ${dir} - ${error.message}`);
      }
    }
  });

  logSuccess('Cleanup completed');
}

function showHelp() {
  log('\n🧪 RabbitFun Launchpad Test Scripts', 'bright');
  log('=====================================\n');

  const commands = [
    { command: 'all', description: 'Run all tests (unit + integration)' },
    { command: 'unit', description: 'Run unit tests only' },
    { command: 'components', description: 'Run component tests only' },
    { command: 'hooks', description: 'Run hook tests only' },
    { command: 'integration', description: 'Run integration tests only' },
    { command: 'e2e', description: 'Run E2E tests only' },
    { command: 'coverage', description: 'Run tests with coverage report' },
    { command: 'watch', description: 'Start test watch mode' },
    { command: 'pattern <pattern>', description: 'Run tests matching pattern' },
    { command: 'file <path>', description: 'Run tests for specific file' },
    { command: 'lint', description: 'Lint test files' },
    { command: 'typecheck', description: 'Type check test files' },
    { command: 'report', description: 'Generate test report' },
    { command: 'check', description: 'Check for test files' },
    { command: 'clean', description: 'Clean up test artifacts' },
    { command: 'help', description: 'Show this help message' }
  ];

  commands.forEach(({ command, description }) => {
    log(`  ${command.padEnd(20)} ${description}`, 'blue');
  });

  log('\nExamples:', 'yellow');
  log('  node test-scripts.js all', 'blue');
  log('  node test-scripts.js coverage', 'blue');
  log('  node test-scripts.js pattern "TokenCard"', 'blue');
  log('  node test-scripts.js file "src/components/__tests__/TokenCard.test.tsx"', 'blue');
  log('  node test-scripts.js watch', 'blue');
}

function validateEnvironment() {
  logStep('Validating Test Environment');

  // Check for required dependencies
  const requiredDeps = [
    'jest',
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    'msw'
  ];

  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    requiredDeps.forEach(dep => {
      if (dependencies[dep]) {
        log(`  ✅ ${dep}: ${dependencies[dep]}`, 'green');
      } else {
        logWarning(`  ⚠️  ${dep}: Not found in package.json`);
      }
    });
  }

  // Check for test configuration files
  const configFiles = [
    'jest.config.js',
    'jest.config.json',
    'package.json'
  ];

  let jestConfigFound = false;
  configFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('jest') || file.includes('jest')) {
        log(`  ✅ Jest config found in: ${file}`, 'green');
        jestConfigFound = true;
      }
    }
  });

  if (!jestConfigFound) {
    logError('  ❌ No Jest configuration found');
  }

  // Check for setup files
  const setupFiles = [
    'src/setupTests.ts',
    'jest.setup.js',
    'jest.config.js'
  ];

  setupFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      log(`  ✅ Setup file found: ${file}`, 'green');
    }
  });

  logSuccess('Environment validation completed');
}

// Main script logic
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  log('\n🧪 RabbitFun Launchpad Test Runner', 'bright');
  log('=====================================', 'blue');

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  // Validate environment first
  validateEnvironment();

  // Check if we have test files
  if (!checkTestFiles()) {
    logError('No test files found. Please create test files before running tests.');
    process.exit(1);
  }

  switch (command) {
    case 'all':
      runUnitTests();
      runIntegrationTests();
      break;

    case 'unit':
      runUnitTests();
      break;

    case 'components':
      runComponentTests();
      break;

    case 'hooks':
      runHookTests();
      break;

    case 'integration':
      runIntegrationTests();
      break;

    case 'e2e':
      runE2ETests();
      break;

    case 'coverage':
      runCoverageTests();
      break;

    case 'watch':
      runWatchMode();
      break;

    case 'pattern':
      if (!args[1]) {
        logError('Please provide a pattern to match');
        process.exit(1);
      }
      runTestsByPattern(args[1]);
      break;

    case 'file':
      if (!args[1]) {
        logError('Please provide a file path');
        process.exit(1);
      }
      runTestsByFile(args[1]);
      break;

    case 'lint':
      lintTests();
      break;

    case 'typecheck':
      typeCheckTests();
      break;

    case 'report':
      generateTestReport();
      break;

    case 'check':
      checkTestFiles();
      break;

    case 'clean':
      cleanupTestFiles();
      break;

    case 'validate':
      validateEnvironment();
      break;

    default:
      logError(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }

  logSuccess('\n🎉 All operations completed successfully!');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  runUnitTests,
  runComponentTests,
  runHookTests,
  runIntegrationTests,
  runE2ETests,
  runCoverageTests,
  checkTestFiles,
  validateEnvironment,
  generateTestReport,
  cleanupTestFiles
};