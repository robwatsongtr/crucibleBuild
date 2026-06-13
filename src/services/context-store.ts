import { RING_BUFFER_SIZE, FILE_TREE_MAX_DEPTH } from '../config/constants.js'
import { listDirectory } from './fs-reader.js'

export type ChangeKind = 'add' | 'change' | 'unlink'

export interface FileChange {
  path: string
  kind: ChangeKind
  at: string
}

/**
 * Holds in-memory project context for the agent: file tree snapshot and
 * a ring buffer of recent file changes. Updated by FileWatcher events.
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
}
