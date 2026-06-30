/** Shared interface and normalized types for all LLM provider adapters. */

export interface InferenceClient {
  stream(request: InferenceRequest, onDelta: (text: string) => void): Promise<InferenceResponse>
  modelId(): string
}

export interface InferenceRequest {
  staticSystem: string
  dynamicSystem: string
  messages: InferenceMessage[]
  tools: ToolDefinition[]
}

export interface InferenceMessage {
  role: 'user' | 'assistant'
  content: string | ToolCall[] | ToolResult[]
}

export interface InferenceResponse {
  text: string
  toolCalls: ToolCall[]
  usage?: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
  }
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  input: unknown
}

export interface ToolResult {
  toolCallId: string
  content: string
}
