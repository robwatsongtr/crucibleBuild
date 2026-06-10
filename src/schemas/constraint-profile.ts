import { z } from 'zod'
import { PersonaSchema } from './persona.js'
import { ConstraintRuleSchema } from './constraint-rule.js'
import { ProjectDefinitionSchema } from './project-definition.js'

export const ConstraintProfileSchema = z.object({
  id: z.string(),
  version: z.string(),
  persona: PersonaSchema,
  rules: z.array(ConstraintRuleSchema),
  project: ProjectDefinitionSchema,
})
