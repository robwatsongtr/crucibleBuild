import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { renderPrompt } from '../../src/services/prompt-renderer.js'
import { luthorDefaultProfile } from '../../src/profile/luthor.default.js'
import { LearnerContext } from '../../src/models/index.js'

const repoRoot = resolve(fileURLToPath(import.meta.url), '../../../')

let mentorGuide: string

beforeAll(() => {
  mentorGuide = readFileSync(resolve(repoRoot, 'luthor_curriculum/mentor_guide.md'), 'utf-8')
})

const baseContext: LearnerContext = {
  projectSlug: 'luthor',
  currentPhaseId: 'python-tokens',
  fileTree: 'src/\n  tokens.py',
  recentChanges: [{ path: 'src/tokens.py', kind: 'add', at: '2026-06-10T10:00:00Z' }],
  acknowledgedContractAt: '2026-06-10T09:00:00Z',
}

describe('renderPrompt', () => {
  it('renders without throwing', () => {
    expect(() => renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)).not.toThrow()
  })

  it('staticSystem contains persona voice', () => {
    const { staticSystem } = renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)

    expect(staticSystem).toContain(luthorDefaultProfile.persona.voice)
  })

  it('staticSystem contains all rule labels', () => {
    const { staticSystem } = renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)

    for (const rule of luthorDefaultProfile.rules) {
      expect(staticSystem).toContain(rule.label)
    }
  })

  it('staticSystem contains all phase ids', () => {
    const { staticSystem } = renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)

    for (const phase of luthorDefaultProfile.project.phases) {
      expect(staticSystem).toContain(phase.id)
    }
  })

  it('staticSystem contains mentor guide content', () => {
    const { staticSystem } = renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)

    expect(staticSystem).toContain('Mentor Charter')
  })

  it('dynamicSystem contains current phase id', () => {
    const { dynamicSystem } = renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)

    expect(dynamicSystem).toContain('python-tokens')
  })

  it('dynamicSystem contains file tree', () => {
    const { dynamicSystem } = renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)

    expect(dynamicSystem).toContain('tokens.py')
  })

  it('dynamicSystem contains recent changes', () => {
    const { dynamicSystem } = renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)

    expect(dynamicSystem).toContain('src/tokens.py')
  })

  it('staticSystem is byte-stable across two renders with different LearnerContext', () => {
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

    const { staticSystem: staticA } = renderPrompt(luthorDefaultProfile, contextA, mentorGuide)
    const { staticSystem: staticB } = renderPrompt(luthorDefaultProfile, contextB, mentorGuide)

    expect(staticA).toBe(staticB)
  })

  it('dynamicSystem differs when LearnerContext changes', () => {
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

    const { dynamicSystem: dynamicA } = renderPrompt(luthorDefaultProfile, contextA, mentorGuide)
    const { dynamicSystem: dynamicB } = renderPrompt(luthorDefaultProfile, contextB, mentorGuide)

    expect(dynamicA).not.toBe(dynamicB)
  })

  it('dynamicSystem shows no recent changes message when list is empty', () => {
    const { dynamicSystem } = renderPrompt(
      luthorDefaultProfile,
      { ...baseContext, recentChanges: [] },
      mentorGuide,
    )

    expect(dynamicSystem).toContain('No recent file changes')
  })

  it('dynamicSystem shows unknown phase message for unrecognised phase id', () => {
    const { dynamicSystem } = renderPrompt(
      luthorDefaultProfile,
      { ...baseContext, currentPhaseId: 'not-a-phase' },
      mentorGuide,
    )

    expect(dynamicSystem).toContain('unknown')
  })

  it('staticSystem snapshot', () => {
    const { staticSystem } = renderPrompt(luthorDefaultProfile, baseContext, mentorGuide)

    expect(staticSystem).toMatchSnapshot()
  })
})
