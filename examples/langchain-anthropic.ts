// Example of using LangChain Anthropic with osmosis-ai
import { configure, init } from "../src";
import { HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configure osmosis-ai
configure({
  enabled: true,
  logDestination: "both",
  cloudApiKey: process.env.OSMOSIS_API_KEY || "demo-key",
  enabledAPIs: {
    openai: false, // Disable direct OpenAI intercept
    anthropic: false, // Disable direct Anthropic intercept
    langchainOpenai: false, // Disable LangChain OpenAI intercept
    langchainAnthropic: true, // Enable LangChain Anthropic intercept
  },
});

async function main() {
  console.log("Initializing libraries...");
  // First initialize and get available libraries
  const libraries = await init();

  // Check if LangChain Anthropic is available
  if (!libraries.ChatAnthropic) {
    console.error(
      "LangChain Anthropic library not available. Make sure you have installed @langchain/anthropic and @langchain/core",
    );
    return;
  }

  console.log("Testing LangChain Anthropic logging...\n");

  // Create LangChain Anthropic model
  const model = new libraries.ChatAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "dummy-key",
    modelName: "claude-3-haiku-20240307",
    temperature: 0.7,
    maxTokens: 1000,
  });

  // Example prompt
  const prompt = "Tell me a short joke about programming.";

  try {
    console.log("Calling LangChain Anthropic API...");
    if (process.env.ANTHROPIC_API_KEY) {
      const response = await model.invoke([new HumanMessage(prompt)]);

      console.log("\nResponse received:");
      console.log(response.content);
    } else {
      console.log("Skipping API call (no ANTHROPIC_API_KEY provided)");
      console.log(
        "Tip: Create a .env file with your API key to test with a real request",
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }

  console.log("\nLangChain Anthropic API call was logged by osmosis-ai!");
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
