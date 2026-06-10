import { z } from 'zod'

export const ProjectConfigSchema = z.object({
  profileId: z.string(),
  projectSlug: z.string(),
  currentPhaseId: z.string(),
  contract: z.object({
    acknowledgedAt: z.string(),
    version: z.string(),
  }),
})
