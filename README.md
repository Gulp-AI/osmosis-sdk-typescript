# Osmosis AI

Osmosis AI is a TypeScript library for monitoring and logging interactions with popular LLM APIs (OpenAI, Anthropic, and LangChain).

## Features

- 📊 **API monitoring**: Log all requests to OpenAI, Anthropic, and LangChain APIs
- 🔄 **Simple integration**: Works with existing code through monkey patching
- 📦 **Cloud logging**: Send data to Osmosis Cloud for analytics (optional)
- 📝 **Console logging**: Log requests and responses to the console (configurable)
- 🔌 **Modern APIs**: Supports both OpenAI v1 API (legacy) and v2 API (modern)
- 📡 **Streaming support**: Works with both streaming and non-streaming API calls
- 🧩 **Optional dependencies**: Use only the AI libraries you need

## Installation

Basic installation:

```bash
npm install osmosis-ai
```

To use with specific AI libraries, install them alongside osmosis-ai:

```bash
# For OpenAI integration
npm install osmosis-ai openai

# For Anthropic integration
npm install osmosis-ai @anthropic-ai/sdk

# For LangChain integrations
npm install osmosis-ai @langchain/openai @langchain/anthropic @langchain/core

# For all supported integrations
npm install osmosis-ai openai @anthropic-ai/sdk @langchain/openai @langchain/anthropic @langchain/core
```

## Optional Dependencies

Osmosis AI uses a peer dependency approach, which means:

- You only need to install the AI libraries you actually use
- The library will dynamically check at runtime which libraries are available
- If you try to use a library that isn't installed, you'll get a helpful error message

This approach keeps your dependencies minimal and focused on what you need.

## Usage

### Basic Usage

```typescript
import { OpenAI, configure } from "osmosis-ai";

// Configure logging (optional)
configure({
  enabled: true,
  logDestination: "console", // 'console', 'cloud', or 'both'
  enabledAPIs: {
    openai: true,
    anthropic: true,
  },
});

// Use the patched OpenAI client as normal
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Make API requests as usual
const completion = await client.chat.completions.create({
  messages: [{ role: "user", content: "Hello!" }],
  model: "gpt-4o-mini",
});

console.log(completion.choices[0]?.message?.content);
```

### OpenAI V2 API with Streaming

```typescript
import { OpenAI, configure } from "osmosis-ai";
import dotenv from "dotenv";

dotenv.config();

// Configure logging
configure({
  enabled: true,
  logDestination: "both", // Log to both console and cloud
  enabledAPIs: { openai: true },
});

// Create OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Using streaming with v2 API
const stream = await client.chat.completions.create({
  messages: [{ role: "user", content: "Write a short poem" }],
  model: "gpt-4o-mini",
  stream: true,
});

// Process the stream
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || "";
  if (content) {
    process.stdout.write(content);
  }
}
```

### Cloud Logging

To enable cloud logging with Osmosis:

```typescript
import { configure, initCloud } from "osmosis-ai";

// Initialize cloud logging with your API key
initCloud("your-osmosis-api-key");

// Configure to use cloud logging
configure({
  logDestination: "cloud", // or 'both' for cloud and console
  enabledAPIs: { openai: true, anthropic: true },
});
```

### All Supported APIs

The library supports:

- **OpenAI**: Both v1 and v2 APIs, including streaming
- **Anthropic**: Claude API
- **LangChain OpenAI**: LangChain's OpenAI integration
- **LangChain Anthropic**: LangChain's Anthropic integration

## Configuration Options

| Option                           | Type                           | Description                           |
| -------------------------------- | ------------------------------ | ------------------------------------- |
| `enabled`                        | boolean                        | Enable/disable all monitoring         |
| `logDestination`                 | 'console' \| 'cloud' \| 'both' | Where to send logs                    |
| `cloudApiKey`                    | string                         | API key for Osmosis Cloud logging     |
| `enabledAPIs.openai`             | boolean                        | Enable OpenAI monitoring              |
| `enabledAPIs.anthropic`          | boolean                        | Enable Anthropic monitoring           |
| `enabledAPIs.langchainOpenai`    | boolean                        | Enable LangChain OpenAI monitoring    |
| `enabledAPIs.langchainAnthropic` | boolean                        | Enable LangChain Anthropic monitoring |

## Examples

See the [examples](./examples) directory for more usage examples.

## What Gets Logged?

For each API request, the following information is logged:

- API name (OpenAI, Anthropic, LangChain OpenAI, or LangChain Anthropic)
- Timestamp
- Request path
- HTTP method
- Request body (if present)
- Query parameters (if present)
- Response data (when cloud logging is enabled)

Example console output:

```
[OSMOSIS-AI][2023-03-26T12:34:56.789Z] OpenAI Request:
  Path: /v1/chat/completions
  Method: POST
  Body: {
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Hello world"
      }
    ]
  }

[OSMOSIS-AI][2023-03-26T12:35:01.234Z] LangChain OpenAI Request:
  Path: /v1/chat/completions
  Method: POST
  Body: {
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Hello world"
      }
    ],
    "temperature": 0.7
  }
```

When using cloud logging, both requests and responses are sent to the Osmosis cloud service, where you can view and analyze your API usage.

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the library: `npm run build`
4. Run an example: `npm run example`

## License

MIT
