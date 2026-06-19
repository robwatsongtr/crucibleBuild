import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeTool, ToolHandlerDeps } from '../../src/agent/tool-handlers.js'
import { ContextStore } from '../../src/services/context-store.js'
import { SandboxViolationError } from '../../src/services/fs-reader.js'
import { luthorDefaultProfile } from '../../src/profile/luthor.default.js'

let tempDir: string
let store: ContextStore
let deps: ToolHandlerDeps

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'cruciblebuild-tool-handlers-'))
  store = new ContextStore(tempDir, 'python-tokens')
  deps = {
    projectRoot: tempDir,
    contextStore: store,
    profile: luthorDefaultProfile,
  }
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('executeTool — read_file', () => {
  it('reads a real file from the temp dir', () => {
    writeFileSync(join(tempDir, 'tokens.py'), 'class Token: pass', 'utf-8')

    const result = JSON.parse(executeTool('read_file', { path: 'tokens.py' }, deps))

    expect(result.path).toBe('tokens.py')
    expect(result.content).toBe('class Token: pass')
    expect(result.truncated).toBe(false)
    expect(typeof result.bytes).toBe('number')
  })

  it('throws SandboxViolationError on path traversal', () => {
    expect(() => executeTool('read_file', { path: '../escape.py' }, deps)).toThrow(
      SandboxViolationError,
    )
  })
})

describe('executeTool — list_directory', () => {
  it('lists entries in the temp dir', () => {
    writeFileSync(join(tempDir, 'lexer.py'), '', 'utf-8')
    writeFileSync(join(tempDir, 'tokens.py'), '', 'utf-8')

    const result = JSON.parse(executeTool('list_directory', { path: '.' }, deps))

    const paths = result.entries.map((e: { path: string }) => e.path)
    expect(paths).toContain('lexer.py')
    expect(paths).toContain('tokens.py')
  })

  it('lists nested files when maxDepth allows', () => {
    mkdirSync(join(tempDir, 'src'))
    writeFileSync(join(tempDir, 'src', 'parser.py'), '', 'utf-8')

    const result = JSON.parse(executeTool('list_directory', { path: '.', maxDepth: 2 }, deps))

    const paths = result.entries.map((e: { path: string }) => e.path)
    expect(paths).toContain('src')
    expect(paths.some((p: string) => p.includes('parser.py'))).toBe(true)
  })
})

describe('executeTool — get_recent_changes', () => {
  it('returns changes from the context store', () => {
    store.pushChange('lexer.py', 'add')
    store.pushChange('tokens.py', 'change')

    const result = JSON.parse(executeTool('get_recent_changes', {}, deps))

    expect(result.changes).toHaveLength(2)
    expect(result.changes[0].path).toBe('lexer.py')
    expect(result.changes[1].path).toBe('tokens.py')
  })

  it('respects the limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      store.pushChange(`file-${i}.py`, 'add')
    }

    const result = JSON.parse(executeTool('get_recent_changes', { limit: 3 }, deps))

    expect(result.changes).toHaveLength(3)
  })

  it('filters by since ISO timestamp', () => {
    // Use a timestamp safely in the past so all pushed changes are after it
    const pastTimestamp = new Date(Date.now() - 60_000).toISOString()
    store.pushChange('first.py', 'add')
    store.pushChange('second.py', 'change')

    // Use a far-future since to get zero results, confirming the filter works
    const futureTimestamp = new Date(Date.now() + 60_000).toISOString()
    const resultFuture = JSON.parse(
      executeTool('get_recent_changes', { since: futureTimestamp }, deps),
    )
    expect(resultFuture.changes).toHaveLength(0)

    // Use a past since to get all results
    const resultPast = JSON.parse(
      executeTool('get_recent_changes', { since: pastTimestamp }, deps),
    )
    const paths = resultPast.changes.map((c: { path: string }) => c.path)
    expect(paths).toContain('first.py')
    expect(paths).toContain('second.py')
  })
})

describe('executeTool — get_project_phase', () => {
  it('returns the current phase data from the luthor profile', () => {
    const result = JSON.parse(executeTool('get_project_phase', {}, deps))

    expect(result.projectSlug).toBe('luthor')
    expect(result.currentPhaseId).toBe('python-tokens')
    expect(result.phase.title).toBe('Python — Tokens')
    expect(result.phase.goals).toBeInstanceOf(Array)
    expect(result.phase.checkpoints).toBeInstanceOf(Array)
    expect(result.phase.conceptsIntroduced).toBeInstanceOf(Array)
  })

  it('returns a phase not-found error when currentPhaseId is unknown', () => {
    store.currentPhaseId = 'nonexistent-phase'

    const result = JSON.parse(executeTool('get_project_phase', {}, deps))

    expect(result.error).toMatch(/Phase not found/)
  })

  it('returns correct data when currentPhaseId is updated to a later phase', () => {
    store.currentPhaseId = 'cpp-interpreter'

    const result = JSON.parse(executeTool('get_project_phase', {}, deps))

    expect(result.currentPhaseId).toBe('cpp-interpreter')
    expect(result.phase.title).toBe('C++ — Interpreter')
    expect(result.phase.conceptsIntroduced).toContain('visitor pattern (implementation)')
  })
})

describe('executeTool — unknown tool', () => {
  it('throws on an unknown tool name', () => {
    expect(() => executeTool('nonexistent_tool', {}, deps)).toThrow('Unknown tool: nonexistent_tool')
  })
})
