# Testing the Osmosis AI Library

This document provides information on how to run tests for the Osmosis AI library.

## Running Tests

The library uses Jest for testing. To run tests:

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized into several files:

- `index.test.ts` - Tests the core functionality of the library
- `osmosis-cloud.test.ts` - Tests the cloud logging module
- `cloud-integration.test.ts` - Integration tests for cloud logging

## CI/CD Integration

Tests are automatically run on pull requests and pushes to the main branch via GitHub Actions. The workflow configuration is in `.github/workflows/test.yml`.

## Writing Tests

When adding new features, please ensure they are covered by tests. Here are some guidelines:

1. Mock any external dependencies such as OpenAI and Anthropic SDKs
2. Test both normal operation and error handling
3. Use descriptive test names that explain what the test is checking
4. Group related tests using `describe` blocks

### Example Test

```typescript
describe("My Feature", () => {
  beforeEach(() => {
    // Setup code
  });

  test("should handle normal operation", () => {
    // Test code
    expect(result).toBe(expectedValue);
  });

  test("should handle errors gracefully", () => {
    // Test error handling
    expect(() => functionThatThrows()).toThrow();
  });
});
```

## Coverage Requirements

We aim for at least 80% test coverage for all files. You can check coverage after running:

```bash
npm run test:coverage
```

This will generate a coverage report in the `coverage` directory. You can open `coverage/lcov-report/index.html` in your browser to view a detailed coverage report.
