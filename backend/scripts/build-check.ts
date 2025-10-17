#!/usr/bin/env ts-node

/**
 * Build Verification Script
 *
 * This script verifies that the build process completed successfully
 * and all necessary files are present in the dist directory.
 */

import * as fs from 'fs';
import * as path from 'path';

interface BuildCheckResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  missingFiles: string[];
}

class BuildChecker {
  private distPath: string;
  private requiredFiles: string[];

  constructor() {
    this.distPath = path.join(__dirname, '../dist');
    this.requiredFiles = [
      'server.js',
      'server.d.ts',
      'config/database.js',
      'config/database.d.ts',
      'generated/prisma/index.js',
      'generated/prisma/index.d.ts'
    ];
  }

  async check(): Promise<BuildCheckResult> {
    console.log('🔍 Checking build output...');

    const result: BuildCheckResult = {
      success: true,
      errors: [],
      warnings: [],
      missingFiles: []
    };

    // Check if dist directory exists
    if (!fs.existsSync(this.distPath)) {
      result.errors.push('dist directory not found');
      result.success = false;
      return result;
    }

    // Check required files
    for (const file of this.requiredFiles) {
      const filePath = path.join(this.distPath, file);
      if (!fs.existsSync(filePath)) {
        result.missingFiles.push(file);
        result.warnings.push(`Missing file: ${file}`);
      }
    }

    // Check package.json exists
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      result.errors.push('package.json not found');
      result.success = false;
    }

    // Check if main file exists and is executable
    const mainFilePath = path.join(this.distPath, 'server.js');
    if (fs.existsSync(mainFilePath)) {
      try {
        const stats = fs.statSync(mainFilePath);
        if (stats.size === 0) {
          result.errors.push('Main server.js file is empty');
          result.success = false;
        }
      } catch (error) {
        result.errors.push(`Failed to read server.js: ${error}`);
        result.success = false;
      }
    } else {
      result.errors.push('Main server.js file not found');
      result.success = false;
    }

    // Check for TypeScript compilation errors in log files
    const logFiles = ['npm-debug.log', 'yarn-error.log'];
    for (const logFile of logFiles) {
      const logPath = path.join(process.cwd(), logFile);
      if (fs.existsSync(logPath)) {
        result.warnings.push(`Found error log file: ${logFile}`);
      }
    }

    // Print results
    this.printResults(result);

    return result;
  }

  private printResults(result: BuildCheckResult): void {
    console.log('\n📊 Build Check Results:');
    console.log('='.repeat(50));

    if (result.success) {
      console.log('✅ Build check PASSED');
    } else {
      console.log('❌ Build check FAILED');
    }

    if (result.errors.length > 0) {
      console.log('\n🚨 Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (result.missingFiles.length > 0) {
      console.log('\n📁 Missing Files:');
      result.missingFiles.forEach(file => console.log(`  - ${file}`));
    }

    if (result.success && result.errors.length === 0) {
      console.log('\n🎉 All checks passed! Build is ready for deployment.');
    }

    console.log('='.repeat(50));
  }
}

// Main execution
async function main() {
  const checker = new BuildChecker();
  const result = await checker.check();

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Handle errors
if (require.main === module) {
  main().catch((error) => {
    console.error('Build check failed:', error);
    process.exit(1);
  });
}

export { BuildChecker };