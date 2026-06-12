/**
 * Stderr-only logger. Never writes to stdout — the TUI owns stdout.
 * Level gated by CRUCIBLEBUILD_LOG env var (debug | info | warn | error).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

const resolveLevel = (): number => {
  const env = process.env.CRUCIBLEBUILD_LOG?.toLowerCase() ?? 'info'

  return LEVELS[env as LogLevel] ?? LEVELS.info
}

const currentLevel = resolveLevel()

const write = (level: LogLevel, message: string, data?: unknown): void => {
  const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : ''
  process.stderr.write(`[${level.toUpperCase()}] ${message}${suffix}\n`)
}

export const logDebug = (message: string, data?: unknown): void => {
  if (currentLevel <= LEVELS.debug) write('debug', message, data)
}

export const logInfo = (message: string, data?: unknown): void => {
  if (currentLevel <= LEVELS.info) write('info', message, data)
}

export const logWarn = (message: string, data?: unknown): void => {
  if (currentLevel <= LEVELS.warn) write('warn', message, data)
}

export const logError = (message: string, data?: unknown): void => {
  if (currentLevel <= LEVELS.error) write('error', message, data)
}
