import { z } from 'zod'

export const PersonaSchema = z.object({
  name: z.string(),
  voice: z.string(),
  tone: z.array(z.string()),
  firmnessExamples: z.array(z.string()),
  antiPatterns: z.array(z.string()),
})
