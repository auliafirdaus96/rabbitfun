#!/usr/bin/env node

/**
 * Test runner script for Rabbit Launchpad Backend
 *
 * This script provides different test running options:
 * - Run all tests
 * - Run only unit tests
 * - Run only integration tests
 * - Run tests with coverage
 * - Run tests in watch mode
 */

const { execSync } = require('child_process');
const path = require('path');

const TEST_CATEGORIES = {
  unit: 'tests/api/**/*.test.ts',
  integration: 'tests/integration/**/*.test.ts',
  all: 'tests/**/*.test.ts'
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    category: 'all',
    coverage: false,
    watch: false,
    verbose: false,
    updateSnapshots: false
  };

  for (const arg of args) {
    switch (arg) {
      case '--unit':
        options.category = 'unit';
        break;
      case '--integration':
        options.category = 'integration';
        break;
      case '--coverage':
      case '-c':
        options.coverage = true;
        break;
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--update-snapshots':
      case '-u':
        options.updateSnapshots = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
};

const showHelp = () => {
  console.log(`
Test Runner for Rabbit Launchpad Backend

Usage: node runAllTests.js [options]

Options:
  --unit                 Run only unit tests (API tests)
  --integration          Run only integration tests
  --coverage, -c         Generate coverage report
  --watch, -w           Run tests in watch mode
  --verbose, -v         Run tests with verbose output
  --update-snapshots, -u Update test snapshots
  --help, -h            Show this help message

Examples:
  node runAllTests.js                    # Run all tests
  node runAllTests.js --unit             # Run only unit tests
  node runAllTests.js --integration      # Run only integration tests
  node runAllTests.js --coverage         # Run all tests with coverage
  node runAllTests.js --unit --watch     # Run unit tests in watch mode
  node runAllTests.js --verbose          # Run all tests with verbose output
`);
};

const buildJestCommand = (options) => {
  const testPattern = TEST_CATEGORIES[options.category];
  let command = 'jest';

  // Add test pattern
  command += ` ${testPattern}`;

  // Add coverage
  if (options.coverage) {
    command += ' --coverage';
    command += ' --coverageDirectory=coverage';
    command += ' --coverageReporters=text,lcov,html';
  }

  // Add watch mode
  if (options.watch) {
    command += ' --watch';
  }

  // Add verbose output
  if (options.verbose) {
    command += ' --verbose';
  }

  // Add update snapshots
  if (options.updateSnapshots) {
    command += ' --updateSnapshot';
  }

  // Add test timeout
  command += ' --testTimeout=30000';

  return command;
};

const runTests = (options) => {
  console.log(`🧪 Running ${options.category} tests for Rabbit Launchpad Backend`);
  console.log('='.repeat(60));

  if (options.coverage) {
    console.log('📊 Coverage report will be generated');
  }

  if (options.watch) {
    console.log('👀 Watch mode enabled');
  }

  console.log('');

  try {
    const command = buildJestCommand(options);
    console.log(`🚀 Executing: ${command}`);
    console.log('');

    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    console.log('');
    console.log('✅ Tests completed successfully!');

    if (options.coverage) {
      console.log('📈 Coverage report generated in ./coverage directory');
      console.log('📄 Open ./coverage/lcov-report/index.html to view detailed report');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Tests failed!');
    console.error('');
    console.error('Please check the test output above for details.');
    process.exit(1);
  }
};

const main = () => {
  const options = parseArgs();
  runTests(options);
};

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  buildJestCommand,
  runTests,
  TEST_CATEGORIES
};