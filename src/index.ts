// Use type imports only for type checking
import type { APIPromise } from "openai/core";
import type { BaseMessage } from "@langchain/core/messages";
import * as OsmosisCloud from "./osmosis-cloud";
import { defaultConfig } from "./consts";

// Type definitions for the libraries we'll dynamically import
type OpenAIType = any;
type AnthropicType = any;
type ChatOpenAIType = any;
type ChatAnthropicType = any;

// Storage for the dynamically loaded libraries
let OpenAI: OpenAIType;
let Anthropic: AnthropicType;
let ChatOpenAI: ChatOpenAIType;
let ChatAnthropic: ChatAnthropicType;

// Original method references that will be set when libraries are loaded
let originalOpenAIRequest: Function | null = null;
let originalAnthropicRequest: Function | null = null;
let originalLangchainOpenAIGenerate: Function | null = null;
let originalLangchainAnthropicGenerate: Function | null = null;

// Track library availability
const availableLibraries = {
  openai: false,
  anthropic: false,
  langchainOpenai: false,
  langchainAnthropic: false,
};

// Configuration state
export interface OsmosisAIOptions {
  enabled?: boolean;
  logDestination?: "console" | "cloud" | "both";
  logFilePath?: string;
  cloudApiKey?: string;
  enabledAPIs?: {
    openai?: boolean;
    anthropic?: boolean;
    langchainOpenai?: boolean;
    langchainAnthropic?: boolean;
  };
}

let osmosisConfig: OsmosisAIOptions = defaultConfig;

// Load libraries immediately on first import
(async function () {
  try {
    await loadLibraries();
  } catch (error) {
    console.warn("[OSMOSIS-AI] Warning during initial library loading:", error);
  }
})();

// Helper function to dynamically load libraries
async function loadLibraries() {
  // Load OpenAI if requested
  if (osmosisConfig.enabledAPIs?.openai) {
    try {
      const openaiModule = await import("openai");
      OpenAI = openaiModule.default;
      availableLibraries.openai = true;
      console.log("[OSMOSIS-AI] Successfully loaded OpenAI library");

      // Apply the patch right away if library is loaded
      patchOpenAI();
    } catch (error) {
      console.warn(
        "[OSMOSIS-AI] OpenAI library not available:",
        (error as Error).message,
      );
    }
  }

  // Load Anthropic if requested
  if (osmosisConfig.enabledAPIs?.anthropic) {
    try {
      const anthropicModule = await import("@anthropic-ai/sdk");
      Anthropic = anthropicModule.default;
      availableLibraries.anthropic = true;
      console.log("[OSMOSIS-AI] Successfully loaded Anthropic library");

      // Apply the patch right away if library is loaded
      patchAnthropic();
    } catch (error) {
      console.warn(
        "[OSMOSIS-AI] Anthropic library not available:",
        (error as Error).message,
      );
    }
  }

  // Load LangChain OpenAI if requested
  if (osmosisConfig.enabledAPIs?.langchainOpenai) {
    try {
      const langchainOpenaiModule = await import("@langchain/openai");
      ChatOpenAI = langchainOpenaiModule.ChatOpenAI;
      availableLibraries.langchainOpenai = true;
      console.log("[OSMOSIS-AI] Successfully loaded LangChain OpenAI library");

      // Apply the patch right away if library is loaded
      patchLangchainOpenAI();
    } catch (error) {
      console.warn(
        "[OSMOSIS-AI] LangChain OpenAI library not available:",
        (error as Error).message,
      );
    }
  }

  // Load LangChain Anthropic if requested
  if (osmosisConfig.enabledAPIs?.langchainAnthropic) {
    try {
      const langchainAnthropicModule = await import("@langchain/anthropic");
      ChatAnthropic = langchainAnthropicModule.ChatAnthropic;
      availableLibraries.langchainAnthropic = true;
      console.log(
        "[OSMOSIS-AI] Successfully loaded LangChain Anthropic library",
      );

      // Apply the patch right away if library is loaded
      patchLangchainAnthropic();
    } catch (error) {
      console.warn(
        "[OSMOSIS-AI] LangChain Anthropic library not available:",
        (error as Error).message,
      );
    }
  }
}

