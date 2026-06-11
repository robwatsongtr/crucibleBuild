import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { PromptRenderer } from '../../src/services/prompt-renderer.js'
import { luthorDefaultProfile } from '../../src/profile/luthor.default.js'
import { LearnerContext } from '../../src/models/index.js'

const repoRoot = resolve(fileURLToPath(import.meta.url), '../../../')

const baseContext: LearnerContext = {
  projectSlug: 'luthor',
  currentPhaseId: 'python-tokens',
  fileTree: 'src/\n  tokens.py',
  recentChanges: [{ path: 'src/tokens.py', kind: 'add', at: '2026-06-10T10:00:00Z' }],
  acknowledgedContractAt: '2026-06-10T09:00:00Z',
}

describe('PromptRenderer', () => {
  it('renders without throwing', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)

    expect(() => renderer.render(baseContext)).not.toThrow()
  })

  it('staticSystem contains persona voice', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { staticSystem } = renderer.render(baseContext)

    expect(staticSystem).toContain(luthorDefaultProfile.persona.voice)
  })

  it('staticSystem contains all rule labels', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { staticSystem } = renderer.render(baseContext)

    for (const rule of luthorDefaultProfile.rules) {
      expect(staticSystem).toContain(rule.label)
    }
  })

  it('staticSystem contains all phase ids', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { staticSystem } = renderer.render(baseContext)

    for (const phase of luthorDefaultProfile.project.phases) {
      expect(staticSystem).toContain(phase.id)
    }
  })

  it('staticSystem contains mentor charter content', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { staticSystem } = renderer.render(baseContext)

    expect(staticSystem).toContain('Mentor Charter')
  })

  it('dynamicSystem contains current phase id', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { dynamicSystem } = renderer.render(baseContext)

    expect(dynamicSystem).toContain('python-tokens')
  })

  it('dynamicSystem contains file tree', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { dynamicSystem } = renderer.render(baseContext)

    expect(dynamicSystem).toContain('tokens.py')
  })

  it('dynamicSystem contains recent changes', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { dynamicSystem } = renderer.render(baseContext)

    expect(dynamicSystem).toContain('src/tokens.py')
  })

  it('staticSystem is byte-stable across two renders with different LearnerContext', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)

    const contextA: LearnerContext = {
      ...baseContext,
      currentPhaseId: 'python-tokens',
      fileTree: 'src/\n  tokens.py',
      recentChanges: [],
    }

    const contextB: LearnerContext = {
      ...baseContext,
      currentPhaseId: 'python-lexer',
      fileTree: 'src/\n  tokens.py\n  lexer.py',
      recentChanges: [{ path: 'src/lexer.py', kind: 'add', at: '2026-06-10T11:00:00Z' }],
    }

    const { staticSystem: staticA } = renderer.render(contextA)
    const { staticSystem: staticB } = renderer.render(contextB)

    expect(staticA).toBe(staticB)
  })

  it('dynamicSystem differs when LearnerContext changes', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)

    const contextA: LearnerContext = {
      ...baseContext,
      currentPhaseId: 'python-tokens',
      fileTree: 'src/\n  tokens.py',
    }

    const contextB: LearnerContext = {
      ...baseContext,
      currentPhaseId: 'python-lexer',
      fileTree: 'src/\n  tokens.py\n  lexer.py',
    }

    const { dynamicSystem: dynamicA } = renderer.render(contextA)
    const { dynamicSystem: dynamicB } = renderer.render(contextB)

    expect(dynamicA).not.toBe(dynamicB)
  })

  it('dynamicSystem shows no recent changes message when list is empty', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { dynamicSystem } = renderer.render({ ...baseContext, recentChanges: [] })

    expect(dynamicSystem).toContain('No recent file changes')
  })

  it('dynamicSystem shows unknown phase message for unrecognised phase id', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { dynamicSystem } = renderer.render({ ...baseContext, currentPhaseId: 'not-a-phase' })

    expect(dynamicSystem).toContain('unknown')
  })

  it('staticSystem snapshot', () => {
    const renderer = new PromptRenderer(luthorDefaultProfile, repoRoot)
    const { staticSystem } = renderer.render(baseContext)

    expect(staticSystem).toMatchSnapshot()
  })
})
