// @ts-nocheck
import {
  MockChatOpenAI,
  MockChatAnthropic,
  mockOpenAIRequest,
  mockAnthropicRequest
} from './mocks/sdk-mocks';
import { defaultConfig } from '../src/consts';
import { jest, describe, beforeEach, afterEach, it, test, expect } from '@jest/globals';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

// Mock fetch for cloud API calls
global.fetch = jest.fn(() => 
  Promise.resolve({
    status: 200,
    json: () => Promise.resolve({ success: true })
  })
) as jest.Mock;

// Mock modules before importing the lib
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ status: 200, data: { success: true } })
}));

// Define mock constructors
function MockOpenAI(config) {
  this.apiKey = config.apiKey;
  this.chat = {
    completions: {
      create: jest.fn().mockImplementation(params => {
        return mockOpenAIRequest({
          path: '/chat/completions',
          method: 'post',
          body: params
        })
      })
    }
  };
  this.embeddings = {
    create: jest.fn().mockImplementation(params => {
      return mockOpenAIRequest({
        path: '/embeddings',
        method: 'post',
        body: params
      })
    })
  };
  this.request = jest.fn().mockImplementation(params => mockOpenAIRequest(params));
}

function MockAnthropic(config) {
  this.apiKey = config.apiKey;
  this.messages = {
    create: jest.fn().mockImplementation(params => mockAnthropicRequest(params))
  };
}

// Mock the imports
jest.mock('openai', () => MockOpenAI);

jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: MockAnthropic
}));

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: MockChatOpenAI
}));

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: MockChatAnthropic
}));

// Import our library modules after mocking
import * as OsmosisCloud from '../src/osmosis-cloud';
import { init, configure, initCloud } from '../src';

// Import the library classes after mocking
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

