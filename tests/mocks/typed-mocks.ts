import { jest } from "@jest/globals";

// Type-safe mock for sendToOsmosis
export const createMockSendToOsmosis = () =>
  jest
    .fn()
    .mockImplementation(
      (
        query: Record<string, any>,
        response: Record<string, any>,
        status: number = 200,
      ): string => "mock-request-id",
    );

// Type-safe mock for OpenAI request
export const createMockOpenAIRequest = () =>
  jest.fn().mockResolvedValue({
    data: {
      choices: [
        {
          message: {
            content: "This is a mock response",
            role: "assistant",
          },
          finish_reason: "stop",
        },
      ],
    },
  });

// Type-safe mock for Anthropic request
export const createMockAnthropicRequest = () =>
  jest.fn().mockResolvedValue({
    id: "msg_123",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "This is a mock response" }],
    model: "claude-3-sonnet-20240229",
    stop_reason: "end_turn",
  });

// Type-safe mock for axios post
export const createMockAxiosPost = () =>
  jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true },
  });