// Utility for logging requests
function logRequest(
  apiName: string,
  timestamp: string,
  path: string,
  method: string,
  body: any,
  query: any,
): void {
  if (!osmosisConfig.enabled) return;

  // Log to console if enabled
  if (
    osmosisConfig.logDestination === "console" ||
    osmosisConfig.logDestination === "both"
  ) {
    console.log(`[OSMOSIS-AI][${timestamp}] ${apiName} Request:`);
    console.log(`  Path: ${path}`);
    console.log(`  Method: ${method}`);

    // Log body if present
    if (body) {
      try {
        const bodyStr =
          typeof body === "string" ? body : JSON.stringify(body, null, 2);
        console.log(`  Body: ${bodyStr}`);
      } catch (e) {
        console.log(`  Body: [Unable to stringify body]`);
      }
    }

    // Log query parameters if present
    if (query && Object.keys(query).length > 0) {
      try {
        console.log(`  Query: ${JSON.stringify(query, null, 2)}`);
      } catch (e) {
        console.log(`  Query: [Unable to stringify query]`);
      }
    }
  }

  // Log to cloud if enabled
  if (
    (osmosisConfig.logDestination === "cloud" ||
      osmosisConfig.logDestination === "both") &&
    OsmosisCloud.isCloudLoggingEnabled()
  ) {
    const queryData = {
      api: apiName,
      path,
      method,
      body,
      query,
      timestamp,
    };

    // We'll log only the request for now (will update with response later)
    OsmosisCloud.sendToOsmosis(queryData, {});
  }
}

//----------------------
// OPENAI PATCHING
//----------------------
let isOpenAIV2Patched = false;

