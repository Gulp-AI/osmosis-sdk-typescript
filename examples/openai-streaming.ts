// Import our patched OpenAI
import { configure, init } from "../src";
import { sendToOsmosis, isCloudLoggingEnabled } from "../src/osmosis-cloud";
import dotenv from "dotenv";

dotenv.config();

// Configure the osmosis-ai logger
configure({
  enabled: true,
  logDestination: "both", // Log to both console and cloud
  cloudApiKey: process.env.OSMOSIS_API_KEY || "demo-key", // Required for cloud logging
  enabledAPIs: {
    openai: true,
    anthropic: false, // Only enable OpenAI for this example
  },
});

// Example: Using the patched OpenAI client with streaming
async function main() {
  console.log("Initializing libraries...");
  // First initialize and get available libraries
  const libraries = await init();

  // Check if OpenAI is available
  if (!libraries.OpenAI) {
    console.error(
      "OpenAI library not available. Make sure you have installed openai",
    );
    return;
  }

  // Create OpenAI client
  const client = new libraries.OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  try {
    console.log("Example 1: Non-streaming request (v2 API)");

    if (process.env.OPENAI_API_KEY) {
      // Non-streaming request using v2 API
      const completion = await client.chat.completions.create({
        messages: [
          { role: "user", content: "Hello, can you tell me a short joke?" },
        ],
        model: "gpt-4o-mini",
      });

      console.log("Response received:");
      console.log(`${completion.choices[0]?.message?.content}\n`);

      // Now do a streaming example
      console.log("Example 2: Streaming request (v2 API)");
      console.log("Streaming response:");

      // Variables to track the stream
      const streamStartTime = new Date().toISOString();
      let streamContent = "";

      // Create an initial request for the stream
      const initialLogId = isCloudLoggingEnabled()
        ? sendToOsmosis(
            {
              api: "OpenAI Manual",
              version: "v2",
              path: "/v1/chat/completions",
              method: "POST",
              body: {
                messages: [
                  { role: "user", content: "Write a short poem about coding" },
                ],
                model: "gpt-4o-mini",
                stream: true,
              },
              timestamp: streamStartTime,
            },
            {
              data: { streaming: true, status: "started" },
              timestamp: streamStartTime,
            },
          )
        : "";

      // Stream the response
      const stream = await client.chat.completions.create({
        messages: [
          { role: "user", content: "Write a short poem about coding" },
        ],
        model: "gpt-4o-mini",
        stream: true,
      });

      let content = "";

      // Process the stream
      for await (const chunk of stream) {
        // Extract and process the delta content
        const deltaContent = chunk.choices[0]?.delta?.content || "";
        if (deltaContent) {
          process.stdout.write(deltaContent);
          content += deltaContent;
          streamContent += deltaContent;
        }
      }

      // Log the full streamed content when done
      const streamEndTime = new Date().toISOString();
      console.log("\n\nFull streamed content:");
      console.log(content);
      console.log();

      // Manually send the final streaming content to the cloud
      if (isCloudLoggingEnabled()) {
        console.log("[OSMOSIS-AI] Manually logging completed stream content:", {
          contentLength: streamContent.length,
          preview: streamContent.substring(0, 50) + "...",
        });

        sendToOsmosis(
          {
            api: "OpenAI Manual",
            version: "v2",
            path: "/v1/chat/completions",
            method: "POST",
            body: {
              messages: [
                { role: "user", content: "Write a short poem about coding" },
              ],
              model: "gpt-4o-mini",
              stream: true,
            },
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
            },
            timestamp: streamEndTime,
          },
        );
      }
    } else {
      console.log("Skipping API call (no OPENAI_API_KEY provided)");
      console.log(
        "Tip: Create a .env file with your API key to test with a real request",
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
