/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  // Setup global mocks
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Enable caching for faster tests
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Removed changedSince option to run all tests by default
  
  // Optimize for CI environment when detected
  ...(process.env.CI && {
    // In CI environments, we want to use the cached transformer
    // but make sure we use the right one for the environment
    globals: {
      'ts-jest': {
        isolatedModules: true,
      }
    }
  })
}; 