// Patch OpenAI's request method
function patchOpenAI(): void {
  if (!osmosisConfig.enabledAPIs?.openai || !availableLibraries.openai) return;

  // Store original method if not already stored
  if (!originalOpenAIRequest) {
    originalOpenAIRequest = OpenAI.prototype.request;
  }

  // Patch the low-level request method (used by v1 API)
  OpenAI.prototype.request = function <Req, Rsp>(
    options: any,
    remainingRetries?: number | null,
  ): APIPromise<Rsp> {
    // Get the resolved options
    const resolvedOptionsPromise = Promise.resolve(options);

    // First, we need to log the request and extract the necessary info
    resolvedOptionsPromise
      .then((resolvedOptions) => {
        if (
          osmosisConfig.logDestination === "console" ||
          osmosisConfig.logDestination === "both"
        ) {
          // If logging to console, use the simple logging approach
          const timestamp = new Date().toISOString();
          logRequest(
            "OpenAI",
            timestamp,
            resolvedOptions.path,
            resolvedOptions.method,
            resolvedOptions.body,
            resolvedOptions.query,
          );
        }
      })
      .catch((err) => {
        console.log(
          `  [Error processing OpenAI request options]: ${err.message}`,
        );
      });

    // Call the original method and get the response promise
    const responsePromise = originalOpenAIRequest!.apply(this, [
      options,
      remainingRetries,
    ]) as APIPromise<Rsp>;

    // If we're logging to the cloud, we need to intercept the response too
    if (
      osmosisConfig.logDestination === "cloud" ||
      osmosisConfig.logDestination === "both"
    ) {
      // We'll attach handlers to both the options and response promises
      Promise.all([resolvedOptionsPromise, responsePromise])
        .then(([resolvedOptions, response]) => {
          // Log the complete request and response to the cloud
          OsmosisCloud.sendToOsmosis(
            {
              api: "OpenAI",
              version: "v1",
              path: resolvedOptions.path,
              method: resolvedOptions.method,
              body: resolvedOptions.body,
              query: resolvedOptions.query,
              timestamp: new Date().toISOString(),
            },
            {
              data: response,
              timestamp: new Date().toISOString(),
            },
          );
        })
        .catch(() => {
          // Errors will be handled by the response promise's catch handler
        });
    }

    return responsePromise;
  };

  // Patch OpenAI v2 API chat completions - only do this once
  if (
    !isOpenAIV2Patched &&
    OpenAI.prototype.chat &&
    OpenAI.prototype.chat.completions
  ) {
    try {
      // Create closures that capture the original methods
      const originalClient = new OpenAI({ apiKey: "dummy" });

      // Add our patch to capture API calls when using v2 API style
      // We do this by monkey patching the OpenAI constructor
      const originalConstructor = OpenAI;

      // @ts-ignore - Creating a new constructor
      OpenAI = function (...args: any[]) {
        // Call the original constructor
        const instance = new originalConstructor(...args);

        // If we have chat.completions, patch it
        if (instance.chat && instance.chat.completions) {
          // Store the original methods
          const originalCreate = instance.chat.completions.create;

          // Replace with our wrapped version
          // @ts-ignore - TypeScript doesn't understand this function replacement
          instance.chat.completions.create = async function (
            ...createArgs: any[]
          ) {
            const params = createArgs[0] || {};

            // Log request
            if (
              osmosisConfig.logDestination === "console" ||
              osmosisConfig.logDestination === "both"
            ) {
              const timestamp = new Date().toISOString();
              logRequest(
                "OpenAI v2",
                timestamp,
                "/v1/chat/completions",
                "POST",
                params,
                null,
              );
            }

            let response;
            try {
              // Call original method
              // @ts-ignore - TypeScript doesn't understand the args
              response = await originalCreate.apply(this, createArgs);

              // For non-streaming requests, log the response
              if (
                !params.stream &&
                (osmosisConfig.logDestination === "cloud" ||
                  osmosisConfig.logDestination === "both")
              ) {
                OsmosisCloud.sendToOsmosis(
                  {
                    api: "OpenAI",
                    version: "v2",
                    path: "/v1/chat/completions",
                    method: "POST",
                    body: params,
                    timestamp: new Date().toISOString(),
                  },
                  {
                    data: response,
                    timestamp: new Date().toISOString(),
                  },
                );
              }

              return response;
            } catch (error) {
              // Log error if needed
              if (
                osmosisConfig.logDestination === "cloud" ||
                osmosisConfig.logDestination === "both"
              ) {
                OsmosisCloud.sendToOsmosis(
                  {
                    api: "OpenAI",
                    version: "v2",
                    path: "/v1/chat/completions",
                    method: "POST",
                    body: params,
                    timestamp: new Date().toISOString(),
                  },
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString(),
                  },
                  500,
                );
              }
              throw error;
            }
          };

          // Add streaming support
          // @ts-ignore - TypeScript doesn't understand this property
          if (originalCreate.stream) {
            // @ts-ignore - TypeScript doesn't understand this property assignment
            instance.chat.completions.create.stream = async function (
              ...streamArgs: any[]
            ) {
              const params = streamArgs[0] || {};

              // Log streaming request
              if (
                osmosisConfig.logDestination === "console" ||
                osmosisConfig.logDestination === "both"
              ) {
                const timestamp = new Date().toISOString();
                logRequest(
                  "OpenAI v2 Stream",
                  timestamp,
                  "/v1/chat/completions",
                  "POST",
                  { ...params, stream: true },
                  null,
                );
              }

              // Variables to track the stream content
              let streamContent = "";
              const streamStartTime = new Date().toISOString();

              // Log initial streaming request to cloud
              let initialLogId = "";
              if (
                osmosisConfig.logDestination === "cloud" ||
                osmosisConfig.logDestination === "both"
              ) {
                // Log that streaming was initiated
                initialLogId = OsmosisCloud.sendToOsmosis(
                  {
                    api: "OpenAI",
                    version: "v2",
                    path: "/v1/chat/completions",
                    method: "POST",
                    body: { ...params, stream: true },
                    timestamp: streamStartTime,
                  },
                  {
                    data: {
                      streaming: true,
                      status: "started",
                      message: "OpenAI streaming request started",
                    },
                    timestamp: streamStartTime,
                  },
                );

                console.log(
                  "[OSMOSIS-AI] Streaming request initiated with ID:",
                  initialLogId,
                );
              }

              // Call original stream method
              // @ts-ignore - TypeScript doesn't understand the args
              const originalStream = await originalCreate.stream.apply(
                this,
                streamArgs,
              );

              // If cloud logging is disabled, just return the original stream
              if (
                osmosisConfig.logDestination !== "cloud" &&
                osmosisConfig.logDestination !== "both"
              ) {
                return originalStream;
              }

              // We now need to handle the originalStream to both collect content and pass it through
              return {
                [Symbol.asyncIterator]: async function* () {
                  try {
                    // Process the stream, collecting content as we go
                    for await (const chunk of originalStream) {
                      // Extract content from the chunk (if present)
                      const content = chunk.choices[0]?.delta?.content || "";
                      if (content) {
                        streamContent += content;
                      }

                      // Pass through the chunk unchanged
                      yield chunk;
                    }
                  } finally {
                    // After streaming is complete, log the full content
                    if (streamContent.length > 0) {
                      const streamEndTime = new Date().toISOString();

                      console.log(
                        `[OSMOSIS-AI] Streaming completed, logging content (${streamContent.length} chars) with ID: ${initialLogId}`,
                      );

                      OsmosisCloud.sendToOsmosis(
                        {
                          api: "OpenAI",
                          version: "v2",
                          path: "/v1/chat/completions",
                          method: "POST",
                          body: { ...params, stream: true },
                          timestamp: streamEndTime,
                          requestId: initialLogId,
                        },
                        {
                          data: {
                            streaming: true,
                            status: "completed",
                            content: streamContent,
                            contentLength: streamContent.length,
                            completedAt: streamEndTime,
                            startedAt: streamStartTime,
                            message: "OpenAI streaming request completed",
                          },
                          timestamp: streamEndTime,
                        },
                      );
                    }
                  }
                },
                // Copy any methods/properties from the original stream
                controller: originalStream.controller,
              };
            };
          }
        }

        return instance;
      };

      // Copy static properties and prototype
      Object.setPrototypeOf(OpenAI, originalConstructor);
      OpenAI.prototype = originalConstructor.prototype;
      // Copy any static methods or properties
      for (const key of Object.getOwnPropertyNames(originalConstructor)) {
        if (key !== "prototype" && key !== "name" && key !== "length") {
          // @ts-ignore - TypeScript doesn't understand dynamic property access
          OpenAI[key] = originalConstructor[key];
        }
      }

      // Mark as patched
      isOpenAIV2Patched = true;
    } catch (error) {
      console.error("Error patching OpenAI v2 API:", error);
    }
  }
}

