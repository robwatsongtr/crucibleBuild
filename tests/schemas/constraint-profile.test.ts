import { describe, it, expect } from 'vitest'
import { ConstraintRuleSchema } from '../../src/schemas/constraint-rule.js'
import { PersonaSchema } from '../../src/schemas/persona.js'
import { PhaseSchema, ProjectDefinitionSchema } from '../../src/schemas/project-definition.js'
import { LearnerContextSchema } from '../../src/schemas/learner-context.js'
import { ConstraintProfileSchema } from '../../src/schemas/constraint-profile.js'
import { ProjectConfigSchema } from '../../src/schemas/project-config.js'
import { luthorDefaultProfile } from '../../src/profile/luthor.default.js'

describe('ConstraintRuleSchema', () => {
  it('accepts a valid rule', () => {
    const result = ConstraintRuleSchema.safeParse({
      id: 'write-code',
      label: 'Writing code for the learner',
      allowed: false,
      description: 'Never write implementation code.',
    })

    expect(result.success).toBe(true)
  })

  it('accepts a rule with optional examples', () => {
    const result = ConstraintRuleSchema.safeParse({
      id: 'feedback',
      label: 'Feedback on code the learner wrote',
      allowed: true,
      description: 'Give specific feedback.',
      examples: ['Point out what is working.', 'Identify logic errors.'],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a rule missing required fields', () => {
    const result = ConstraintRuleSchema.safeParse({
      id: 'write-code',
      allowed: false,
    })

    expect(result.success).toBe(false)
  })

  it('rejects a rule with wrong type for allowed', () => {
    const result = ConstraintRuleSchema.safeParse({
      id: 'write-code',
      label: 'Writing code',
      allowed: 'no',
      description: 'Never write code.',
    })

    expect(result.success).toBe(false)
  })
})

describe('PersonaSchema', () => {
  it('accepts a valid persona', () => {
    const result = PersonaSchema.safeParse({
      name: 'Luthor Mentor',
      voice: 'A firm, precise senior developer.',
      tone: ['direct', 'precise'],
      firmnessExamples: ['Decline code requests clearly.'],
      antiPatterns: ['Opening with "great question"'],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a persona with missing tone array', () => {
    const result = PersonaSchema.safeParse({
      name: 'Luthor Mentor',
      voice: 'A firm mentor.',
      firmnessExamples: [],
      antiPatterns: [],
    })

    expect(result.success).toBe(false)
  })
})

describe('PhaseSchema', () => {
  it('accepts a valid phase', () => {
    const result = PhaseSchema.safeParse({
      id: 'python-tokens',
      title: 'Python — Tokens',
      goals: ['Define the token enum'],
      checkpoints: ['All token types present'],
      conceptsIntroduced: ['enums', 'token type vs lexeme'],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a phase missing required fields', () => {
    const result = PhaseSchema.safeParse({
      id: 'python-tokens',
      title: 'Python — Tokens',
    })

    expect(result.success).toBe(false)
  })
})

describe('ProjectDefinitionSchema', () => {
  it('rejects an unknown language value', () => {
    const result = ProjectDefinitionSchema.safeParse({
      slug: 'luthor',
      title: 'Luthor',
      summary: 'Build an interpreter.',
      language: 'ruby',
      phases: [],
      referenceArtifacts: [],
    })

    expect(result.success).toBe(false)
  })
})

describe('LearnerContextSchema', () => {
  it('accepts a valid context', () => {
    const result = LearnerContextSchema.safeParse({
      projectSlug: 'luthor',
      currentPhaseId: 'python-tokens',
      fileTree: 'src/\n  tokens.py',
      recentChanges: [{ path: 'src/tokens.py', kind: 'add', at: '2026-06-10T10:00:00Z' }],
      acknowledgedContractAt: '2026-06-10T09:00:00Z',
    })

    expect(result.success).toBe(true)
  })

  it('rejects an invalid change kind', () => {
    const result = LearnerContextSchema.safeParse({
      projectSlug: 'luthor',
      currentPhaseId: 'python-tokens',
      fileTree: '',
      recentChanges: [{ path: 'src/tokens.py', kind: 'delete', at: '2026-06-10T10:00:00Z' }],
      acknowledgedContractAt: '2026-06-10T09:00:00Z',
    })

    expect(result.success).toBe(false)
  })
})

describe('ProjectConfigSchema', () => {
  it('accepts a valid config', () => {
    const result = ProjectConfigSchema.safeParse({
      profileId: 'luthor-default',
      projectSlug: 'luthor',
      currentPhaseId: 'python-tokens',
      contract: {
        acknowledgedAt: '2026-06-10T09:00:00Z',
        version: '1.0.0',
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects a config missing contract', () => {
    const result = ProjectConfigSchema.safeParse({
      profileId: 'luthor-default',
      projectSlug: 'luthor',
      currentPhaseId: 'python-tokens',
    })

    expect(result.success).toBe(false)
  })
})

describe('ConstraintProfileSchema', () => {
  it('validates the luthor default profile', () => {
    const result = ConstraintProfileSchema.safeParse(luthorDefaultProfile)

    expect(result.success).toBe(true)
  })
})
