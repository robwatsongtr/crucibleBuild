import { z } from 'zod'

export const PhaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  goals: z.array(z.string()),
  checkpoints: z.array(z.string()),
  conceptsIntroduced: z.array(z.string()),
})

export const ProjectDefinitionSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  language: z.enum(['python', 'cpp', 'multi']),
  phases: z.array(PhaseSchema),
  referenceArtifacts: z.array(z.string()),
  watchPaths: z.array(z.string()).optional(),
})
