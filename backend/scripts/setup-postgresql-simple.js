#!/usr/bin/env node

/**
 * Simple PostgreSQL Setup Script
 *
 * This script prepares the PostgreSQL environment for migration
 * Usage: node scripts/setup-postgresql-simple.js
 */

require('dotenv').config({ path: '.env.postgresql' });
const { execSync } = require('child_process');
const fs = require('fs');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'cyan');
  log('=====================================', 'cyan');

  // Check if PostgreSQL is installed
  try {
    execSync('psql --version', { stdio: 'pipe' });
    log('✅ PostgreSQL is installed', 'green');
  } catch (error) {
    log('❌ PostgreSQL is not installed or not in PATH', 'red');
    log('💡 Install PostgreSQL: https://www.postgresql.org/download/', 'yellow');
    return false;
  }

  // Check if DATABASE_URL is configured
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ DATABASE_URL not configured', 'red');
    log('💡 Set DATABASE_URL in .env.postgresql', 'yellow');
    return false;
  }

  log(`✅ DATABASE_URL configured: ${databaseUrl.replace(/\/\/.*@/, '//***@')}`, 'green');

  // Check if PostgreSQL is running
  try {
    execSync('pg_isready', { stdio: 'pipe' });
    log('✅ PostgreSQL server is running', 'green');
  } catch (error) {
    log('❌ PostgreSQL server is not running', 'red');
    log('💡 Start PostgreSQL server', 'yellow');
    return false;
  }

  return true;
}

function setupPostgreSQLDatabase() {
  log('\n🗄️ Setting up PostgreSQL database...', 'cyan');
  log('=======================================', 'cyan');

  const databaseUrl = process.env.DATABASE_URL;
  const dbName = 'rabbit_launchpad_dev';
  const dbUser = 'postgres';

  try {
    // Create database if it doesn't exist
    log(`📦 Creating database: ${dbName}`, 'yellow');

    try {
      execSync(`createdb ${dbName}`, { stdio: 'pipe' });
      log(`✅ Database ${dbName} created`, 'green');
    } catch (error) {
      if (error.status === 1) {
        log(`✅ Database ${dbName} already exists`, 'green');
      } else {
        throw error;
      }
    }

    // Test database connection
    log('🔗 Testing database connection...', 'yellow');
    const result = execSync(`psql ${databaseUrl} -c "SELECT version();"`, { encoding: 'utf8' });
    log('✅ Database connection successful', 'green');

    // Show PostgreSQL version
    const versionMatch = result.match(/PostgreSQL (\d+\.\d+)/);
    if (versionMatch) {
      log(`📊 PostgreSQL version: ${versionMatch[1]}`, 'blue');
    }

    return true;
  } catch (error) {
    log(`❌ Database setup failed: ${error.message}`, 'red');
    return false;
  }
}

function preparePrismaSchema() {
  log('\n📝 Preparing Prisma schema for PostgreSQL...', 'cyan');
  log('==========================================', 'cyan');

  try {
    // Check if PostgreSQL schema exists
    const pgSchemaPath = './prisma/schema.postgresql.prisma';
    if (fs.existsSync(pgSchemaPath)) {
      log('✅ PostgreSQL schema found', 'green');

      // Copy PostgreSQL schema as main schema
      log('📋 Copying PostgreSQL schema...', 'yellow');
      fs.copyFileSync(pgSchemaPath, './prisma/schema.prisma');
      log('✅ PostgreSQL schema set as active', 'green');
    } else {
      log('⚠️  PostgreSQL schema not found, using existing schema', 'yellow');
    }

    // Generate Prisma client
    log('🔨 Generating Prisma client...', 'yellow');
    execSync('npx prisma generate', { stdio: 'inherit' });
    log('✅ Prisma client generated', 'green');

    return true;
  } catch (error) {
    log(`❌ Prisma setup failed: ${error.message}`, 'red');
    return false;
  }
}

function createMigrationInstructions() {
  log('\n📋 Migration Instructions:', 'cyan');
  log('=============================', 'cyan');

  log('\n🚀 To complete the migration, run these commands:', 'yellow');
  log('');
  log('1. Create initial migration:', 'blue');
  log('   npx prisma migrate dev --name init_postgresql', 'blue');
  log('');
  log('2. Reset database and apply schema:', 'blue');
  log('   npx prisma db push --force-reset', 'blue');
  log('');
  log('3. (Optional) Seed with test data:', 'blue');
  log('   npm run db:seed', 'blue');
  log('');
  log('4. Start application with PostgreSQL:', 'blue');
  log('   DATABASE_URL="postgresql://postgres:password@localhost:5432/rabbit_launchpad_dev" npm run dev', 'blue');
  log('');

  log('📊 To verify migration:', 'yellow');
  log('   npx prisma studio', 'blue');
  log('');

  log('🔄 To rollback to SQLite:', 'yellow');
  log('   cp .env.development .env.postgresql.backup', 'blue');
  log('   npm run dev', 'blue');
  log('');
}

function main() {
  log('🐰 Rabbit Launchpad - PostgreSQL Setup', 'blue');
  log('=========================================', 'blue');

  // Check prerequisites
  if (!checkPrerequisites()) {
    log('\n❌ Prerequisites not met. Please install and configure PostgreSQL.', 'red');
    process.exit(1);
  }

  // Setup database
  if (!setupPostgreSQLDatabase()) {
    log('\n❌ Database setup failed.', 'red');
    process.exit(1);
  }

  // Prepare Prisma schema
  if (!preparePrismaSchema()) {
    log('\n❌ Prisma setup failed.', 'red');
    process.exit(1);
  }

  // Success message
  log('\n🎉 PostgreSQL environment setup completed!', 'green');
  log('📝 Database is ready for migration.', 'green');

  // Show next steps
  createMigrationInstructions();
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Error: ${reason}`, 'red');
  process.exit(1);
});

// Run the setup
if (require.main === module) {
  main();
}

module.exports = { main, checkPrerequisites, setupPostgreSQLDatabase };