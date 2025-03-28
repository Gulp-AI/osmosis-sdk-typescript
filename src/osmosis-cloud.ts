import { createHash } from "crypto";
import xxhash from "xxhash-wasm";
import { OSMOSIS_API_URL } from "./consts";

// Global configuration
let enabled = true;
let osmosisApiKey: string | null = null;
let initialized = false;
let xxhashInstance: any = null;

/**
 * Initialize Osmosis cloud logging with the API key
 * @param apiKey The Osmosis API key for logging LLM usage
 */
export async function init(apiKey: string): Promise<void> {
  osmosisApiKey = apiKey;
  if (!apiKey) {
    console.warn("[OSMOSIS-AI] No API key provided. Cloud logging disabled.");
    return;
  }
  xxhashInstance = await xxhash();
  initialized = true;
  console.log("[OSMOSIS-AI] Cloud logging initialized");
}

/**
 * Disable Osmosis cloud logging
 */
export function disableOsmosis(): void {
  enabled = false;
}

/**
 * Enable Osmosis cloud logging
 */
export function enableOsmosis(): void {
  enabled = true;
}

/**
 * Create a hash of the API key to use as an owner identifier
 * Using xxhash-wasm for fast non-cryptographic hashing
 */
function getOwnerHash(apiKey: string): string {
  if (!xxhashInstance) {
    // Fallback to sha256 if xxhash isn't initialized yet
    return createHash("sha256").update(apiKey).digest("hex").substring(0, 8);
  }

  // Use xxhash's h32ToString which returns a zero-padded hex string
  return xxhashInstance.h32ToString(apiKey);
}

/**
 * Send query and response data to the Osmosis API
 * @returns The request ID that can be used to link related requests
 */
export function sendToOsmosis(
  query: Record<string, any>,
  response: Record<string, any>,
  status: number = 200,
): string {
  if (!enabled || !osmosisApiKey) {
    return "";
  }

  if (!initialized) {
    console.warn(
      "[OSMOSIS-AI] Cloud logging not initialized. Call init(apiKey) first.",
    );
    return "";
  }

  // Generate a request ID for linking requests (if not provided)
  const requestId =
    query.requestId ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    // Create headers
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": osmosisApiKey,
    };

    // Prepare main data payload
    const data = {
      owner: getOwnerHash(osmosisApiKey),
      date: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
      query: { ...query, requestId },
      response,
      status,
    };

    // Send main data payload
    fetch(`${OSMOSIS_API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify(data).replace(/\n/g, "") + "\n",
    })
      .then((result) => {
        if (result.status !== 200) {
          console.warn(
            `[OSMOSIS-AI] API returned status ${result.status} for data`,
          );
        }
      })
      .catch((error) => {
        console.warn(
          `[OSMOSIS-AI] Failed to send data to Osmosis API: ${error}`,
        );
      });
  } catch (error) {
    console.warn(
      `[OSMOSIS-AI] Failed to prepare data for Osmosis API: ${error}`,
    );
  }

  return requestId;
}

/**
 * Check if cloud logging is initialized and enabled
 */
export function isCloudLoggingEnabled(): boolean {
  return initialized && enabled;
}

/**
 * Testing utility functions - only exported in test environment
 */
export const __testing__ = {
  resetState: () => {
    enabled = true;
    osmosisApiKey = null;
    xxhashInstance = null;
    initialized = false;
  },
  setInitialized: (value: boolean) => {
    initialized = value;
  },
  setApiKey: (value: string | null) => {
    osmosisApiKey = value;
  },
  setEnabled: (value: boolean) => {
    enabled = value;
  },
};