//----------------------
// ANTHROPIC PATCHING
//----------------------

// Patch Anthropic's request method
function patchAnthropic(): void {
  if (!osmosisConfig.enabledAPIs?.anthropic || !availableLibraries.anthropic)
    return;

  // Store original method if not already stored
  if (!originalAnthropicRequest) {
    originalAnthropicRequest = Anthropic.prototype.request;
  }

  Anthropic.prototype.request = function <Req, Rsp>(
    options: any,
    remainingRetries?: number | null,
  ): any {
    // Get the resolved options
    const resolvedOptionsPromise = Promise.resolve(options);

    // First, we need to log the request and extract the necessary info
    resolvedOptionsPromise
      .then((resolvedOptions) => {
        if (osmosisConfig.logDestination === "console") {
          // If only logging to console, use the simple logging approach
          const timestamp = new Date().toISOString();
          logRequest(
            "Anthropic",
            timestamp,
            resolvedOptions.path,
            resolvedOptions.method,
            resolvedOptions.body,
            resolvedOptions.query,
          );
        }
      })
      .catch((err) => {
        console.log(
          `  [Error processing Anthropic request options]: ${err.message}`,
        );
      });

    // Call the original method and get the response promise
    const responsePromise = originalAnthropicRequest!.apply(this, [
      options,
      remainingRetries,
    ]);

    // If we're logging to the cloud, we need to intercept the response too
    if (
      osmosisConfig.logDestination === "cloud" ||
      osmosisConfig.logDestination === "both"
    ) {
      // We'll attach handlers to both the options and response promises
      Promise.all([resolvedOptionsPromise, responsePromise])
        .then(([resolvedOptions, response]) => {
          // Log the complete request and response to the cloud
          OsmosisCloud.sendToOsmosis(
            {
              api: "Anthropic",
              path: resolvedOptions.path,
              method: resolvedOptions.method,
              body: resolvedOptions.body,
              query: resolvedOptions.query,
              timestamp: new Date().toISOString(),
            },
            {
              data: response,
              timestamp: new Date().toISOString(),
            },
          );
        })
        .catch(() => {
          // Errors will be handled by the response promise's catch handler
        });
    }

    return responsePromise;
  };
}

