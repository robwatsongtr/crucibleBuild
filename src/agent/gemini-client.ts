/**
 * Gemini adapter for InferenceClient.
 *
 * Uses the Google Gemini free tier (gemini-2.0-flash by default).
 * No prompt caching — not supported on the free tier.
 * Normalizes Gemini tool calls to the shared ToolCall shape.
 *
 * Model selection (in priority order):
 *   1. CRUCIBLEBUILD_MODEL env var
 *   2. DEFAULT_MODEL_GEMINI constant (gemini-2.0-flash)
 */

import { GoogleGenAI } from '@google/genai'
import { logDebug } from '../logging/logger.js'
import { DEFAULT_MODEL_GEMINI, MAX_TOKENS, TEMPERATURE } from '../config/constants.js'
import {
  InferenceClient,
  InferenceRequest,
  InferenceResponse,
  InferenceMessage,
  ToolCall,
  ToolResult,
} from './inference-client-types.js'

type GeminiRole = 'user' | 'model'

interface GeminiPart {
  text?: string
  functionCall?: { id?: string; name?: string; args?: Record<string, unknown> }
  functionResponse?: { id?: string; name?: string; response: Record<string, unknown> }
}

interface GeminiContent {
  role: GeminiRole
  parts: GeminiPart[]
}

const toGeminiContents = (messages: InferenceMessage[]): GeminiContent[] => {
  return messages.map((m) => {
    const role: GeminiRole = m.role === 'assistant' ? 'model' : 'user'

    if (typeof m.content === 'string') {
      return { role, parts: [{ text: m.content }] }
    }

    // ToolCall[] — assistant turn with tool use
    if (Array.isArray(m.content) && m.content.length > 0 && 'name' in m.content[0]) {
      const toolCalls = m.content as ToolCall[]
      const parts: GeminiPart[] = toolCalls.map((tc) => ({
        functionCall: {
          id: tc.id,
          name: tc.name,
          args: tc.input as Record<string, unknown>,
        },
      }))

      return { role: 'model', parts }
    }

    // ToolResult[] — user turn returning tool results
    const results = m.content as ToolResult[]
    const parts: GeminiPart[] = results.map((r) => ({
      functionResponse: {
        id: r.toolCallId,
        name: r.toolCallId,
        response: { output: r.content },
      },
    }))

    return { role: 'user', parts }
  })
}

export class GeminiClient implements InferenceClient {
  private readonly client: GoogleGenAI
  private readonly model: string

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    this.model = process.env.CRUCIBLEBUILD_MODEL ?? DEFAULT_MODEL_GEMINI
  }

  modelId(): string {
    return this.model
  }

  async stream(
    request: InferenceRequest,
    onDelta: (text: string) => void,
  ): Promise<InferenceResponse> {
    const { staticSystem, dynamicSystem, messages, tools } = request

    const systemInstruction = `${staticSystem}\n\n${dynamicSystem}`

    const functionDeclarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parametersJsonSchema: t.inputSchema,
    }))

    const responseStream = await this.client.models.generateContentStream({
      model: this.model,
      config: {
        systemInstruction,
        maxOutputTokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
      },
      contents: toGeminiContents(messages),
    })

    let fullText = ''
    const toolCalls: ToolCall[] = []

    for await (const chunk of responseStream) {
      const candidate = chunk.candidates?.[0]
      if (!candidate?.content?.parts) continue

      for (const part of candidate.content.parts) {
        if (part.text) {
          fullText += part.text
          onDelta(part.text)
        }

        if (part.functionCall) {
          const fc = part.functionCall
          toolCalls.push({
            id: fc.id ?? `${fc.name}-${Date.now()}`,
            name: fc.name ?? '',
            input: fc.args ?? {},
          })
        }
      }

      const usage = chunk.usageMetadata
      if (usage) {
        logDebug(
          `Gemini usage — in: ${usage.promptTokenCount ?? 0} out: ${usage.candidatesTokenCount ?? 0}`,
        )
      }
    }

    return { text: fullText, toolCalls }
  }
}
