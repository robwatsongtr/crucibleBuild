/**
 * Anthropic adapter for InferenceClient.
 *
 * Passes staticSystem as a cached block (cache_control: ephemeral) so the
 * prompt cache is populated on the first turn and hit on all subsequent turns.
 * dynamicSystem is sent uncached — it changes every turn.
 *
 * Model selection (in priority order):
 *   1. CRUCIBLEBUILD_MODEL env var
 *   2. DEFAULT_MODEL_ANTHROPIC constant (claude-sonnet-4-6)
 */

import Anthropic from '@anthropic-ai/sdk'
import { logDebug } from '../logging/logger.js'
import {
  DEFAULT_MODEL_ANTHROPIC,
  MAX_TOKENS,
  TEMPERATURE,
  CACHE_HISTORY_THRESHOLD,
} from '../config/constants.js'
import {
  InferenceClient,
  InferenceRequest,
  InferenceResponse,
  InferenceMessage,
  ToolCall,
} from './inference-client-types.js'

const toAnthropicMessages = (messages: InferenceMessage[]): Anthropic.Messages.MessageParam[] => {
  return messages.map((m, i) => {
    // Mark the last assistant message with cache_control once history is long
    // enough — this caches the conversation history on the Anthropic side.
    const isLastAssistant =
      m.role === 'assistant' &&
      i === messages.length - 1 &&
      messages.length >= CACHE_HISTORY_THRESHOLD

    if (typeof m.content === 'string') {
      const textBlock: Anthropic.Messages.TextBlockParam = {
        type: 'text',
        text: m.content,
        cache_control: isLastAssistant ? { type: 'ephemeral' } : null,
      }

      return { role: m.role, content: [textBlock] }
    }

    // ToolCall[] — assistant turn with tool use
    if (Array.isArray(m.content) && m.content.length > 0 && 'name' in m.content[0]) {
      const toolCalls = m.content as ToolCall[]
      const blocks: Anthropic.Messages.ToolUseBlockParam[] = toolCalls.map((tc) => ({
        type: 'tool_use',
        id: tc.id,
        name: tc.name,
        input: tc.input as Record<string, unknown>,
      }))

      return { role: 'assistant', content: blocks }
    }

    // ToolResult[] — user turn returning tool results
    const results = m.content as Array<{ toolCallId: string; content: string }>
    const blocks: Anthropic.Messages.ToolResultBlockParam[] = results.map((r) => ({
      type: 'tool_result',
      tool_use_id: r.toolCallId,
      content: r.content,
    }))

    return { role: 'user', content: blocks }
  })
}

export class AnthropicClient implements InferenceClient {
  private readonly client: Anthropic
  private readonly model: string

  constructor() {
    this.client = new Anthropic()
    this.model = process.env.CRUCIBLEBUILD_MODEL ?? DEFAULT_MODEL_ANTHROPIC
  }

  modelId(): string {
    return this.model
  }

  async stream(
    request: InferenceRequest,
    onDelta: (text: string) => void,
  ): Promise<InferenceResponse> {
    const { staticSystem, dynamicSystem, messages, tools } = request

    const system: Anthropic.Messages.TextBlockParam[] = [
      {
        type: 'text',
        text: staticSystem,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: dynamicSystem,
      },
    ]

    const anthropicTools: Anthropic.Messages.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Messages.Tool['input_schema'],
    }))

    const messageStream = this.client.messages.stream({
      model: this.model,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system,
      messages: toAnthropicMessages(messages),
      tools: anthropicTools,
    })

    let fullText = ''

    messageStream.on('text', (delta) => {
      fullText += delta
      onDelta(delta)
    })

    const final = await messageStream.finalMessage()

    const toolCalls: ToolCall[] = final.content
      .filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({ id: b.id, name: b.name, input: b.input }))

    const { usage } = final

    logDebug(
      `Anthropic usage — in: ${usage.input_tokens} out: ${usage.output_tokens} ` +
        `cache_write: ${usage.cache_creation_input_tokens ?? 0} cache_read: ${usage.cache_read_input_tokens ?? 0}`,
    )

    return {
      text: fullText,
      toolCalls,
      usage: {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? undefined,
        cacheReadTokens: usage.cache_read_input_tokens ?? undefined,
      },
    }
  }
}
