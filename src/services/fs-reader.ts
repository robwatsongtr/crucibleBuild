import { readFileSync, realpathSync, statSync, existsSync, readdirSync } from 'fs'
import { resolve, relative } from 'path'
import { FILE_SIZE_CAP_BYTES } from '../config/constants.js'

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
  '.pdf', '.zip', '.tar', '.gz', '.exe', '.bin', '.wasm',
  '.mp3', '.mp4', '.mov', '.avi',
])

const TRUNCATION_MARKER = '\n\n[...truncated — file exceeds 256KB]'

export interface ReadFileResult {
  path: string
  content: string
  truncated: boolean
  bytes: number
}

export interface DirectoryEntry {
  path: string
  kind: 'file' | 'directory'
  size?: number
}

export class SandboxViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SandboxViolationError'
  }
}

/**
 * Resolves and validates that a path stays inside the project root.
 * Throws SandboxViolationError if the path escapes or is a symlink pointing outside.
 */
export const resolveSafe = (projectRoot: string, inputPath: string): string => {
  // Resolve projectRoot through symlinks so comparisons work on macOS (/var → /private/var)
  const realRoot = realpathSync(projectRoot)
  const absolute = resolve(realRoot, inputPath)

  if (!absolute.startsWith(realRoot + '/') && absolute !== realRoot) {
    throw new SandboxViolationError(`Path escapes project root: ${inputPath}`)
  }

  if (existsSync(absolute)) {
    const real = realpathSync(absolute)

    if (!real.startsWith(realRoot + '/') && real !== realRoot) {
      throw new SandboxViolationError(`Symlink escapes project root: ${inputPath}`)
    }
  }

  return absolute
}

/**
 * Reads a file inside the project root with sandbox enforcement.
 * Rejects binary files. Caps size at 256KB with a truncation marker.
 */
export const readFile = (projectRoot: string, inputPath: string): ReadFileResult => {
  const absolute = resolveSafe(projectRoot, inputPath)
  const ext = absolute.slice(absolute.lastIndexOf('.')).toLowerCase()

  if (BINARY_EXTENSIONS.has(ext)) {
    throw new SandboxViolationError(`Binary files cannot be read: ${inputPath}`)
  }

  const bytes = statSync(absolute).size
  const truncated = bytes > FILE_SIZE_CAP_BYTES
  const raw = readFileSync(absolute, 'utf-8')
  const content = truncated ? raw.slice(0, FILE_SIZE_CAP_BYTES) + TRUNCATION_MARKER : raw

  return { path: inputPath, content, truncated, bytes }
}

/**
 * Lists directory contents inside the project root up to maxDepth levels deep.
 */
export const listDirectory = (
  projectRoot: string,
  inputPath: string = '.',
  maxDepth: number = 2,
): DirectoryEntry[] => {
  const realRoot = realpathSync(projectRoot)
  const absolute = resolveSafe(projectRoot, inputPath)
  const entries: DirectoryEntry[] = []

  collectEntries(realRoot, absolute, maxDepth, 0, entries)

  return entries
}

const collectEntries = (
  projectRoot: string,
  absolute: string,
  maxDepth: number,
  currentDepth: number,
  entries: DirectoryEntry[],
): void => {
  if (currentDepth > maxDepth) return

  const dirEntries = readdirSync(absolute, { withFileTypes: true })

  for (const entry of dirEntries) {
    const entryAbsolute = resolve(absolute, entry.name)
    const rel = relative(projectRoot, entryAbsolute)

    if (entry.isDirectory()) {
      entries.push({ path: rel, kind: 'directory' })
      collectEntries(projectRoot, entryAbsolute, maxDepth, currentDepth + 1, entries)
    } else if (entry.isFile()) {
      const size = statSync(entryAbsolute).size
      entries.push({ path: rel, kind: 'file', size })
    }
  }
}
