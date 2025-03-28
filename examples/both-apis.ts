// Example of using both OpenAI and Anthropic with osmosis-ai
import { configure, init } from "../src";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configure osmosis-ai
configure({
  enabled: true,
  logDestination: "both",
  cloudApiKey: process.env.OSMOSIS_API_KEY || "demo-key",
  enabledAPIs: {
    openai: true,
    anthropic: true,
  },
});

async function main() {
  console.log("Initializing libraries...");
  // First initialize and get available libraries
  const libraries = await init();

  // Check if libraries are available
  if (!libraries.OpenAI) {
    console.error(
      "OpenAI library not available. Make sure you have installed openai",
    );
    return;
  }

  if (!libraries.Anthropic) {
    console.error(
      "Anthropic library not available. Make sure you have installed @anthropic-ai/sdk",
    );
    return;
  }

  console.log("Testing both OpenAI and Anthropic logging...\n");

  // Create API clients
  const openaiClient = new libraries.OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key",
  });

  const anthropicClient = new libraries.Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "dummy-key",
  });

  // Example prompt for both APIs
  const prompt = "Tell me a short joke about programming.";

  try {
    console.log("1. Calling OpenAI API...");
    if (process.env.OPENAI_API_KEY) {
      const openaiResponse = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
      });
      console.log(
        "OpenAI Response:",
        openaiResponse.choices[0]?.message?.content,
      );
    } else {
      console.log("Skipping OpenAI API call (no API key)");
    }

    console.log("\n2. Calling Anthropic API...");
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropicResponse = await anthropicClient.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      });

      // Handle different content types safely
      if (anthropicResponse.content[0]?.type === "text") {
        console.log("Anthropic Response:", anthropicResponse.content[0].text);
      } else {
        console.log("Anthropic Response:", anthropicResponse.content);
      }
    } else {
      console.log("Skipping Anthropic API call (no API key)");
    }
  } catch (error) {
    console.error("Error:", error);
  }

  console.log("\nBoth API calls were logged by osmosis-ai!");
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
