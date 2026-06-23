/**
 * AgentLoop drives the streaming turn cycle: user message → LLM → tool calls
 * (if any) → tool results → LLM → text response.
 *
 * Maintains message history across the session.
 *
 * Depends only on InferenceClient — never on a concrete SDK.
 */

import {
  InferenceClient,
  InferenceMessage,
  ToolCall,
  ToolResult,
} from './inference-client-types.js'
import { toolRegistry } from './tool-registry.js'
import { executeTool, ToolHandlerDeps } from './tool-handlers.js'
import { logDebug } from '../logging/logger.js'

const CONTEXT_WINDOW_ERROR_PHRASES = ['prompt is too long', 'context length', 'maximum context']

const isContextWindowError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()

  return CONTEXT_WINDOW_ERROR_PHRASES.some((phrase) => msg.includes(phrase))
}

export interface AgentLoopOptions {
  staticSystem: string
  dynamicSystem: () => string
  deps: ToolHandlerDeps
}

/**
 * Holds message history for the session and drives the turn loop.
 * Constructed once when chat starts; chat() is called once per user message.
 */
export class AgentLoop {
  private readonly client: InferenceClient
  private readonly options: AgentLoopOptions
  private readonly history: InferenceMessage[] = []

  constructor(client: InferenceClient, options: AgentLoopOptions) {
    this.client = client
    this.options = options
  }

  currentPhaseId(): string {
    return this.options.deps.contextStore.currentPhaseId
  }

  currentPhaseDetail(): {
    id: string
    title: string
    goals: string[]
    checkpoints: string[]
  } | null {
    const id = this.options.deps.contextStore.currentPhaseId
    const phase = this.options.deps.profile.project.phases.find((p) => p.id === id)

    if (!phase) return null

    return { id: phase.id, title: phase.title, goals: phase.goals, checkpoints: phase.checkpoints }
  }

  fileTree(): string {
    return this.options.deps.contextStore.getFileTree()
  }

  /**
   * Processes one user turn. Calls onDelta for each streamed text chunk.
   * Handles the tool-use loop internally — onDelta is only called for final
   * text output, not for tool calls.
   *
   * Throws a user-facing Error if the context window is exceeded.
   */
  async chat(
    userMessage: string,
    onDelta: (chunk: string) => void,
    onToolCall: (name: string, toolInput: Record<string, unknown>) => void = () => {},
  ): Promise<void> {
    this.history.push({ role: 'user', content: userMessage })

    while (true) {
      // dynamicSystem re-evaluated each iteration so file tree and recent changes stay fresh
      // Notice how the updated history gets appended in the loop
      const request = {
        staticSystem: this.options.staticSystem,
        dynamicSystem: this.options.dynamicSystem(),
        messages: [...this.history],
        tools: toolRegistry,
      }

      let response

      try {
        response = await this.client.stream(request, onDelta)
      } catch (err) {
        if (isContextWindowError(err)) {
          throw new Error(
            'Session history is too long. Start a new session with `cruciblebuild chat`.',
          )
        }

        throw err
      }

      // Plain text response — append to history and we're done
      if (response.toolCalls.length === 0) {
        if (response.text) {
          this.history.push({ role: 'assistant', content: response.text })
        }

        break
      }

      // Tool call response — execute each tool, append results, loop back to LLM
      this.history.push({ role: 'assistant', content: response.toolCalls })

      const toolResults: ToolResult[] = response.toolCalls.map((tc: ToolCall) => {
        logDebug(`Tool call: ${tc.name}`, { input: tc.input })
        // prints tool call to repl
        onToolCall(tc.name, tc.input as Record<string, unknown>)
        let content: string

        try {
          content = executeTool(tc.name, tc.input, this.options.deps)
        } catch (err) {
          content = JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
        }

        logDebug(`Tool result: ${tc.name}`, { contentLength: content.length })

        return { toolCallId: tc.id, content }
      })

      this.history.push({ role: 'user', content: toolResults })
    }
  }
}