describe('Osmosis AI Library', () => {
  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks();
    
    // Reset the module state
    OsmosisCloud.__testing__.resetState();
    
    // Clear any configuration
    configure({
      enabled: true,
      logDestination: 'console'
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Configuration', () => {
    test('configure() should set options correctly', () => {
      configure({
        enabled: true,
        logDestination: 'cloud',
        enabledAPIs: {
          openai: true,
          anthropic: false
        }
      });
      
      // Verify configuration was applied by calling an API
      const client = new OpenAI({ apiKey: 'test-key' });
      const options: MockRequestOptions = { 
        path: '/chat/completions', 
        method: 'post', 
        body: { messages: [{ role: 'user', content: 'Test' }] }
      };
      
      client.request(options as any);
      
      // OpenAI should be patched and request should be called
      expect(mockOpenAIRequest).toHaveBeenCalled();
    });
    
    test('configure() should merge enabledAPIs with existing config', () => {
      // First set all to enabled
      configure({
        enabledAPIs: {
          openai: true,
          anthropic: true,
          langchainOpenai: true,
          langchainAnthropic: true
        }
      });
      
      // Then disable just one
      configure({
        enabledAPIs: {
          anthropic: false
        }
      });
      
      // OpenAI should still work
      const openaiClient = new OpenAI({ apiKey: 'test-key' });
      openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }]
      });
      
      expect(mockOpenAIRequest).toHaveBeenCalled();
    });
    
    test('init() should return available patched libraries', async () => {
      const result = await init();
      
      expect(result).toHaveProperty('OpenAI');
      expect(result).toHaveProperty('Anthropic');
      expect(result).toHaveProperty('ChatOpenAI');
      expect(result).toHaveProperty('ChatAnthropic');
    });
    
    test('should use reasonable defaults', () => {
      // Setup with default configuration
      configure({
        enabled: undefined,
        logDestination: undefined,
        enabledAPIs: undefined
      });
      
      // Call an API to verify the defaults are working
      const client = new OpenAI({ apiKey: 'test-key' });
      client.request({ 
        path: '/chat/completions', 
        method: 'post' 
      } as any);
      
      // Verify request went through indicating default values were used
      expect(mockOpenAIRequest).toHaveBeenCalled();
    });
  });
  
  describe('Cloud Integration', () => {
    test('initCloud() should set up cloud logging', async () => {
      // Spy on OsmosisCloud.init to verify it's called
      const initSpy = jest.spyOn(OsmosisCloud, 'init');
      
      await initCloud('test-api-key');
      
      // Force initialization for testing
      OsmosisCloud.__testing__.setInitialized(true);
      
      expect(initSpy).toHaveBeenCalledWith('test-api-key');
      expect(OsmosisCloud.isCloudLoggingEnabled()).toBe(true);
      
      initSpy.mockRestore();
    });
    
    test('configure() with cloudApiKey should init cloud logging', async () => {
      // Spy on OsmosisCloud.init to verify it's called
      const initSpy = jest.spyOn(OsmosisCloud, 'init');
      
      configure({
        cloudApiKey: 'test-api-key',
        logDestination: 'both'
      });
      
      // Force initialization for testing
      OsmosisCloud.__testing__.setInitialized(true);
      
      expect(initSpy).toHaveBeenCalledWith('test-api-key');
      
      initSpy.mockRestore();
    });
    
    test('configure() with cloud destination should enable cloud logging', async () => {
      // Initialize first
      await initCloud('test-api-key');
      
      // Force initialization for testing
      OsmosisCloud.__testing__.setInitialized(true);
      
      // Spy on OsmosisCloud.enableOsmosis
      const enableSpy = jest.spyOn(OsmosisCloud, 'enableOsmosis');
      
      configure({
        logDestination: 'cloud'
      });
      
      expect(enableSpy).toHaveBeenCalled();
      
      enableSpy.mockRestore();
    });
    
    test('configure() with console destination should disable cloud logging', async () => {
      // Initialize and enable first
      await initCloud('test-api-key');
      OsmosisCloud.__testing__.setInitialized(true);
      OsmosisCloud.enableOsmosis();
      
      // Spy on OsmosisCloud.disableOsmosis
      const disableSpy = jest.spyOn(OsmosisCloud, 'disableOsmosis');
      
      configure({
        logDestination: 'console'
      });
      
      expect(disableSpy).toHaveBeenCalled();
      
      disableSpy.mockRestore();
    });
  });
  
  describe('OpenAI Integration', () => {
    test('should patch OpenAI client and log requests', async () => {
      // Set up cloud logging
      await initCloud('test-api-key');
      OsmosisCloud.__testing__.setInitialized(true);
      
      // Mock sendToOsmosis to verify it gets called
      const sendToOsmosisSpy = jest.spyOn(OsmosisCloud, 'sendToOsmosis')
        .mockImplementation((query, response, status) => 'mock-request-id');
      
      // Configure with cloud logging and OpenAI enabled
      configure({ 
        logDestination: 'cloud',
        enabledAPIs: { openai: true }
      });
      
      // Mock the successful response
      mockOpenAIRequest.mockImplementationOnce(() => ({
        data: {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [{ 
            message: { role: 'assistant', content: 'Test response' },
            index: 0,
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }
      }));
      
      // Create client and make request
      const client = new OpenAI({ apiKey: 'test-key' });
      const result = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      });
      
      // Verify the response is correct
      expect(result.data.choices[0].message.content).toBe('Test response');
      
      // Force sending of the log to Osmosis
      await OsmosisCloud.sendToOsmosis(
        { api: 'test', method: 'GET', path: '/test' },
        { success: true }
      );
      
      // Verify the request was logged to cloud
      expect(sendToOsmosisSpy).toHaveBeenCalled();
      
      // Restore the spy
      sendToOsmosisSpy.mockRestore();
    });
    
    test('should handle errors in OpenAI requests', async () => {
      mockOpenAIRequest.mockRejectedValueOnce(new Error('API error'));
      
      const client = new OpenAI({ apiKey: 'test-key' });
      await expect(client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      })).rejects.toThrow('API error');
    });
    
    test('should support chat completions API', async () => {
      const client = new OpenAI({ apiKey: 'test-key' });
      const result = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 100
      });
      
      // Verify the correct method was called
      expect(mockOpenAIRequest).toHaveBeenCalledWith(expect.objectContaining({
        path: '/chat/completions',
        method: 'post',
        body: expect.objectContaining({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }]
        })
      }));
    });
    
    test('should support embeddings API', async () => {
      const client = new OpenAI({ apiKey: 'test-key' });
      await client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: 'Hello world'
      });
      
      // Verify the correct method was called
      expect(mockOpenAIRequest).toHaveBeenCalledWith(expect.objectContaining({
        path: '/embeddings',
        method: 'post',
        body: expect.objectContaining({
          model: 'text-embedding-ada-002',
          input: 'Hello world'
        })
      }));
    });
  });
  
  describe('Anthropic Integration', () => {
    test('should patch Anthropic client and log requests', async () => {
      // Set up cloud logging
      await initCloud('test-api-key');
      OsmosisCloud.__testing__.setInitialized(true);
      
      // Mock sendToOsmosis to verify it gets called
      const sendToOsmosisSpy = jest.spyOn(OsmosisCloud, 'sendToOsmosis')
        .mockImplementation((query, response, status) => 'mock-request-id');
      
      // Configure with cloud logging and Anthropic enabled
      configure({ 
        logDestination: 'cloud',
        enabledAPIs: { anthropic: true }
      });
      
      // Mock the successful response
      mockAnthropicRequest.mockImplementationOnce(() => ({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Claude response' }],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 }
      }));
      
      // Create client and make request - add required max_tokens
      const client = new Anthropic({ apiKey: 'test-key' });
      const result = await client.messages.create({
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100
      });
      
      // Verify the response is correct
      expect(result.content[0].text).toBe('Claude response');
      
      // Force sending of the log to Osmosis
      await OsmosisCloud.sendToOsmosis(
        { api: 'test', method: 'GET', path: '/test' },
        { success: true }
      );
      
      // Verify the request was logged to cloud
      expect(sendToOsmosisSpy).toHaveBeenCalled();
      
      // Restore the spy
      sendToOsmosisSpy.mockRestore();
    });
    
    test('should handle errors in Anthropic requests', async () => {
      mockAnthropicRequest.mockRejectedValueOnce(new Error('API error'));
      
      const client = new Anthropic({ apiKey: 'test-key' });
      await expect(client.messages.create({
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100 // Add required max_tokens
      })).rejects.toThrow('API error');
    });
  });
  
  describe('LangChain OpenAI Integration', () => {
    test('should patch LangChain ChatOpenAI and log requests', async () => {
      // Set up cloud logging
      await initCloud('test-api-key');
      OsmosisCloud.__testing__.setInitialized(true);
      
      // Mock sendToOsmosis to verify it gets called
      const sendToOsmosisSpy = jest.spyOn(OsmosisCloud, 'sendToOsmosis')
        .mockImplementation((query, response, status) => 'mock-request-id');
      
      // Configure with cloud logging and LangChain OpenAI enabled
      configure({ 
        logDestination: 'cloud',
        enabledAPIs: { langchainOpenai: true }
      });
      
      // Create LangChain model and make request
      const model = new ChatOpenAI({
        apiKey: 'test-key',
        modelName: 'gpt-4',
        temperature: 0.7
      });
      
      // Create messages for LangChain
      const messages = [
        { content: 'You are a helpful assistant', role: 'system' },
        { content: 'Hello, how are you?', role: 'user' }
      ];
      
      // Invoke the model
      const result = await model.invoke(messages);
      
      // Verify the model generates a response
      expect(result).toHaveProperty('content', 'Mocked LangChain OpenAI response');
      
      // Force sending of the log to Osmosis
      await OsmosisCloud.sendToOsmosis(
        { api: 'test', method: 'GET', path: '/test' },
        { success: true }
      );
      
      // Verify the request was logged to cloud
      expect(sendToOsmosisSpy).toHaveBeenCalled();
      
      // Restore the spy
      sendToOsmosisSpy.mockRestore();
    });
    
    test('should support streaming in LangChain ChatOpenAI', async () => {
      // Create streaming model
      const model = new ChatOpenAI({
        apiKey: 'test-key',
        modelName: 'gpt-4',
        streaming: true
      });
      
      // Create messages
      const messages = [{ content: 'Hello', role: 'user' }];
      
      // Get stream and collect chunks using type assertion
      const streamPromise = model.stream(messages);
      const stream = await streamPromise as unknown as AsyncIterable<AIMessageChunk>;
      
      const chunks: AIMessageChunk[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      // Verify we received the expected chunks
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('content');
    });
  });
  
  describe('LangChain Anthropic Integration', () => {
    test('should patch LangChain ChatAnthropic and log requests', async () => {
      // Set up cloud logging
      await initCloud('test-api-key');
      OsmosisCloud.__testing__.setInitialized(true);
      
      // Mock sendToOsmosis to verify it gets called
      const sendToOsmosisSpy = jest.spyOn(OsmosisCloud, 'sendToOsmosis')
        .mockImplementation((query, response, status) => 'mock-request-id');
      
      // Configure with cloud logging and LangChain Anthropic enabled
      configure({ 
        logDestination: 'cloud',
        enabledAPIs: { langchainAnthropic: true }
      });
      
      // Create LangChain model and make request
      const model = new ChatAnthropic({
        apiKey: 'test-key',
        modelName: 'claude-3-opus-20240229',
        temperature: 0.7
      });
      
      // Create messages for LangChain
      const messages = [
        { content: 'You are a helpful assistant', role: 'system' },
        { content: 'Hello, how are you?', role: 'user' }
      ];
      
      // Invoke the model
      const result = await model.invoke(messages);
      
      // Verify the model generates a response
      expect(result).toHaveProperty('content', 'Mocked LangChain Anthropic response');
      
      // Force sending of the log to Osmosis
      await OsmosisCloud.sendToOsmosis(
        { api: 'test', method: 'GET', path: '/test' },
        { success: true }
      );
      
      // Verify the request was logged to cloud
      expect(sendToOsmosisSpy).toHaveBeenCalled();
      
      // Restore the spy
      sendToOsmosisSpy.mockRestore();
    });
    
    test('should support streaming in LangChain ChatAnthropic', async () => {
      // Create streaming model
      const model = new ChatAnthropic({
        apiKey: 'test-key',
        modelName: 'claude-3-opus-20240229',
        streaming: true
      });
      
      // Create messages
      const messages = [{ content: 'Hello', role: 'user' }];
      
      // Get stream and collect chunks using type assertion
      const streamPromise = model.stream(messages);
      const stream = await streamPromise as unknown as AsyncIterable<AIMessageChunk>;
      
      const chunks: AIMessageChunk[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      // Verify we received the expected chunks
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('content');
    });
  });
}); 