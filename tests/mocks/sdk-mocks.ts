// @ts-nocheck
import { jest } from "@jest/globals";

// Define HTTPMethod type to match OpenAI SDK
type HTTPMethod = "get" | "post" | "put" | "patch" | "delete";

// Helper type for request options
export interface MockRequestOptions {
  path: string;
  method: HTTPMethod;
  body?: any;
  query?: any;
  headers?: Record<string, string>;
  maxRetries?: number;
  stream?: boolean;
}

// Simple AIMessage type for LangChain
export type AIMessageChunk = {
  content: string;
  [key: string]: any;
};

// OpenAI mocks
export const mockOpenAIRequest = jest.fn().mockImplementation((params) => {
  // Default response
  const response = {
    data: {
      id: "chatcmpl-mock123",
      object: "chat.completion",
      created: Date.now(),
      model: params?.body?.model || "gpt-4",
      choices: [
        {
          index: 0,
          message: {
            content: "Test response",
            role: "assistant",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    },
  };

  return response;
});

export const MockOpenAI = {
  OpenAIApi: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async (params) => {
          // This should use the mockOpenAIRequest so it can be spied on
          return mockOpenAIRequest(params);
        }),
      },
    },
  })),
};

// Anthropic mocks
export const mockAnthropicRequest = jest.fn().mockResolvedValue({
  id: "msg_123",
  type: "message",
  role: "assistant",
  content: [{ type: "text", text: "This is a mock response" }],
  model: "claude-3-sonnet-20240229",
  stop_reason: "end_turn",
});

export const MockAnthropic = {
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockImplementation(async (params) => {
        // This should use the mockAnthropicRequest so it can be spied on
        return mockAnthropicRequest(params);
      }),
    },
  })),
};

// Mock for LangChain OpenAI
export const mockLangchainOpenAIGenerate = jest
  .fn()
  .mockImplementation(async (messages, options) => ({
    generations: [
      [
        {
          text: "LangChain OpenAI response",
          message: { content: "LangChain OpenAI response" },
        },
      ],
    ],
  }));

// Create a proper LangChain ChatOpenAI class mock
export class MockChatOpenAI {
  apiKey: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  modelKwargs: any;
  streaming: boolean;

  constructor(options: {
    apiKey: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
    streaming?: boolean;
  }) {
    this.apiKey = options.apiKey;
    this.modelName = options.modelName;
    this.temperature = options.temperature;
    this.maxTokens = options.maxTokens;
    this.streaming = options.streaming || false;
    this.modelKwargs = {};
  }

  // Add the _generate method
  _generate = (messages: any, options: any) =>
    mockLangchainOpenAIGenerate(messages, options);

  // Add invoke method that uses _generate
  invoke = jest.fn().mockImplementation(async (messages) => {
    const result = await this._generate(messages, {});
    return { content: "Mocked LangChain OpenAI response" };
  });

  // Stream method for streaming responses
  stream = jest.fn().mockImplementation(async function* (
    messages: any[],
  ): AsyncGenerator<AIMessageChunk> {
    yield { content: "Mocked streaming response chunk 1" };
    yield { content: "Mocked streaming response chunk 2" };
  });
}

// Mock for LangChain Anthropic
export const mockLangchainAnthropicGenerate = jest
  .fn()
  .mockImplementation(async (messages, options) => ({
    generations: [
      [
        {
          text: "LangChain Anthropic response",
          message: { content: "LangChain Anthropic response" },
        },
      ],
    ],
  }));

// Create a proper LangChain ChatAnthropic class mock
export class MockChatAnthropic {
  apiKey: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  invocationKwargs: any;
  streaming: boolean;

  constructor(options: {
    apiKey: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
    streaming?: boolean;
  }) {
    this.apiKey = options.apiKey;
    this.modelName = options.modelName;
    this.temperature = options.temperature;
    this.maxTokens = options.maxTokens;
    this.streaming = options.streaming || false;
    this.invocationKwargs = {};
  }

  // Add the _generate method
  _generate = (messages: any, options: any) =>
    mockLangchainAnthropicGenerate(messages, options);

  // Add invoke method
  invoke = jest.fn().mockImplementation(async (messages) => {
    const result = await this._generate(messages, {});
    return { content: "Mocked LangChain Anthropic response" };
  });

  // Stream method for streaming responses
  stream = jest.fn().mockImplementation(async function* (
    messages: any[],
  ): AsyncGenerator<AIMessageChunk> {
    yield { content: "Mocked streaming response chunk 1" };
    yield { content: "Mocked streaming response chunk 2" };
  });
}

// Mock implementations to be used in tests
export const mockMessage = { content: "Test message" };
export const mockBaseMessage = { content: "Test message", role: "user" };
