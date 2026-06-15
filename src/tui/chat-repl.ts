import * as readline from 'readline'
import * as fs from 'fs'
import { getPaths } from '../config/paths.js'
import { stubStream } from '../agent/stub-agent.js'
import { dispatchSlashCommand, listSlashCommands } from './keybindings.js'
import {
  renderMarkdown,
  renderUserLabel,
  renderMentorLabel,
  renderError,
  renderStatus,
  renderSpinner,
} from './renderer.js'
import { logDebug } from '../logging/logger.js'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/**
 * Terminal chat REPL. Holds a live readline interface and conversation history.
 * Supports multiline input (trailing \), slash commands, and streamed responses.
 *
 * ## Send / Receive mechanism
 *
 * SEND: The user types a message and hits enter. readline fires a 'line' event,
 * which routes to handleLine() → sendMessage(input). The input string is passed
 * to the agent (currently stubStream; AgentLoop in Phase 5).
 *
 * RECEIVE: The agent does NOT return a full string. Instead it calls onDelta(chunk)
 * repeatedly as each piece of text is ready. onDelta writes each chunk directly to
 * stdout as it arrives — this produces the typewriter/streaming effect.
 * The agent call resolves only when the full response is done.
 *
 * In Phase 5, stubStream is replaced by agentLoop.stream(input, onDelta).
 * The TUI does not change — only what is on the other end of the callback changes.
 *
 * ## REPL loop
 *
 * There is no explicit while loop. Node's readline module manages the loop
 * internally: it shows the prompt, waits for Enter, fires 'line', then waits
 * again. The process stays alive as long as the readline interface is open.
 * Calling rl.close() (via /exit or Ctrl+D) fires 'close' and resolves start().
 */
export class ChatRepl {
  private readonly rl: readline.Interface
  private readonly paths: ReturnType<typeof getPaths>
  private turnIndex = 0
  private pasteMode = false
  private pasteBuffer: string[] = []
  private spinnerTimer: ReturnType<typeof setInterval> | null = null
  private spinnerFrame = 0

  constructor(projectRoot: string) {
    this.paths = getPaths(projectRoot)
    fs.mkdirSync(this.paths.stateDir, { recursive: true })

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 200,
    })

    this.loadHistory()
  }

  /** Starts the REPL loop. Resolves when the user exits. */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.printWelcome()
      this.prompt()

      this.rl.on('line', async (line) => {
        await this.handleLine(line)
      })

      this.rl.on('close', () => {
        this.saveHistory()
        process.stdout.write('\n')
        resolve()
      })
    })
  }

  private async handleLine(line: string): Promise<void> {
    // In paste mode, buffer lines until the user types :paste to send.
    if (this.pasteMode) {
      if (line.trim() === ':paste') {
        const input = this.pasteBuffer.join('\n')
        this.pasteBuffer = []
        this.pasteMode = false
        await this.sendMessage(input)
      } else {
        this.pasteBuffer.push(line)
      }

      return
    }

    if (line.trim() === ':paste') {
      this.pasteMode = true
      process.stdout.write(renderStatus('Paste mode — type :paste on its own line to send\n'))

      return
    }

    // Trailing \ continues input on the next line (like shell multiline).
    if (line.endsWith('\\')) {
      this.pasteBuffer.push(line.slice(0, -1))
      this.pasteMode = true
      process.stdout.write(renderStatus('Multiline — end with :paste to send\n'))

      return
    }

    const trimmed = line.trim()

    if (!trimmed) {
      this.prompt()

      return
    }

    const dispatch = dispatchSlashCommand(trimmed)

    if (dispatch.handled) {
      await this.handleSlashCommand(dispatch.command)

      return
    }

    await this.sendMessage(trimmed)
  }

  /**
   * SEND: passes input to the agent.
   * RECEIVE: onDelta is the callback the agent calls for each streamed chunk.
   * Each chunk is written to stdout immediately — no buffering, no waiting
   * for the full response before printing.
   */
  private async sendMessage(input: string): Promise<void> {
    process.stdout.write(`\n${renderMentorLabel()}\n`)

    this.startSpinner()

    let firstDelta = true
    let fullText = ''

    // onDelta is the receive side: called once per streamed chunk.
    // Stops the spinner on the first chunk so it doesn't overlap with text.
    const onDelta = (chunk: string): void => {
      if (firstDelta) {
        this.stopSpinner()
        firstDelta = false
      }

      process.stdout.write(chunk)
      fullText += chunk
    }

    try {
      // stubStream drives onDelta from a fake word-by-word loop.
      // In Phase 5 this becomes: agentLoop.stream(input, onDelta)
      await stubStream(input, this.turnIndex, onDelta)
      this.turnIndex++

      if (firstDelta) {
        this.stopSpinner()
      }

      process.stdout.write('\n\n')
      logDebug('Turn complete', { turnIndex: this.turnIndex, chars: fullText.length })
    } catch (err) {
      this.stopSpinner()
      process.stdout.write(renderError(err instanceof Error ? err.message : String(err)) + '\n')
    }

    this.prompt()
  }

  private async handleSlashCommand(command: string): Promise<void> {
    switch (command) {
      case '/exit':
        this.rl.close()
        break

      case '/clear':
        process.stdout.write('\x1Bc')
        this.printWelcome()
        this.prompt()
        break

      case '/phase':
        process.stdout.write(
          renderStatus(`Current phase: (stub — phase info available in Phase 5)\n`),
        )
        this.prompt()
        break

      case '/files':
        process.stdout.write(
          renderStatus(`File tree: (stub — file listing available in Phase 5)\n`),
        )
        this.prompt()
        break

      default:
        process.stdout.write(renderError(`Unknown command: ${command}\n`))
        this.prompt()
    }
  }

  private prompt(): void {
    const label = renderUserLabel()
    this.rl.setPrompt(`\n${label} > `)
    this.rl.prompt()
  }

  private printWelcome(): void {
    const commands = listSlashCommands().join('  ')
    process.stdout.write(
      renderMarkdown(`# CrucibleBuild — Mentor Session\n\nSlash commands: ${commands}\n`),
    )
  }

  private startSpinner(): void {
    this.spinnerFrame = 0
    this.spinnerTimer = setInterval(() => {
      const frame = SPINNER_FRAMES[this.spinnerFrame % SPINNER_FRAMES.length]
      process.stderr.write(`\r${renderSpinner(frame)} thinking...`)
      this.spinnerFrame++
    }, 80)
  }

  private stopSpinner(): void {
    if (this.spinnerTimer !== null) {
      clearInterval(this.spinnerTimer)
      this.spinnerTimer = null
      process.stderr.write('\r\x1B[K')
    }
  }

  private loadHistory(): void {
    try {
      const raw = fs.readFileSync(this.paths.historyFile, 'utf-8')
      const lines = raw.split('\n').filter(Boolean)
      ;(this.rl as unknown as { history: string[] }).history = lines.reverse()
    } catch {
      // no history file yet — start fresh
    }
  }

  private saveHistory(): void {
    try {
      const history = (this.rl as unknown as { history: string[] }).history
      fs.writeFileSync(this.paths.historyFile, [...history].reverse().join('\n') + '\n', 'utf-8')
    } catch {
      // non-fatal — history just won't persist
    }
  }
}
