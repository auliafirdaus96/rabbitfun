# Database Test Setup Guide

This guide provides comprehensive instructions for setting up and using the test database for Rabbit Launchpad Backend integration tests.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Database Configuration](#database-configuration)
4. [Setup Scripts](#setup-scripts)
5. [Seeding Test Data](#seeding-test-data)
6. [Running Tests](#running-tests)
7. [Cleanup Procedures](#cleanup-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## 🔧 Prerequisites

### Required Software
- **PostgreSQL** (version 12 or higher)
- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **Redis** (optional, for full test coverage)

### Database Requirements
- PostgreSQL server running and accessible
- User with database creation privileges
- Sufficient disk space for test data

## 🚀 Quick Start

### 1. One-Command Setup (Linux/macOS)

```bash
# Set up test database and run integration tests
npm run test:db:setup && npm run test:integration:real
```

### 2. One-Command Setup (Windows)

```bash
# Set up test database and run integration tests
scripts\setup-test-db.bat && npm run test:integration:real
```

### 3. Manual Setup

```bash
# 1. Set up environment
cp .env.test.database .env.test

# 2. Set up database
chmod +x scripts/setup-test-db.sh
./scripts/setup-test-db.sh

# 3. Run tests
npm run test:integration:real

# 4. Cleanup (optional)
./scripts/cleanup-test-db.sh
```

## ⚙️ Database Configuration

### Environment Variables

Create `.env.test` with the following configuration:

```bash
# Database Configuration
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/rabbit_launchpad_test
DATABASE_URL=postgresql://test:test@localhost:5432/rabbit_launchpad_test

# Redis Configuration (optional)
TEST_REDIS_URL=redis://localhost:6379/1
REDIS_URL=redis://localhost:6379/1

# Test Configuration
NODE_ENV=test
JWT_SECRET=test-secret-key-for-jest-testing-purpose-only
```

### Database Schema

The test database uses a dedicated schema (`schema-test.prisma`) that includes:

- **Users**: Wallet-based user authentication
- **Tokens**: Token information and contract state
- **Transactions**: Buy/sell transaction records
- **Token Analytics**: Daily token analytics data
- **User Analytics**: User activity analytics
- **Token Favorites**: User-token relationships
- **Price History**: Token price history data
- **System Configuration**: Platform settings
- **Audit Logs**: Admin action tracking

## 🛠️ Setup Scripts

### Database Setup Script

**Linux/macOS:**
```bash
./scripts/setup-test-db.sh
```

**Windows:**
```bash
scripts\setup-test-db.bat
```

**Options:**
```bash
# Clean existing database
./scripts/setup-test-db.sh clean

# Seed data only
./scripts/setup-test-db.sh seed

# Run migrations only
./scripts/setup-test-db.sh migrate

# Verify setup
./scripts/setup-test-db.sh verify
```

### What the Setup Script Does

1. **Checks PostgreSQL connection**
2. **Creates test database user** (if not exists)
3. **Creates test database** (drops existing if present)
4. **Runs database migrations**
5. **Seeds test data**
6. **Verifies setup completion**

## 🌱 Seeding Test Data

### Automatic Seeding

The setup script automatically seeds test data with:

- **3 Test Users** (including 1 admin)
- **3 Test Tokens** (including 1 graduated token)
- **3 Test Transactions** (BUY/SELL operations)
- **Token Analytics** for daily statistics
- **User Analytics** for activity tracking
- **Price History** for chart data
- **System Configuration** for platform settings
- **Audit Logs** for admin actions

### Manual Seeding

```bash
# Seed test data manually
npm run test:db:seed
```

### Custom Test Data

Create custom test data using the `databaseHelper` utilities:

```typescript
import { createTestUser, createTestToken, createTestTransaction } from '../tests/helpers/databaseHelper';

// Create custom user
const user = await createTestUser({
  walletAddress: '0x...',
  isAdmin: true,
  isVerified: true
});

// Create custom token
const token = await createTestToken({
  name: 'Custom Token',
  symbol: 'CUSTOM',
  graduated: true
});
```

## 🧪 Running Tests

### Integration Tests with Real Database

```bash
# Run all real database integration tests
npm run test:integration:real

# Run specific test file
npm test -- tests/integration/database-real.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Available Test Categories

```bash
# Unit tests (no database)
npm run test:unit

# Integration tests (mocked database)
npm run test:integration:mocked

# Integration tests (real database)
npm run test:integration:real

# All integration tests
npm run test:integration

# All tests
npm test
```

### Test Structure

```
tests/integration/
├── database-real.test.ts      # Real database tests
├── database-mock.test.ts      # Mocked database tests
├── api-flow.test.ts           # API flow tests
└── database.test.ts           # Original database tests
```

## 🧹 Cleanup Procedures

### Full Cleanup

**Linux/macOS:**
```bash
./scripts/cleanup-test-db.sh
```

**Windows:**
```bash
scripts\cleanup-test-db.bat
```

### Partial Cleanup

```bash
# Clean tables only
./scripts/cleanup-test-db.sh tables

# Clean Redis data
./scripts/cleanup-test-db.sh redis

# Clean test files
./scripts/cleanup-test-db.sh files

# Drop entire database
./scripts/cleanup-test-db.sh drop

# Cleanup after failed tests
./scripts/cleanup-test-db.sh failed
```

### npm Scripts

```bash
# Setup database
npm run test:db:setup

# Cleanup database
npm run test:db:cleanup

# Seed data
npm run test:db:seed
```

## 🔍 Troubleshooting

### Common Issues

#### 1. PostgreSQL Connection Failed

**Error:** `ECONNREFUSED` or `connection refused`

**Solution:**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (Ubuntu/Debian)
sudo systemctl start postgresql

# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Start PostgreSQL (Windows)
# Use Services or start PostgreSQL manually
```

#### 2. Permission Denied

**Error:** `permission denied for database`

**Solution:**
```bash
# Create user with proper permissions
psql -U postgres -c "CREATE USER test WITH PASSWORD 'test' CREATEDB;"

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rabbit_launchpad_test TO test;"
```

#### 3. Database Already Exists

**Error:** `database "rabbit_launchpad_test" already exists`

**Solution:**
```bash
# Drop existing database
psql -U postgres -c "DROP DATABASE rabbit_launchpad_test;"

# Or use the clean option
./scripts/setup-test-db.sh clean
```

#### 4. Port Already in Use

**Error:** `port 5432 is already in use`

**Solution:**
```bash
# Check what's using the port
netstat -tulpn | grep 5432

# Or use different port in configuration
TEST_DATABASE_URL=postgresql://test:test@localhost:5433/rabbit_launchpad_test
```

#### 5. Redis Connection Failed

**Error:** `Redis connection failed`

**Solution:**
```bash
# Start Redis
redis-server

# Or skip Redis (tests will still work with warnings)
export REDIS_URL=""
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export DEBUG=*

# Run tests with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- tests/integration/database-real.test.ts --detectOpenHandles
```

### Database Inspection

```bash
# Connect to test database
psql -h localhost -p 5432 -U test -d rabbit_launchpad_test

# Check tables
\dt

# Check data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM tokens;
SELECT COUNT(*) FROM transactions;
```

## 📚 Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` and `afterEach` for cleanup
- Avoid sharing state between tests

### 2. Data Management

```typescript
// Good: Clean setup for each test
beforeEach(async () => {
  await setupTestDatabase();
});

afterEach(async () => {
  await cleanupTestDatabase();
});
```

### 3. Performance Optimization

- Use transactions for bulk operations
- Clean up data efficiently
- Avoid unnecessary database connections

### 4. Error Handling

```typescript
// Good: Proper error handling
try {
  await createTestUser(userData);
} catch (error) {
  console.error('Failed to create test user:', error);
  throw error;
}
```

### 5. CI/CD Integration

```yaml
# GitHub Actions example
- name: Setup Test Database
  run: |
    npm run test:db:setup

- name: Run Integration Tests
  run: |
    npm run test:integration:real

- name: Cleanup Test Database
  if: always()
  run: |
    npm run test:db:cleanup
```

### 6. Environment Management

- Use separate `.env.test` file
- Never use production credentials in tests
- Keep test data small and focused

### 7. Database Connection Pooling

```typescript
// Good: Configure connection pool for tests
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
  // Limit connections for testing
  __internal: {
    engine: {
      connectionLimit: 5,
    },
  },
});
```

## 📖 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

## 🆘 Support

If you encounter issues with the test database setup:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [prerequisites](#prerequisites)
3. Ensure all environment variables are set correctly
4. Check PostgreSQL and Redis service status
5. Create an issue with detailed error information

---

**Note:** The test database is designed for development and testing purposes only. Never use it in production environments.