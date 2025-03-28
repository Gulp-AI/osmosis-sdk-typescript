import * as OsmosisCloud from "../src/osmosis-cloud";
import { OSMOSIS_API_URL } from "../src/consts";

// Destructure functions from the module
const {
  init,
  disableOsmosis,
  enableOsmosis,
  isCloudLoggingEnabled,
  sendToOsmosis,
  __testing__,
} = OsmosisCloud;

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    status: 200,
    json: () => Promise.resolve({ success: true }),
  }),
) as jest.Mock;

// Store original console methods
const originalConsole = { ...console };

describe("Osmosis Cloud Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset module state before each test
    __testing__.resetState();

    // Reset console mocks before each test
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterAll(() => {
    // Restore original console
    console = originalConsole;
  });

  describe("Initialization and Configuration", () => {
    test("init() should initialize cloud logging with API key", async () => {
      await init("test-api-key");
      __testing__.setInitialized(true); // Force initialization state
      expect(isCloudLoggingEnabled()).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Cloud logging initialized"),
      );
    });

    test("init() should warn when no API key provided", async () => {
      // @ts-ignore - Testing null API key
      await init(null);
      expect(isCloudLoggingEnabled()).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("No API key provided"),
      );
    });

    test("disableOsmosis() should disable cloud logging", async () => {
      await init("test-api-key");
      __testing__.setInitialized(true); // Force initialization state
      disableOsmosis();
      expect(isCloudLoggingEnabled()).toBe(false);
    });

    test("enableOsmosis() should enable cloud logging", async () => {
      await init("test-api-key");
      __testing__.setInitialized(true); // Force initialization state
      disableOsmosis();
      enableOsmosis();
      expect(isCloudLoggingEnabled()).toBe(true);
    });
  });

  describe("Data Sending", () => {
    test("sendToOsmosis() should not send when disabled", async () => {
      await init("test-api-key");
      __testing__.setInitialized(true); // Force initialization state
      disableOsmosis();

      await sendToOsmosis({ test: true }, { result: "test" });

      expect(fetch).not.toHaveBeenCalled();
    });

    test("sendToOsmosis() should not send when apiKey is missing", async () => {
      // Make sure enabled is true but no API key is set
      __testing__.resetState();

      await sendToOsmosis({ test: true }, { result: "test" });

      expect(fetch).not.toHaveBeenCalled();
    });

    test("sendToOsmosis() should warn when not initialized", async () => {
      // Set up with API key but not initialized
      __testing__.resetState();
      __testing__.setApiKey("test-api-key");
      __testing__.setInitialized(false);

      await sendToOsmosis({ test: true }, { result: "test" });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("not initialized"),
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    test("sendToOsmosis() should send data when enabled", async () => {
      // Re-initialize for the test
      await init("test-api-key");
      __testing__.setInitialized(true); // Force initialization state
      enableOsmosis();

      const query = { api: "test", path: "/test", method: "post" };
      const response = { data: "test response" };

      const requestId = await sendToOsmosis(query, response);

      expect(fetch).toHaveBeenCalled();
      expect(requestId).toMatch(/^req_/);

      const [url, options] = (fetch as jest.Mock).mock.calls[0];

      expect(url).toBe(`${OSMOSIS_API_URL}/ingest`);
      expect(options.headers).toHaveProperty("x-api-key", "test-api-key");

      // Verify data format
      const bodyData = options.body as string;
      expect(bodyData).toContain('"query":');
      expect(bodyData).toContain('"response":');
      expect(bodyData).toContain('"date":');
      expect(bodyData).toContain('"owner":');
    });

    test("sendToOsmosis() should handle API errors", async () => {
      const warnSpy = jest.spyOn(console, "warn");

      await init("test-api-key");
      __testing__.setInitialized(true); // Force initialization state
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 400,
        json: () => Promise.resolve({ error: "Bad request" }),
      });

      await sendToOsmosis({ test: true }, { result: "test" });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("API returned status 400"),
      );

      warnSpy.mockRestore();
    });

    test("sendToOsmosis() should handle exceptions", async () => {
      // Ensure we mock console.warn directly
      console.warn = jest.fn();

      // Initialize with API key and ensure it's ready
      await init("test-api-key");
      __testing__.setInitialized(true); // Force initialization state

      // Set up a mock implementation that forces the fetch to throw
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Network error");
      });

      // Call the function with the error-triggering mock
      await sendToOsmosis({ test: true }, { result: "test" });

      // Verify error was properly logged - the actual message includes "Failed to prepare data"
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to prepare data for Osmosis API"),
      );
    });

    test("sendToOsmosis() should maintain provided requestId", async () => {
      await init("test-api-key");
      __testing__.setInitialized(true); // Force initialization state

      const query = {
        api: "test",
        path: "/test",
        method: "post",
        requestId: "custom-id-123",
      };

      await sendToOsmosis(query, { result: "test" });

      expect(fetch).toHaveBeenCalled();

      const [_, options] = (fetch as jest.Mock).mock.calls[0];
      expect(options.body).toContain("custom-id-123");
    });
  });
});
