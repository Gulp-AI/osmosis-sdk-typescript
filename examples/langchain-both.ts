// Example of using both LangChain OpenAI and Anthropic with osmosis-ai
import { configure, init } from '../src';
import { HumanMessage } from '@langchain/core/messages';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure osmosis-ai
configure({
  enabled: true,
  logDestination: 'both',
  enabledAPIs: {
    openai: false,             // Disable direct OpenAI intercept
    anthropic: false,          // Disable direct Anthropic intercept
    langchainOpenai: true,     // Enable LangChain OpenAI intercept
    langchainAnthropic: true   // Enable LangChain Anthropic intercept
  }
});

async function main() {
  console.log('Initializing libraries...');
  // First initialize and get available libraries
  const libraries = await init();
  
  // Check if LangChain libraries are available
  if (!libraries.ChatOpenAI) {
    console.error('LangChain OpenAI library not available. Make sure you have installed @langchain/openai and @langchain/core');
    return;
  }
  
  if (!libraries.ChatAnthropic) {
    console.error('LangChain Anthropic library not available. Make sure you have installed @langchain/anthropic and @langchain/core');
    return;
  }
  
  console.log('Testing both LangChain OpenAI and Anthropic logging...\n');
  
  // Create LangChain models
  const openaiModel = new libraries.ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
  });

  const anthropicModel = new libraries.ChatAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
    modelName: 'claude-3-haiku-20240307',
    temperature: 0.7,
    maxTokens: 1000,
  });

  // Example prompt
  const prompt = 'Tell me a short joke about programming.';
  const messages = [new HumanMessage(prompt)];
  
  try {
    console.log('1. Calling LangChain OpenAI API...');
    if (process.env.OPENAI_API_KEY) {
      const openaiResponse = await openaiModel.invoke(messages);
      console.log('\nOpenAI Response:');
      console.log(openaiResponse.content);
    } else {
      console.log('Skipping OpenAI API call (no OPENAI_API_KEY provided)');
    }
    
    console.log('\n2. Calling LangChain Anthropic API...');
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropicResponse = await anthropicModel.invoke(messages);
      console.log('\nAnthropic Response:');
      console.log(anthropicResponse.content);
    } else {
      console.log('Skipping Anthropic API call (no ANTHROPIC_API_KEY provided)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\nBoth LangChain API calls were logged by osmosis-ai!');
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 