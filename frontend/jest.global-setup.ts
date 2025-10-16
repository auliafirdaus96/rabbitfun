/**
 * Jest Global Setup
 * Global test configuration and setup
 */

import { config } from '@jest/globals';
import { loadEnvConfig } from '@next/env';

// Load environment variables
loadEnvConfig(process.cwd());

// Set global test timeout
config.testTimeout = 30000;

// Global test setup
export default async function globalSetup() {
  console.log('🧪 Setting up test environment...');

  // Set up global test database if needed
  // await setupTestDatabase();

  // Start external services if needed
  // await startTestServices();

  // Generate test data if needed
  // await generateTestData();

  console.log('✅ Test environment setup complete');
}

// Global test teardown
export async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  // Clean up test database if needed
  // await cleanupTestDatabase();

  // Stop external services if needed
  // await stopTestServices();

  // Clean up test data if needed
  // await cleanupTestData();

  console.log('✅ Test environment cleanup complete');
}