import { describe, it, expect } from 'vitest'
import {
  renderMarkdown,
  renderUserLabel,
  renderMentorLabel,
  renderError,
  renderStatus,
  renderSpinner,
} from '../../src/tui/renderer.js'

describe('renderer', () => {
  it('renderMarkdown returns a non-empty string for markdown input', () => {
    const result = renderMarkdown('# Hello\n\nSome text.')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('renderMarkdown includes the heading text', () => {
    const result = renderMarkdown('# Hello')
    expect(result).toContain('Hello')
  })

  it('renderUserLabel returns a non-empty string', () => {
    expect(renderUserLabel().length).toBeGreaterThan(0)
  })

  it('renderMentorLabel returns a non-empty string', () => {
    expect(renderMentorLabel().length).toBeGreaterThan(0)
  })

  it('renderError includes the message', () => {
    const result = renderError('something went wrong')
    expect(result).toContain('something went wrong')
  })

  it('renderStatus includes the message', () => {
    const result = renderStatus('waiting...')
    expect(result).toContain('waiting...')
  })

  it('renderSpinner includes the frame character', () => {
    const result = renderSpinner('⠋')
    expect(result).toContain('⠋')
  })
})

describe('renderer snapshots', () => {
  it('renderMarkdown snapshot', () => {
    expect(renderMarkdown('## Section\n\nParagraph with `code`.')).toMatchSnapshot()
  })

  it('renderError snapshot', () => {
    expect(renderError('file not found')).toMatchSnapshot()
  })
})
