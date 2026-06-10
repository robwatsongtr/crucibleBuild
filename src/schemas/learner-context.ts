import { z } from 'zod'

export const LearnerContextSchema = z.object({
  projectSlug: z.string(),
  currentPhaseId: z.string(),
  fileTree: z.string(),
  recentChanges: z.array(
    z.object({
      path: z.string(),
      kind: z.enum(['add', 'change', 'unlink']),
      at: z.string(),
    }),
  ),
  acknowledgedContractAt: z.string(),
})
