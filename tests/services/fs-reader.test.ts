import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync, realpathSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { readFile, listDirectory, resolveSafe, SandboxViolationError } from '../../src/services/fs-reader.js'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'cruciblebuild-fsreader-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('resolveSafe', () => {
  it('resolves a valid relative path', () => {
    const result = resolveSafe(tempDir, 'foo.ts')

    expect(result).toBe(join(realpathSync(tempDir), 'foo.ts'))
  })

  it('throws on path traversal with ../', () => {
    expect(() => resolveSafe(tempDir, '../escape.ts')).toThrow(SandboxViolationError)
  })

  it('throws on absolute path outside root', () => {
    expect(() => resolveSafe(tempDir, '/etc/passwd')).toThrow(SandboxViolationError)
  })

  it('throws on symlink that escapes root', () => {
    const linkPath = join(tempDir, 'link')
    symlinkSync('/tmp', linkPath)

    expect(() => resolveSafe(tempDir, 'link')).toThrow(SandboxViolationError)
  })
})

describe('readFile', () => {
  it('reads a text file inside the root', () => {
    writeFileSync(join(tempDir, 'hello.ts'), 'const x = 1', 'utf-8')

    const result = readFile(tempDir, 'hello.ts')

    expect(result.content).toBe('const x = 1')
    expect(result.truncated).toBe(false)
    expect(result.path).toBe('hello.ts')
  })

  it('throws on path traversal', () => {
    expect(() => readFile(tempDir, '../escape.ts')).toThrow(SandboxViolationError)
  })

  it('throws on binary file extension', () => {
    writeFileSync(join(tempDir, 'image.png'), Buffer.from([0x89, 0x50]))

    expect(() => readFile(tempDir, 'image.png')).toThrow(SandboxViolationError)
  })

  it('truncates files exceeding 256KB', () => {
    const big = 'x'.repeat(256 * 1024 + 1)
    writeFileSync(join(tempDir, 'big.txt'), big, 'utf-8')

    const result = readFile(tempDir, 'big.txt')

    expect(result.truncated).toBe(true)
    expect(result.content).toContain('truncated')
  })
})

describe('listDirectory', () => {
  it('lists files in the root', () => {
    writeFileSync(join(tempDir, 'a.ts'), '', 'utf-8')
    writeFileSync(join(tempDir, 'b.ts'), '', 'utf-8')

    const entries = listDirectory(tempDir, '.')

    const names = entries.map((e) => e.path)
    expect(names).toContain('a.ts')
    expect(names).toContain('b.ts')
  })

  it('lists nested files up to maxDepth', () => {
    mkdirSync(join(tempDir, 'src'))
    writeFileSync(join(tempDir, 'src', 'tokens.ts'), '', 'utf-8')

    const entries = listDirectory(tempDir, '.', 2)
    const names = entries.map((e) => e.path)

    expect(names).toContain('src')
    expect(names).toContain(join('src', 'tokens.ts'))
  })

  it('throws on path traversal', () => {
    expect(() => listDirectory(tempDir, '../')).toThrow(SandboxViolationError)
  })
})
