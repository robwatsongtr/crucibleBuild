/**
 * Executes tool calls from the agent loop against the filesystem services.
 * Each handler validates its input with Zod, calls the relevant service,
 * and returns a JSON string result to be appended to the messages array.
 */

import { ConstraintProfile } from '../models/index.js'
import { ContextStore } from '../services/context-store.js'
import { readFile, listDirectory } from '../services/fs-reader.js'
import {
  ReadFileInputSchema,
  ListDirectoryInputSchema,
  GetRecentChangesInputSchema,
  GetProjectPhaseInputSchema,
} from '../schemas/agent-tool-io.js'

/**
 * ToolHandlerDeps:
 *
 * Shared context passed into every tool handler. Constructed once when chat
 * starts and handed down through executeTool — handlers never construct these
 * themselves.
 *
 * projectRoot  — sandbox boundary for readFile/listDirectory
 * contextStore — live in-memory state for get_recent_changes and get_project_phase
 * profile      — phase catalog for get_project_phase to look up against
 */
export interface ToolHandlerDeps {
  projectRoot: string
  contextStore: ContextStore
  profile: ConstraintProfile
}

const handleReadFile = (input: unknown, deps: ToolHandlerDeps): string => {
  const { path } = ReadFileInputSchema.parse(input)
  const result = readFile(deps.projectRoot, path)

  return JSON.stringify(result)
}

const handleListDirectory = (input: unknown, deps: ToolHandlerDeps): string => {
  const { path, maxDepth } = ListDirectoryInputSchema.parse(input)
  const entries = listDirectory(deps.projectRoot, path ?? '.', maxDepth ?? 2)

  return JSON.stringify({ entries })
}

const handleGetRecentChanges = (input: unknown, deps: ToolHandlerDeps): string => {
  const { limit, since } = GetRecentChangesInputSchema.parse(input)
  let changes = deps.contextStore.getRecentChanges(limit)

  if (since !== undefined) {
    const sinceMs = new Date(since).getTime()
    changes = changes.filter((c) => new Date(c.at).getTime() > sinceMs)
  }

  return JSON.stringify({ changes })
}

const handleGetProjectPhase = (input: unknown, deps: ToolHandlerDeps): string => {
  GetProjectPhaseInputSchema.parse(input)

  const { currentPhaseId } = deps.contextStore
  const phase = deps.profile.project.phases.find((p) => p.id === currentPhaseId)

  if (!phase) {
    return JSON.stringify({ error: `Phase not found: ${currentPhaseId}` })
  }

  return JSON.stringify({
    projectSlug: deps.profile.project.slug,
    currentPhaseId,
    phase: {
      title: phase.title,
      goals: phase.goals,
      checkpoints: phase.checkpoints,
      conceptsIntroduced: phase.conceptsIntroduced,
    },
  })
}

const handlers: Record<string, (input: unknown, deps: ToolHandlerDeps) => string> = {
  read_file: handleReadFile,
  list_directory: handleListDirectory,
  get_recent_changes: handleGetRecentChanges,
  get_project_phase: handleGetProjectPhase,
}

/**
 * Dispatches a tool call by name. Returns the result as a JSON string.
 * Throws if the tool name is unknown.
 */
export const executeTool = (name: string, input: unknown, deps: ToolHandlerDeps): string => {
  const handler = handlers[name]

  if (!handler) {
    throw new Error(`Unknown tool: ${name}`)
  }

  return handler(input, deps)
}
