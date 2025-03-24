// Import our patched OpenAI
import { configure, init } from '../src';
import dotenv from 'dotenv';

dotenv.config();

// Configure the osmosis-ai logger (optional)
configure({
  enabled: true,
  logDestination: 'both',
  cloudApiKey: process.env.OSMOSIS_API_KEY || 'demo-key',
  enabledAPIs: {
    openai: true,
    anthropic: false // Only enable OpenAI for this example
  }
});

// Example: Using the patched OpenAI client
async function main() {
  console.log('Initializing libraries...');
  // First initialize and get available libraries
  const libraries = await init();
  
  // Check if OpenAI is available
  if (!libraries.OpenAI) {
    console.error('OpenAI library not available. Make sure you have installed openai');
    return;
  }
  
  // Create OpenAI client as usual
  const client = new libraries.OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  try {
    console.log('Sending a test request to OpenAI API...');
    
    if (process.env.OPENAI_API_KEY) {
      // This will be logged automatically by our monkey patch
      const completion = await client.chat.completions.create({
        messages: [{ role: 'user', content: 'Hello, how are you today?' }],
        model: 'gpt-4o-mini',
      });

      console.log('Response received:');
      console.log(completion.choices[0]?.message?.content || 'No response content');
    } else {
      console.log('Skipping API call (no OPENAI_API_KEY provided)');
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