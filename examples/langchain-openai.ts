// Example of using LangChain OpenAI with osmosis-ai
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
    langchainOpenai: true, // Enable LangChain OpenAI intercept
    langchainAnthropic: false, // Disable LangChain Anthropic intercept
  },
});

async function main() {
  console.log("Initializing libraries...");
  // First initialize and get available libraries
  const libraries = await init();

  // Check if LangChain OpenAI is available
  if (!libraries.ChatOpenAI) {
    console.error(
      "LangChain OpenAI library not available. Make sure you have installed @langchain/openai and @langchain/core",
    );
    return;
  }

  console.log("Testing LangChain OpenAI logging...\n");

  // Create LangChain OpenAI model
  const model = new libraries.ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key",
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  // Example prompt
  const prompt = "Tell me a short joke about programming.";

  try {
    console.log("Calling LangChain OpenAI API...");
    if (process.env.OPENAI_API_KEY) {
      const response = await model.invoke([new HumanMessage(prompt)]);

      console.log("\nResponse received:");
      console.log(response.content);
    } else {
      console.log("Skipping API call (no OPENAI_API_KEY provided)");
      console.log(
        "Tip: Create a .env file with your API key to test with a real request",
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }

  console.log("\nLangChain OpenAI API call was logged by osmosis-ai!");
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
