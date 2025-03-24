// Import configure and init functions
import { configure, init } from '../src';
import dotenv from 'dotenv';

dotenv.config();

// Configure the osmosis-ai logger to only enable Anthropic
configure({
  enabled: true,
  cloudApiKey: process.env.OSMOSIS_API_KEY || 'demo-key',
  logDestination: 'both',
  enabledAPIs: {
    openai: false, // Disable OpenAI
    anthropic: true // Only enable Anthropic for this example
  }
});

// Example: Using the patched Anthropic client
async function main() {
  console.log('Initializing libraries...');
  // First initialize and get available libraries
  const libraries = await init();
  
  // Check if Anthropic is available
  if (!libraries.Anthropic) {
    console.error('Anthropic library not available. Make sure you have installed @anthropic-ai/sdk');
    return;
  }
  
  // Create Anthropic client
  const client = new libraries.Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key'
  });

  try {
    console.log('Sending a test request to Anthropic API...');
    
    if (process.env.ANTHROPIC_API_KEY) {
      // This will be logged automatically by our monkey patch
      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hello, how are you today?' }]
      });

      console.log('Response received:');
      // Handle different content types safely
      if (response.content[0]?.type === 'text') {
        console.log(response.content[0].text);
      } else {
        console.log('No text response received:', response.content);
      }
    } else {
      console.log('Skipping API call (no ANTHROPIC_API_KEY provided)');
      console.log('Tip: Create a .env file with your API key to test with a real request');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 