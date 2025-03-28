// Global test setup for Osmosis AI library
// Mock console methods to prevent noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock axios for cloud API calls
jest.mock("axios", () => ({
  post: jest.fn().mockResolvedValue({ status: 200, data: { success: true } }),
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Extend the Jest namespace
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add any custom matchers if needed
    }
  }
}

// Extend jest types
declare namespace jest {
  // Add necessary SpyInstance typing
  interface SpyInstance<T extends (...args: any[]) => any> {
    mockImplementation(fn: (...args: Parameters<T>) => ReturnType<T>): this;
    mockResolvedValue(value: Awaited<ReturnType<T>>): this;
    mockRejectedValue(value: any): this;
    mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this;
    mockRejectedValueOnce(value: any): this;
  }
}

beforeAll(() => {
  // Any global setup needed before all tests
});

afterAll(() => {
  // Any global cleanup needed after all tests
});

export {};
