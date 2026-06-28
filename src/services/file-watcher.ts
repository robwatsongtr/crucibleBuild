import chokidar, { FSWatcher } from 'chokidar'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { DEBOUNCE_MS } from '../config/constants.js'
import { ContextStore, ChangeKind } from './context-store.js'

const DEFAULT_IGNORED = ['**/node_modules/**', '**/.git/**', '**/.cruciblebuild/state/**', '**/.*']

/**
 * Wraps chokidar with debouncing and feeds file events into ContextStore.
 * Holds a live watcher handle — must be closed when the session ends.
 */
export class FileWatcher {
  private watcher: FSWatcher | null = null
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor(
    private readonly projectRoot: string,
    private readonly store: ContextStore,
    private readonly watchPaths?: string[],
  ) {}

  /** Starts watching. If watchPaths are specified, watches those subdirs only. Otherwise watches the project root. */
  start(): void {
    const ignored = this.buildIgnoreList()
    const targets = this.watchPaths
      ? this.watchPaths.map((p) => resolve(this.projectRoot, p))
      : [this.projectRoot]

    this.watcher = chokidar.watch(targets, {
      ignored,
      ignoreInitial: false,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    })

    this.watcher.on('ready', () => {
      this.store.refreshFileTree()
    })

    this.watcher.on('add', (path) => this.handleEvent(path, 'add', true))
    this.watcher.on('change', (path) => this.handleEvent(path, 'change', false))
    this.watcher.on('unlink', (path) => this.handleEvent(path, 'unlink', true))
  }

  /** Stops the watcher and clears all pending debounce timers. */
  async stop(): Promise<void> {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }

  private handleEvent(absolutePath: string, kind: ChangeKind, refreshTree: boolean): void {
    const existing = this.debounceTimers.get(absolutePath)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      this.debounceTimers.delete(absolutePath)
      this.store.pushChange(absolutePath, kind)

      if (refreshTree) {
        this.store.refreshFileTree()
      }
    }, DEBOUNCE_MS)

    this.debounceTimers.set(absolutePath, timer)
  }

  private buildIgnoreList(): string[] {
    const ignored = [...DEFAULT_IGNORED]
    const ignorePath = resolve(this.projectRoot, '.cruciblebuildignore')

    if (existsSync(ignorePath)) {
      const lines = readFileSync(ignorePath, 'utf-8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'))

      ignored.push(...lines)
    }

    return ignored
  }
}
