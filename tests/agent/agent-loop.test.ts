import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentLoop, AgentLoopOptions } from '../../src/agent/agent-loop.js'
import { InferenceClient, InferenceResponse } from '../../src/agent/inference-client.js'
import { ContextStore } from '../../src/services/context-store.js'
import { ConstraintProfile } from '../../src/models/index.js'

// Minimal single-phase profile — enough for get_project_phase to work
const minimalProfile: ConstraintProfile = {
  id: 'test-profile',
  version: '1.0.0',
  persona: {
    name: 'Test Mentor',
    voice: 'test',
    tone: [],
    firmnessExamples: [],
    antiPatterns: [],
  },
  rules: [],
  project: {
    slug: 'test-project',
    title: 'Test Project',
    summary: 'A test project',
    language: 'python',
    phases: [
      {
        id: 'phase-one',
        title: 'Phase One',
        goals: ['Goal A'],
        checkpoints: ['Checkpoint A'],
        conceptsIntroduced: ['concept-a'],
      },
    ],
    referenceArtifacts: [],
  },
}

const plainTextResponse = (text: string): InferenceResponse => ({
  text,
  toolCalls: [],
})

const toolCallResponse = (id: string, name: string, input: unknown): InferenceResponse => ({
  text: '',
  toolCalls: [{ id, name, input }],
})

let contextStore: ContextStore
let options: AgentLoopOptions

beforeEach(() => {
  contextStore = new ContextStore('/tmp/test-project', 'phase-one')
  options = {
    staticSystem: 'You are a test mentor.',
    dynamicSystem: () => 'Current phase: phase-one',
    deps: {
      projectRoot: '/tmp/test-project',
      contextStore,
      profile: minimalProfile,
    },
  }
})

describe('AgentLoop — plain text response', () => {
  it('calls onDelta with the response text', async () => {
    const mockClient: InferenceClient = {
      stream: vi.fn().mockImplementation(async (_req, onDelta) => {
        onDelta('hello')

        return plainTextResponse('hello')
      }),
    }
    const loop = new AgentLoop(mockClient, options)
    const chunks: string[] = []

    await loop.chat('hi there', (chunk) => chunks.push(chunk))

    expect(chunks).toContain('hello')
  })

  it('appends user and assistant messages to history', async () => {
    const mockClient: InferenceClient = {
      stream: vi.fn().mockImplementation(async (_req, onDelta) => {
        onDelta('world')

        return plainTextResponse('world')
      }),
    }
    const loop = new AgentLoop(mockClient, options)

    await loop.chat('hello', () => {})

    // Call a second time to observe history in the second request
    const capturedMessages: unknown[] = []
    const trackingClient: InferenceClient = {
      stream: vi.fn().mockImplementation(async (req, onDelta) => {
        capturedMessages.push(...req.messages)
        onDelta('second reply')

        return plainTextResponse('second reply')
      }),
    }
    const loop2 = new AgentLoop(trackingClient, options)
    await loop2.chat('first message', () => {})
    await loop2.chat('second message', () => {})

    expect(capturedMessages.some((m: unknown) => (m as { role: string }).role === 'user')).toBe(true)
    expect(
      capturedMessages.some((m: unknown) => (m as { role: string }).role === 'assistant'),
    ).toBe(true)
  })
})

describe('AgentLoop — single tool call then text', () => {
  it('calls client.stream twice and produces the final text', async () => {
    const mockClient: InferenceClient = {
      stream: vi
        .fn()
        .mockImplementationOnce(async (_req, _onDelta) => {
          return toolCallResponse('tc1', 'get_project_phase', {})
        })
        .mockImplementationOnce(async (_req, onDelta) => {
          onDelta('here is the phase')

          return plainTextResponse('here is the phase')
        }),
    }
    const loop = new AgentLoop(mockClient, options)
    const chunks: string[] = []

    await loop.chat('what phase am I on?', (chunk) => chunks.push(chunk))

    expect(mockClient.stream).toHaveBeenCalledTimes(2)
    expect(chunks).toContain('here is the phase')
  })

  it('includes a tool_result turn in the second stream call', async () => {
    let secondRequestMessages: unknown[] = []

    const mockClient: InferenceClient = {
      stream: vi
        .fn()
        .mockImplementationOnce(async () => toolCallResponse('tc1', 'get_project_phase', {}))
        .mockImplementationOnce(async (req, onDelta) => {
          secondRequestMessages = req.messages
          onDelta('done')

          return plainTextResponse('done')
        }),
    }
    const loop = new AgentLoop(mockClient, options)

    await loop.chat('what phase am I on?', () => {})

    const toolResultTurn = secondRequestMessages.find(
      (m: unknown) =>
        (m as { role: string }).role === 'user' &&
        Array.isArray((m as { content: unknown }).content),
    ) as { content: Array<{ toolCallId: string }> } | undefined

    expect(toolResultTurn).toBeDefined()
    expect(toolResultTurn?.content[0].toolCallId).toBe('tc1')
  })
})

describe('AgentLoop — context window error', () => {
  it('rethrows a user-facing error containing "Session history is too long"', async () => {
    const mockClient: InferenceClient = {
      stream: vi.fn().mockRejectedValue(new Error('prompt is too long for this model')),
    }
    const loop = new AgentLoop(mockClient, options)

    await expect(loop.chat('hi', () => {})).rejects.toThrow('Session history is too long')
  })

  it('rethrows unrelated errors unchanged', async () => {
    const mockClient: InferenceClient = {
      stream: vi.fn().mockRejectedValue(new Error('network timeout')),
    }
    const loop = new AgentLoop(mockClient, options)

    await expect(loop.chat('hi', () => {})).rejects.toThrow('network timeout')
  })
})

describe('AgentLoop — unknown tool', () => {
  it('does not crash and passes an error result back to the LLM', async () => {
    let secondRequestMessages: unknown[] = []

    const mockClient: InferenceClient = {
      stream: vi
        .fn()
        .mockImplementationOnce(async () => toolCallResponse('tc-bad', 'nonexistent_tool', {}))
        .mockImplementationOnce(async (req, onDelta) => {
          secondRequestMessages = req.messages
          onDelta('ok')

          return plainTextResponse('ok')
        }),
    }
    const loop = new AgentLoop(mockClient, options)

    await expect(loop.chat('do something', () => {})).resolves.toBeUndefined()
    expect(mockClient.stream).toHaveBeenCalledTimes(2)

    const toolResultTurn = secondRequestMessages.find(
      (m: unknown) =>
        (m as { role: string }).role === 'user' &&
        Array.isArray((m as { content: unknown }).content),
    ) as { content: Array<{ toolCallId: string; content: string }> } | undefined

    expect(toolResultTurn).toBeDefined()

    const resultContent = JSON.parse(toolResultTurn!.content[0].content)
    expect(resultContent.error).toMatch(/Unknown tool/)
  })
})

describe('AgentLoop — accessors', () => {
  it('currentPhaseId delegates to contextStore', () => {
    const mockClient: InferenceClient = { stream: vi.fn() }
    const loop = new AgentLoop(mockClient, options)

    expect(loop.currentPhaseId()).toBe('phase-one')
  })

  it('fileTree delegates to contextStore', () => {
    const mockClient: InferenceClient = { stream: vi.fn() }
    const loop = new AgentLoop(mockClient, options)

    expect(loop.fileTree()).toBe('')
  })
})
