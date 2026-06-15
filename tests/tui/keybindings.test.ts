import { describe, it, expect } from 'vitest'
import { dispatchSlashCommand, listSlashCommands } from '../../src/tui/keybindings.js'

describe('dispatchSlashCommand', () => {
  it('recognises /exit', () => {
    const result = dispatchSlashCommand('/exit')
    expect(result.handled).toBe(true)
    if (result.handled) expect(result.command).toBe('/exit')
  })

  it('recognises /clear', () => {
    const result = dispatchSlashCommand('/clear')
    expect(result.handled).toBe(true)
    if (result.handled) expect(result.command).toBe('/clear')
  })

  it('recognises /phase', () => {
    const result = dispatchSlashCommand('/phase')
    expect(result.handled).toBe(true)
    if (result.handled) expect(result.command).toBe('/phase')
  })

  it('recognises /files', () => {
    const result = dispatchSlashCommand('/files')
    expect(result.handled).toBe(true)
    if (result.handled) expect(result.command).toBe('/files')
  })

  it('trims whitespace before matching', () => {
    const result = dispatchSlashCommand('  /exit  ')
    expect(result.handled).toBe(true)
  })

  it('returns handled: false for regular input', () => {
    expect(dispatchSlashCommand('what is a token?').handled).toBe(false)
  })

  it('returns handled: false for unknown slash command', () => {
    expect(dispatchSlashCommand('/unknown').handled).toBe(false)
  })

  it('returns handled: false for empty string', () => {
    expect(dispatchSlashCommand('').handled).toBe(false)
  })
})

describe('listSlashCommands', () => {
  it('returns all four commands', () => {
    const commands = listSlashCommands()
    expect(commands).toContain('/exit')
    expect(commands).toContain('/clear')
    expect(commands).toContain('/phase')
    expect(commands).toContain('/files')
    expect(commands).toHaveLength(4)
  })

  it('returns a copy — mutations do not affect the original', () => {
    const a = listSlashCommands()
    const b = listSlashCommands()
    a.push('/bogus' as never)
    expect(b).toHaveLength(4)
  })
})
