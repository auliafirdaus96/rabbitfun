#!/usr/bin/env ts-node

/**
 * Database Setup Script
 *
 * This script sets up the database for different environments
 * Usage:
 * - Development: npx ts-node scripts/setup-database.ts dev
 * - Production: npx ts-node scripts/setup-database.ts prod
 * - Migration: npx ts-node scripts/setup-database.ts migrate
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

type Environment = 'dev' | 'prod' | 'migrate';

class DatabaseSetup {
  private environment: Environment;

  constructor(environment: Environment) {
    this.environment = environment;
  }

  async setup(): Promise<void> {
    console.log(`🔧 Setting up database for ${this.environment.toUpperCase()} environment...`);

    try {
      switch (this.environment) {
        case 'dev':
          await this.setupDevelopment();
          break;
        case 'prod':
          await this.setupProduction();
          break;
        case 'migrate':
          await this.migrateFromSQLite();
          break;
        default:
          throw new Error(`Unknown environment: ${this.environment}`);
      }

      console.log(`✅ Database setup completed for ${this.environment.toUpperCase()}`);
    } catch (error) {
      console.error(`❌ Database setup failed for ${this.environment.toUpperCase()}:`, error);
      throw error;
    }
  }

  private async setupDevelopment(): Promise<void> {
    console.log('📝 Setting up development database (PostgreSQL)...');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not found, using local PostgreSQL configuration');

      // You can add logic here to setup a local PostgreSQL instance
      // For now, we'll assume PostgreSQL is running locally
    }

    // Generate Prisma client
    console.log('🔨 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Run database migrations
    console.log('📊 Running database migrations...');
    execSync('npx prisma migrate dev', { stdio: 'inherit' });

    // Seed the database if needed
    if (fs.existsSync('./prisma/seed.ts')) {
      console.log('🌱 Seeding database...');
      execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit' });
    }

    console.log('✅ Development database setup complete');
  }

  private async setupProduction(): Promise<void> {
    console.log('🚀 Setting up production database...');

    // Validate environment variables
    this.validateProductionEnvironment();

    // Generate Prisma client
    console.log('🔨 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Deploy database migrations
    console.log('📊 Deploying database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Reset database if needed (use with caution)
    const shouldReset = process.env.DB_RESET === 'true';
    if (shouldReset) {
      console.log('⚠️  Resetting production database...');
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    }

    console.log('✅ Production database setup complete');
  }

  private async migrateFromSQLite(): Promise<void> {
    console.log('🔄 Starting migration from SQLite to PostgreSQL...');

    // Validate environment
    this.validateMigrationEnvironment();

    // Check if SQLite database exists
    const sqlitePath = './prisma/dev.db';
    if (!fs.existsSync(sqlitePath)) {
      throw new Error(`SQLite database not found at: ${sqlitePath}`);
    }

    // Setup PostgreSQL first
    await this.setupDevelopment();

    // Run migration script
    console.log('📦 Running migration script...');
    execSync(`npx ts-node scripts/migrate-to-postgresql.ts`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        POSTGRESQL_URL: process.env.DATABASE_URL || ''
      }
    });

    console.log('✅ Migration from SQLite to PostgreSQL completed');
  }

  private validateProductionEnvironment(): void {
    const requiredVars = ['DATABASE_URL'];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Required environment variable missing: ${varName}`);
      }
    }

    console.log('✅ Production environment variables validated');
  }

  private validateMigrationEnvironment(): void {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for migration');
    }

    if (!process.env.POSTGRESQL_URL && !process.env.DATABASE_URL.includes('postgresql')) {
      throw new Error('Target PostgreSQL URL is required for migration');
    }

    console.log('✅ Migration environment variables validated');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] as Environment;

  if (!['dev', 'prod', 'migrate'].includes(environment)) {
    console.log('Usage: npx ts-node scripts/setup-database.ts [dev|prod|migrate]');
    console.log('');
    console.log('Commands:');
    console.log('  dev     - Setup development database');
    console.log('  prod    - Setup production database');
    console.log('  migrate - Migrate from SQLite to PostgreSQL');
    process.exit(1);
  }

  const setup = new DatabaseSetup(environment);
  await setup.setup();
}

// Handle errors
if (require.main === module) {
  main().catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });
}

export { DatabaseSetup };