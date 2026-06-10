import { z } from 'zod'

export const ReadFileInputSchema = z.object({
  path: z.string(),
})

export const ReadFileOutputSchema = z.object({
  path: z.string(),
  content: z.string(),
  truncated: z.boolean(),
  bytes: z.number(),
})

export const ListDirectoryInputSchema = z.object({
  path: z.string().optional(),
  maxDepth: z.number().int().positive().optional(),
})

export const DirectoryEntrySchema = z.object({
  path: z.string(),
  kind: z.enum(['file', 'directory']),
  size: z.number().optional(),
})

export const ListDirectoryOutputSchema = z.object({
  entries: z.array(DirectoryEntrySchema),
})

export const GetRecentChangesInputSchema = z.object({
  limit: z.number().int().positive().optional(),
  since: z.string().optional(),
})

export const FileChangeSchema = z.object({
  path: z.string(),
  kind: z.enum(['add', 'change', 'unlink']),
  at: z.string(),
})

export const GetRecentChangesOutputSchema = z.object({
  changes: z.array(FileChangeSchema),
})

export const GetProjectPhaseInputSchema = z.object({})

export const GetProjectPhaseOutputSchema = z.object({
  projectSlug: z.string(),
  currentPhaseId: z.string(),
  phase: z.object({
    title: z.string(),
    goals: z.array(z.string()),
    checkpoints: z.array(z.string()),
    conceptsIntroduced: z.array(z.string()),
  }),
})
