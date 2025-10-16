/**
 * Jest Configuration
 * Comprehensive testing setup for RabbitFun Launchpad
 */

module.exports = {
  // Test Environment
  testEnvironment: 'jsdom',

  // Setup Files
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.cjs',
    '<rootDir>/src/integration/setupIntegrationTests.cjs',
  ],

  // Module File Extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Module Name Mapping (for absolute imports)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-transform',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-transform',
  },

  // Transform
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },

  // Ignore transformations for ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(axios|ethers|web3|@radix-ui|zustand|msw)/)',
  ],

  // Coverage Configuration (disabled for now)
  collectCoverage: false,

  // Test Files Pattern
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx,js,jsx}',
    '<rootDir>/src/integration/**/*.{test,spec}.{ts,tsx,js,jsx}',
  ],

  // Ignore Patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],

  // Module Directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // Verbose Output
  verbose: true,

  // Test Timeout
  testTimeout: 10000,

  // Clear Mocks
  clearMocks: true,
  restoreMocks: true,

  // Error Handling
  errorOnDeprecated: true,

  // Mock Patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
};