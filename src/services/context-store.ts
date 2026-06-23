import { writeFileSync } from 'fs'
import { RING_BUFFER_SIZE, FILE_TREE_MAX_DEPTH } from '../config/constants.js'
import { getPaths } from '../config/paths.js'
import { listDirectory } from './fs-reader.js'
import { ProjectConfig } from '../models/index.js'

export type ChangeKind = 'add' | 'change' | 'unlink'

export interface FileChange {
  path: string
  kind: ChangeKind
  at: string
}

/**
 * Holds in-memory project context for the agent: file tree snapshot and
 * a ring buffer of recent file changes. Updated by FileWatcher events.
 *
 * Context store is a singleton for the session
 */
export class ContextStore {
  private fileTreeSnapshot: string = ''
  private changes: FileChange[] = []
  currentPhaseId: string

  constructor(
    private readonly projectRoot: string,
    initialPhaseId: string,
  ) {
    this.currentPhaseId = initialPhaseId
  }

  /** Rebuilds the file tree snapshot from disk. Called on add/unlink events.
    As a plain string — a formatted multi-line text representation built from 
    the directory listing.  
  */
  refreshFileTree(): void {
    const entries = listDirectory(this.projectRoot, '.', FILE_TREE_MAX_DEPTH)
    const lines = entries.map((e) => `${'  '.repeat(e.path.split('/').length - 1)}${e.path}`)

    this.fileTreeSnapshot = lines.join('\n')
  }

  /** Returns the current file tree as a formatted string. */
  getFileTree(): string {
    return this.fileTreeSnapshot
  }

  /**
   * Appends a file change event to the ring buffer.
   * Oldest entry is dropped once the buffer exceeds RING_BUFFER_SIZE.
   */
  pushChange(path: string, kind: ChangeKind): void {
    this.changes.push({ path, kind, at: new Date().toISOString() })

    if (this.changes.length > RING_BUFFER_SIZE) {
      this.changes.shift()
    }
  }

  /** Returns recent changes, optionally limited to the last N entries. */
  getRecentChanges(limit?: number): FileChange[] {
    const all = [...this.changes]

    return limit !== undefined ? all.slice(-limit) : all
  }

  /** Clears the recent changes buffer. */
  clearChanges(): void {
    this.changes = []
  }

  /**
   * Advances to the next phase in the ordered phase list.
   * Returns the new phaseId on success, or null if already on the last phase.
   * Persists the change to config.json immediately.
   */
  advancePhase(orderedPhaseIds: string[], config: ProjectConfig): string | null {
    const idx = orderedPhaseIds.indexOf(this.currentPhaseId)

    if (idx === -1 || idx === orderedPhaseIds.length - 1) {
      return null
    }

    this.currentPhaseId = orderedPhaseIds[idx + 1]

    const paths = getPaths(this.projectRoot)
    const updated = { ...config, currentPhaseId: this.currentPhaseId }
    writeFileSync(paths.configFile, JSON.stringify(updated, null, 2) + '\n', 'utf-8')

    return this.currentPhaseId
  }
}
