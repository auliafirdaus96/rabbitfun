# Backend Test Suite

This directory contains the comprehensive test suite for the Rabbit Launchpad Backend API.

## 📁 Structure

```
tests/
├── api/                    # API endpoint tests (Unit tests)
│   ├── health.test.ts      # Health check and root endpoint tests
│   ├── tokens.test.ts      # Token management API tests
│   ├── users.test.ts       # User management API tests
│   ├── analytics.test.ts   # Analytics API tests
│   ├── contracts.test.ts   # Contract integration API tests
│   ├── webhooks.test.ts    # Webhook endpoint tests
│   ├── bondingCurve.test.ts # Bonding curve calculation tests
│   ├── upload.test.ts      # File upload endpoint tests
│   └── errors.test.ts      # Error handling and validation tests
├── integration/            # Integration tests
│   ├── api-flow.test.ts    # End-to-end API flow tests
│   ├── database.test.ts    # Database integration tests
│   └── database-mock.test.ts # Mocked database tests
├── helpers/                # Test utilities and helpers
│   └── testUtils.ts        # Common test utilities
├── setup.ts               # Test environment setup
├── runAllTests.js         # Test runner script
└── README.md              # This file
```

## 🚀 Quick Start

### Running All Tests

```bash
# From the backend directory
npm test

# Or using the custom test runner
node tests/runAllTests.js
```

### Running Specific Test Categories

```bash
# Run only unit tests
node tests/runAllTests.js --unit

# Run only integration tests
node tests/runAllTests.js --integration
```

### Running Tests with Coverage

```bash
# Run all tests with coverage report
npm test -- --coverage

# Or using the custom test runner
node tests/runAllTests.js --coverage
```

### Running Tests in Watch Mode

```bash
# Run tests in watch mode for development
npm run test:watch

# Or using the custom test runner
node tests/runAllTests.js --watch
```

## 🧪 Test Categories

### 1. Unit Tests (`tests/api/`)

These tests focus on individual API endpoints and their functionality:

- **Health Tests**: Verify health check and root endpoints
- **Token Tests**: Test token management, calculations, and bonding curves
- **User Tests**: Test user profile management
- **Analytics Tests**: Test analytics and dashboard endpoints
- **Contract Tests**: Test smart contract integration endpoints
- **Webhook Tests**: Test blockchain event webhook endpoints
- **Bonding Curve Tests**: Test bonding curve calculations and configuration
- **Upload Tests**: Test file upload endpoints and validation
- **Error Tests**: Test error handling, validation, and edge cases

### 2. Integration Tests (`tests/integration/`)

These tests verify the interaction between multiple components:

- **API Flow Tests**: Test complete user flows across multiple endpoints
- **Database Tests**: Test database connectivity and operations

## 🛠️ Configuration

### Environment Setup

Tests use a separate environment configuration in `.env.test`:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/rabbit_launchpad_test
JWT_SECRET=test-secret-key-for-jest-testing
# ... other test configurations
```

### Test Database

Tests run against a separate test database to avoid affecting development data. Make sure the test database exists before running tests:

```bash
# Create test database
createdb rabbit_launchpad_test

# Run migrations on test database
npm run db:migrate
```

### Test Timeout

Tests have a default timeout of 30 seconds to handle async operations properly.

## 📊 Coverage

Coverage reports are generated in the `./coverage` directory when running tests with the `--coverage` flag:

- **HTML Report**: `./coverage/lcov-report/index.html`
- **LCOV Report**: `./coverage/lcov.info`
- **Text Report**: Displayed in console

## 🔧 Test Utilities

### Test Helpers (`tests/helpers/testUtils.ts`)

Common utilities for test development:

```typescript
import {
  generateValidAddress,
  createValidTokenData,
  expectValidApiResponse
} from '../helpers/testUtils';

// Generate valid test data
const address = generateValidAddress();
const tokenData = createValidTokenData();

// Validate API responses
expectValidApiResponse(response, 200);
```

### Mock Data

Predefined mock data for consistent testing:

```typescript
import { mockData } from '../helpers/testUtils';

const {
  validAddress,
  invalidAddress,
  tokenData,
  buyData,
  sellData
} = mockData;
```

## 📝 Writing New Tests

### API Endpoint Test Template

```typescript
import request from 'supertest';
import { app } from '../../src/server';
import { expectValidApiResponse, expectValidErrorResponse } from '../helpers/testUtils';

describe('API Endpoint', () => {
  describe('GET /api/endpoint', () => {
    it('should return valid response', async () => {
      const response = await request(app)
        .get('/api/endpoint')
        .expect(200);

      expectValidApiResponse(response);
      expect(response.body.data).toHaveProperty('expectedField');
    });

    it('should handle errors gracefully', async () => {
      const response = await request(app)
        .get('/api/endpoint?param=invalid')
        .expect(400);

      expectValidErrorResponse(response, 400);
    });
  });
});
```

### Integration Test Template

```typescript
import request from 'supertest';
import { app } from '../../src/server';

describe('Integration Flow', () => {
  it('should handle complete flow', async () => {
    // Step 1: Create resource
    const createResponse = await request(app)
      .post('/api/resource')
      .send(createData)
      .expect(200);

    // Step 2: Get resource
    const getResponse = await request(app)
      .get(`/api/resource/${createResponse.body.data.id}`)
      .expect(200);

    // Step 3: Update resource
    const updateResponse = await request(app)
      .put(`/api/resource/${getResponse.body.data.id}`)
      .send(updateData)
      .expect(200);

    // Step 4: Delete resource
    await request(app)
      .delete(`/api/resource/${updateResponse.body.data.id}`)
      .expect(200);
  });
});
```

## 🐛 Debugging Tests

### Running Tests in Debug Mode

```bash
# Run specific test file in debug mode
node --inspect-brk node_modules/.bin/jest tests/api/health.test.ts

# Or using npm
npm test -- --testNamePattern="specific test name"
```

### Console Output

Tests suppress console output by default. To enable console logs during testing:

```typescript
// In your test file
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
});
```

## 📋 Best Practices

1. **Test Names**: Use descriptive test names that explain what is being tested
2. **Data Isolation**: Each test should be independent and not rely on other tests
3. **Mock External Services**: Use mocks for external services and APIs
4. **Error Cases**: Test both success and error scenarios
5. **Edge Cases**: Test boundary conditions and invalid inputs
6. **Async Operations**: Always await async operations properly
7. **Cleanup**: Clean up any test data after tests complete

## 🔄 Continuous Integration

The test suite is designed to run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    cd backend
    npm ci
    npm run test:ci
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-testing-and-overall-quality-practices)

## 🤝 Contributing

When adding new features:

1. Write tests for new functionality
2. Ensure all existing tests still pass
3. Maintain test coverage above 80%
4. Follow the established test patterns and naming conventions

## 📞 Support

For questions about testing or to report test-related issues, please refer to the project documentation or create an issue in the repository.