//----------------------
// LANGCHAIN OPENAI PATCHING
//----------------------

// Patch LangChain OpenAI's _generate method
function patchLangchainOpenAI(): void {
  if (
    !osmosisConfig.enabledAPIs?.langchainOpenai ||
    !availableLibraries.langchainOpenai
  )
    return;

  // Store original method if not already stored
  if (!originalLangchainOpenAIGenerate) {
    originalLangchainOpenAIGenerate = ChatOpenAI.prototype._generate;
  }

  ChatOpenAI.prototype._generate = async function (
    messages: BaseMessage[],
    options: any,
    runManager?: any,
  ): Promise<any> {
    // Create request data for logging
    const requestData = {
      model: this.modelName,
      messages: messages.map((m: any) => ({
        role: m.name || m.role || "user",
        content: m.content,
      })),
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      ...this.modelKwargs,
    };

    // Log request to console if needed
    if (
      osmosisConfig.logDestination === "console" ||
      osmosisConfig.logDestination === "both"
    ) {
      try {
        const timestamp = new Date().toISOString();
        logRequest(
          "LangChain OpenAI",
          timestamp,
          "/v1/chat/completions", // Most likely path for ChatOpenAI
          "POST",
          requestData,
          null,
        );
      } catch (err) {
        console.log(
          `  [Error processing LangChain OpenAI request]: ${(err as Error).message}`,
        );
      }
    }

    // If using cloud logging, we need to intercept the response
    if (
      osmosisConfig.logDestination === "cloud" ||
      osmosisConfig.logDestination === "both"
    ) {
      try {
        // Call the original method and get the response
        const response = await originalLangchainOpenAIGenerate!.apply(this, [
          messages,
          options,
          runManager,
        ]);

        // Log both request and response to cloud
        OsmosisCloud.sendToOsmosis(
          {
            api: "LangChain OpenAI",
            path: "/v1/chat/completions",
            method: "POST",
            body: requestData,
            timestamp: new Date().toISOString(),
          },
          {
            data: response,
            timestamp: new Date().toISOString(),
          },
        );

        return response;
      } catch (error) {
        // Log error to cloud
        OsmosisCloud.sendToOsmosis(
          {
            api: "LangChain OpenAI",
            path: "/v1/chat/completions",
            method: "POST",
            body: requestData,
            timestamp: new Date().toISOString(),
          },
          {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
          500,
        );

        throw error;
      }
    } else {
      // Just call the original method without cloud logging
      return originalLangchainOpenAIGenerate!.apply(this, [
        messages,
        options,
        runManager,
      ]);
    }
  };
}

//----------------------
// LANGCHAIN ANTHROPIC PATCHING
//----------------------

// Patch LangChain Anthropic's _generate method
function patchLangchainAnthropic(): void {
  if (
    !osmosisConfig.enabledAPIs?.langchainAnthropic ||
    !availableLibraries.langchainAnthropic
  )
    return;

  // Store original method if not already stored
  if (!originalLangchainAnthropicGenerate) {
    originalLangchainAnthropicGenerate = ChatAnthropic.prototype._generate;
  }

  ChatAnthropic.prototype._generate = async function (
    messages: BaseMessage[],
    options: any,
    runManager?: any,
  ): Promise<any> {
    // Create request data for logging
    const requestData = {
      model: this.modelName,
      messages: messages.map((m: any) => ({
        role: m.name || m.role || "user",
        content: m.content,
      })),
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      ...this.invocationKwargs,
    };

    // Log request to console if needed
    if (
      osmosisConfig.logDestination === "console" ||
      osmosisConfig.logDestination === "both"
    ) {
      try {
        const timestamp = new Date().toISOString();
        logRequest(
          "LangChain Anthropic",
          timestamp,
          "/v1/messages", // Most likely path for ChatAnthropic
          "POST",
          requestData,
          null,
        );
      } catch (err) {
        console.log(
          `  [Error processing LangChain Anthropic request]: ${(err as Error).message}`,
        );
      }
    }

    // If using cloud logging, we need to intercept the response
    if (
      osmosisConfig.logDestination === "cloud" ||
      osmosisConfig.logDestination === "both"
    ) {
      try {
        // Call the original method and get the response
        const response = await originalLangchainAnthropicGenerate!.apply(this, [
          messages,
          options,
          runManager,
        ]);

        // Log both request and response to cloud
        OsmosisCloud.sendToOsmosis(
          {
            api: "LangChain Anthropic",
            path: "/v1/messages",
            method: "POST",
            body: requestData,
            timestamp: new Date().toISOString(),
          },
          {
            data: response,
            timestamp: new Date().toISOString(),
          },
        );

        return response;
      } catch (error) {
        // Log error to cloud
        OsmosisCloud.sendToOsmosis(
          {
            api: "LangChain Anthropic",
            path: "/v1/messages",
            method: "POST",
            body: requestData,
            timestamp: new Date().toISOString(),
          },
          {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
          500,
        );

        throw error;
      }
    } else {
      // Just call the original method without cloud logging
      return originalLangchainAnthropicGenerate!.apply(this, [
        messages,
        options,
        runManager,
      ]);
    }
  };
}

/**
 * Configure the logging behavior of the osmosis-ai library
 * @param options Configuration options
 */
export function configure(options: OsmosisAIOptions): void {
  const previousConfig = { ...osmosisConfig };
  osmosisConfig = { ...osmosisConfig, ...options };

  // If enabledAPIs is partially provided, merge with existing config
  if (options.enabledAPIs) {
    osmosisConfig.enabledAPIs = {
      ...previousConfig.enabledAPIs,
      ...options.enabledAPIs,
    };
  }

  // Initialize cloud logging if API key is provided
  if (options.cloudApiKey) {
    OsmosisCloud.init(options.cloudApiKey);
  }

  // Enable or disable cloud logging based on logDestination
  if (options.logDestination) {
    if (
      options.logDestination === "cloud" ||
      options.logDestination === "both"
    ) {
      OsmosisCloud.enableOsmosis();
    } else if (options.logDestination === "console") {
      OsmosisCloud.disableOsmosis();
    }
  }

  console.log(
    `[OSMOSIS-AI] Configuration updated: ${JSON.stringify({
      ...osmosisConfig,
      cloudApiKey: osmosisConfig.cloudApiKey ? "********" : undefined,
    })}`,
  );

  // Load libraries as needed based on config
  loadLibraries().catch((error) => {
    console.error("[OSMOSIS-AI] Error loading libraries:", error);
  });
}

/**
 * Initialize cloud logging with the Osmosis API key
 * @param apiKey The Osmosis API key
 */
export function initCloud(apiKey: string): void {
  OsmosisCloud.init(apiKey);
  OsmosisCloud.enableOsmosis(); // Explicitly enable cloud logging

  // Update config to show we're using cloud logging
  if (osmosisConfig.logDestination === "console") {
    osmosisConfig.logDestination = "both";
  }
}

/**
 * Initialize the monkey patching explicitly
 * @returns An object containing all the patched classes
 */
export async function init(): Promise<{
  OpenAI?: typeof OpenAI;
  Anthropic?: typeof Anthropic;
  ChatOpenAI?: typeof ChatOpenAI;
  ChatAnthropic?: typeof ChatAnthropic;
}> {
  console.log("[OSMOSIS-AI] Initializing with dynamic imports");
  await loadLibraries();

  const exports: {
    OpenAI?: typeof OpenAI;
    Anthropic?: typeof Anthropic;
    ChatOpenAI?: typeof ChatOpenAI;
    ChatAnthropic?: typeof ChatAnthropic;
  } = {};

  // Only include libraries that were successfully loaded
  if (availableLibraries.openai) exports.OpenAI = OpenAI;
  if (availableLibraries.anthropic) exports.Anthropic = Anthropic;
  if (availableLibraries.langchainOpenai) exports.ChatOpenAI = ChatOpenAI;
  if (availableLibraries.langchainAnthropic)
    exports.ChatAnthropic = ChatAnthropic;

  return exports;
}

// Export cloud functions
export {
  init as initOsmosisCloud,
  isCloudLoggingEnabled,
  disableOsmosis as disableCloudLogging,
  enableOsmosis as enableCloudLogging,
} from "./osmosis-cloud";

// Export the libraries directly
// Note: These will be undefined until loadLibraries() completes
export { OpenAI, Anthropic, ChatOpenAI, ChatAnthropic };

// Default export still OpenAI for backward compatibility
export default OpenAI;
