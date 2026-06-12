import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { scaffold, loadConfig, isInitialised, hasGitRepo } from '../../src/services/project-scaffolder.js'
import { ProjectConfigSchema } from '../../src/schemas/project-config.js'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'cruciblebuild-test-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('isInitialised', () => {
  it('returns false in a fresh directory', () => {
    expect(isInitialised(tempDir)).toBe(false)
  })

  it('returns true after scaffold runs', () => {
    scaffold(new Date().toISOString(), tempDir)

    expect(isInitialised(tempDir)).toBe(true)
  })
})

describe('hasGitRepo', () => {
  it('returns false when no .git directory exists', () => {
    expect(hasGitRepo(tempDir)).toBe(false)
  })
})

describe('scaffold', () => {
  it('creates .cruciblebuild/ directory', () => {
    scaffold(new Date().toISOString(), tempDir)

    expect(existsSync(join(tempDir, '.cruciblebuild'))).toBe(true)
  })

  it('creates .cruciblebuild/state/ directory', () => {
    scaffold(new Date().toISOString(), tempDir)

    expect(existsSync(join(tempDir, '.cruciblebuild', 'state'))).toBe(true)
  })

  it('writes a valid config.json', () => {
    const acknowledgedAt = '2026-06-12T10:00:00.000Z'
    scaffold(acknowledgedAt, tempDir)

    const raw = JSON.parse(readFileSync(join(tempDir, '.cruciblebuild', 'config.json'), 'utf-8'))
    const result = ProjectConfigSchema.safeParse(raw)

    expect(result.success).toBe(true)
  })

  it('config.json contains correct profileId and projectSlug', () => {
    scaffold(new Date().toISOString(), tempDir)

    const raw = JSON.parse(readFileSync(join(tempDir, '.cruciblebuild', 'config.json'), 'utf-8'))

    expect(raw.profileId).toBe('luthor-default')
    expect(raw.projectSlug).toBe('luthor')
    expect(raw.currentPhaseId).toBe('python-tokens')
  })

  it('config.json records the acknowledgedAt timestamp', () => {
    const acknowledgedAt = '2026-06-12T10:00:00.000Z'
    scaffold(acknowledgedAt, tempDir)

    const raw = JSON.parse(readFileSync(join(tempDir, '.cruciblebuild', 'config.json'), 'utf-8'))

    expect(raw.contract.acknowledgedAt).toBe(acknowledgedAt)
  })

  it('writes .cruciblebuild/README.md', () => {
    scaffold(new Date().toISOString(), tempDir)

    const readme = readFileSync(join(tempDir, '.cruciblebuild', 'README.md'), 'utf-8')

    expect(readme).toContain('CrucibleBuild')
    expect(readme).toContain('config.json')
    expect(readme).toContain('state/')
  })

  it('creates .gitignore with state/ entry when none exists', () => {
    scaffold(new Date().toISOString(), tempDir)

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8')

    expect(gitignore).toContain('.cruciblebuild/state/')
  })

  it('appends to an existing .gitignore', () => {
    const gitignorePath = join(tempDir, '.gitignore')
    const existing = 'node_modules/\n'
    writeFileSync(gitignorePath, existing, 'utf-8')

    scaffold(new Date().toISOString(), tempDir)

    const gitignore = readFileSync(gitignorePath, 'utf-8')

    expect(gitignore).toContain('node_modules/')
    expect(gitignore).toContain('.cruciblebuild/state/')
  })

  it('does not duplicate .gitignore entry if already present', () => {
    const gitignorePath = join(tempDir, '.gitignore')
    require('fs').writeFileSync(gitignorePath, '.cruciblebuild/state/\n', 'utf-8')

    scaffold(new Date().toISOString(), tempDir)

    const gitignore = readFileSync(gitignorePath, 'utf-8')
    const count = (gitignore.match(/\.cruciblebuild\/state\//g) ?? []).length

    expect(count).toBe(1)
  })
})

describe('loadConfig', () => {
  it('returns the config after scaffold', () => {
    const acknowledgedAt = '2026-06-12T10:00:00.000Z'
    scaffold(acknowledgedAt, tempDir)

    const config = loadConfig(tempDir)

    expect(config.profileId).toBe('luthor-default')
    expect(config.contract.acknowledgedAt).toBe(acknowledgedAt)
  })

  it('throws if config.json does not exist', () => {
    expect(() => loadConfig(tempDir)).toThrow('cruciblebuild init')
  })
})
