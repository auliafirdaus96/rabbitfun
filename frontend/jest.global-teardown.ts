/**
 * Jest Global Teardown
 * Global test cleanup and teardown
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Running global teardown...');

  // Clean up temporary files and directories
  const tempDirs = [
    path.join(process.cwd(), '.jest-cache'),
    path.join(process.cwd(), 'test-temp'),
    path.join(process.cwd(), 'coverage/tmp')
  ];

  tempDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`  🗑️  Cleaned: ${dir}`);
      } catch (error) {
        console.warn(`  ⚠️  Could not clean ${dir}: ${error.message}`);
      }
    }
  });

  // Clean up any running processes
  try {
    // Kill any hanging test processes
    execSync('pkill -f "jest" || true', { stdio: 'pipe' });
    execSync('pkill -f "node.*test" || true', { stdio: 'pipe' });
  } catch (error) {
    // Ignore errors from process cleanup
  }

  // Generate final test report summary if needed
  // await generateTestSummary();

  console.log('✅ Global teardown complete');
}