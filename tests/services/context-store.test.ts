import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { ContextStore } from '../../src/services/context-store.js'
import { RING_BUFFER_SIZE } from '../../src/config/constants.js'

let tempDir: string
let store: ContextStore

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'cruciblebuild-store-'))
  store = new ContextStore(tempDir, 'python-tokens')
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('ContextStore — ring buffer', () => {
  it('starts with no changes', () => {
    expect(store.getRecentChanges()).toHaveLength(0)
  })

  it('records a pushed change', () => {
    store.pushChange('src/tokens.py', 'add')

    const changes = store.getRecentChanges()
    expect(changes).toHaveLength(1)
    expect(changes[0].path).toBe('src/tokens.py')
    expect(changes[0].kind).toBe('add')
  })

  it('caps at RING_BUFFER_SIZE entries', () => {
    for (let i = 0; i <= RING_BUFFER_SIZE; i++) {
      store.pushChange(`file-${i}.py`, 'change')
    }

    expect(store.getRecentChanges()).toHaveLength(RING_BUFFER_SIZE)
  })

  it('drops the oldest entry when full', () => {
    for (let i = 0; i <= RING_BUFFER_SIZE; i++) {
      store.pushChange(`file-${i}.py`, 'change')
    }

    const changes = store.getRecentChanges()
    expect(changes[0].path).toBe('file-1.py')
  })

  it('respects the limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      store.pushChange(`file-${i}.py`, 'add')
    }

    expect(store.getRecentChanges(3)).toHaveLength(3)
  })

  it('returns the most recent entries when limited', () => {
    for (let i = 0; i < 5; i++) {
      store.pushChange(`file-${i}.py`, 'add')
    }

    const limited = store.getRecentChanges(2)
    expect(limited[0].path).toBe('file-3.py')
    expect(limited[1].path).toBe('file-4.py')
  })

  it('clears all changes', () => {
    store.pushChange('src/tokens.py', 'add')
    store.clearChanges()

    expect(store.getRecentChanges()).toHaveLength(0)
  })
})

describe('ContextStore — file tree', () => {
  it('starts with an empty file tree', () => {
    expect(store.getFileTree()).toBe('')
  })

  it('refreshFileTree builds a snapshot from disk', () => {
    mkdirSync(join(tempDir, 'src'))
    writeFileSync(join(tempDir, 'src', 'tokens.py'), '', 'utf-8')

    store.refreshFileTree()

    expect(store.getFileTree()).toContain('tokens.py')
  })
})

describe('ContextStore — phase', () => {
  it('exposes currentPhaseId', () => {
    expect(store.currentPhaseId).toBe('python-tokens')
  })

  it('allows currentPhaseId to be updated', () => {
    store.currentPhaseId = 'python-lexer'

    expect(store.currentPhaseId).toBe('python-lexer')
  })
})
