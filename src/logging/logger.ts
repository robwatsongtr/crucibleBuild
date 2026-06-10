/**
 * Stderr-only logger. Never writes to stdout — the TUI owns stdout.
 * Level gated by CRUCIBLEBUILD_LOG env var (debug | info | warn | error).
 */
export class Logger {
  private static levels = { debug: 0, info: 1, warn: 2, error: 3 }
  private static currentLevel: number = Logger.resolveLevel()

  private static resolveLevel(): number {
    const env = process.env.CRUCIBLEBUILD_LOG?.toLowerCase() ?? 'info'

    return Logger.levels[env as keyof typeof Logger.levels] ?? Logger.levels.info
  }

  private static write(level: string, message: string, data?: unknown): void {
    const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : ''
    process.stderr.write(`[${level.toUpperCase()}] ${message}${suffix}\n`)
  }

  static debug(message: string, data?: unknown): void {
    if (Logger.currentLevel <= Logger.levels.debug) Logger.write('debug', message, data)
  }

  static info(message: string, data?: unknown): void {
    if (Logger.currentLevel <= Logger.levels.info) Logger.write('info', message, data)
  }

  static warn(message: string, data?: unknown): void {
    if (Logger.currentLevel <= Logger.levels.warn) Logger.write('warn', message, data)
  }

  static error(message: string, data?: unknown): void {
    if (Logger.currentLevel <= Logger.levels.error) Logger.write('error', message, data)
  }
}
