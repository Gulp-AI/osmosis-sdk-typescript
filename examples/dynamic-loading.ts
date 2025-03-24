// Example demonstrating dynamic library loading with optional dependencies
import { configure, init } from '../src';
import dotenv from 'dotenv';

dotenv.config();

// Configure the osmosis-ai logger
configure({
  enabled: true,
  logDestination: 'console',
  enabledAPIs: {
    openai: true,
    anthropic: true,
    langchainOpenai: true,
    langchainAnthropic: true
  }
});

async function main() {
  console.log('\n🔍 Checking for available AI libraries...\n');
  
  try {
    // Initialize libraries and get available ones
    const libraries = await init();
    
    console.log('📚 Available libraries:');
    
    // Check which libraries were loaded successfully
    if (libraries.OpenAI) {
      console.log('✅ OpenAI is available');
      
      // Try using the OpenAI library if API key is available
      if (process.env.OPENAI_API_KEY) {
        const client = new libraries.OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        
        console.log('   📝 Sending test request to OpenAI...');
        const completion = await client.chat.completions.create({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'gpt-4o-mini',
        });
        
        console.log(`   🤖 Response: "${completion.choices[0]?.message?.content}"`);
      } else {
        console.log('   ⚠️ OpenAI API key not found, skipping test request');
      }
    } else {
      console.log('❌ OpenAI is not available (library not installed)');
      console.log('   📦 Install with: npm install openai');
    }
    
    if (libraries.Anthropic) {
      console.log('✅ Anthropic is available');
      
      // Try using the Anthropic library if API key is available
      if (process.env.ANTHROPIC_API_KEY) {
        const client = new libraries.Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        
        console.log('   📝 Sending test request to Anthropic...');
        const message = await client.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 150,
          messages: [{ role: 'user', content: 'Hello!' }]
        });
        
        console.log(`   🤖 Response: "${message.content[0].text}"`);
      } else {
        console.log('   ⚠️ Anthropic API key not found, skipping test request');
      }
    } else {
      console.log('❌ Anthropic is not available (library not installed)');
      console.log('   📦 Install with: npm install @anthropic-ai/sdk');
    }
    
    if (libraries.ChatOpenAI) {
      console.log('✅ LangChain OpenAI is available');
    } else {
      console.log('❌ LangChain OpenAI is not available (library not installed)');
      console.log('   📦 Install with: npm install @langchain/openai @langchain/core');
    }
    
    if (libraries.ChatAnthropic) {
      console.log('✅ LangChain Anthropic is available');
    } else {
      console.log('❌ LangChain Anthropic is not available (library not installed)');
      console.log('   📦 Install with: npm install @langchain/anthropic @langchain/core');
    }
    
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
} 