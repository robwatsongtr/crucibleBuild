import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { FileWatcher } from '../../src/services/file-watcher.js'
import { ContextStore } from '../../src/services/context-store.js'

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

let tempDir: string
let store: ContextStore
let watcher: FileWatcher

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'cruciblebuild-watcher-'))
  store = new ContextStore(tempDir, 'python-tokens')
})

afterEach(async () => {
  await watcher.stop()
  rmSync(tempDir, { recursive: true, force: true })
})

describe('FileWatcher — no watchPaths (watches root)', () => {
  it('picks up a file change in the root', async () => {
    writeFileSync(join(tempDir, 'tokens.py'), '', 'utf-8')
    watcher = new FileWatcher(tempDir, store)
    watcher.start()
    await wait(300)

    writeFileSync(join(tempDir, 'tokens.py'), 'x = 1', 'utf-8')
    await wait(500)

    const changes = store.getRecentChanges()
    expect(changes.some((c) => c.path.includes('tokens.py'))).toBe(true)
  })
})

describe('FileWatcher — with watchPaths', () => {
  it('picks up changes inside a watched path', async () => {
    mkdirSync(join(tempDir, 'python_luthor', 'src'), { recursive: true })
    mkdirSync(join(tempDir, 'cpp_luthor', 'src'), { recursive: true })
    writeFileSync(join(tempDir, 'python_luthor', 'src', 'tokens.py'), '', 'utf-8')

    watcher = new FileWatcher(tempDir, store, ['python_luthor/src', 'cpp_luthor/src'])
    watcher.start()
    await wait(300)

    writeFileSync(join(tempDir, 'python_luthor', 'src', 'tokens.py'), 'x = 1', 'utf-8')
    await wait(500)

    const changes = store.getRecentChanges()
    expect(changes.some((c) => c.path.includes('tokens.py'))).toBe(true)
  })

  it('does not pick up changes outside watched paths', async () => {
    mkdirSync(join(tempDir, 'python_luthor', 'src'), { recursive: true })

    watcher = new FileWatcher(tempDir, store, ['python_luthor/src'])
    watcher.start()
    await wait(300)

    store.clearChanges()
    writeFileSync(join(tempDir, 'main.py'), 'x = 1', 'utf-8')
    await wait(500)

    const changes = store.getRecentChanges()
    expect(changes.some((c) => c.path.includes('main.py'))).toBe(false)
  })

  it('picks up changes in multiple watched paths', async () => {
    mkdirSync(join(tempDir, 'python_luthor', 'src'), { recursive: true })
    mkdirSync(join(tempDir, 'cpp_luthor', 'src'), { recursive: true })

    watcher = new FileWatcher(tempDir, store, ['python_luthor/src', 'cpp_luthor/src'])
    watcher.start()
    await wait(300)

    store.clearChanges()
    writeFileSync(join(tempDir, 'python_luthor', 'src', 'lexer.py'), 'x = 1', 'utf-8')
    writeFileSync(join(tempDir, 'cpp_luthor', 'src', 'lexer.cpp'), '// x', 'utf-8')
    await wait(500)

    const changes = store.getRecentChanges()
    expect(changes.some((c) => c.path.includes('lexer.py'))).toBe(true)
    expect(changes.some((c) => c.path.includes('lexer.cpp'))).toBe(true)
  })
})
