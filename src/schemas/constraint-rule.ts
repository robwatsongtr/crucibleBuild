import { z } from 'zod'

export const ConstraintRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  allowed: z.boolean(),
  description: z.string(),
  examples: z.array(z.string()).optional(),
})
