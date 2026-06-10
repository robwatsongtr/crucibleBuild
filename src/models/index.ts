import { z } from 'zod'
import { ConstraintRuleSchema } from '../schemas/constraint-rule.js'
import { PersonaSchema } from '../schemas/persona.js'
import { PhaseSchema, ProjectDefinitionSchema } from '../schemas/project-definition.js'
import { LearnerContextSchema } from '../schemas/learner-context.js'
import { ConstraintProfileSchema } from '../schemas/constraint-profile.js'
import { ProjectConfigSchema } from '../schemas/project-config.js'

export type ConstraintRule = z.infer<typeof ConstraintRuleSchema>
export type Persona = z.infer<typeof PersonaSchema>
export type Phase = z.infer<typeof PhaseSchema>
export type ProjectDefinition = z.infer<typeof ProjectDefinitionSchema>
export type LearnerContext = z.infer<typeof LearnerContextSchema>
export type ConstraintProfile = z.infer<typeof ConstraintProfileSchema>
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>
