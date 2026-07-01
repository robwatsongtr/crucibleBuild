import * as readline from 'readline'
import * as fs from 'fs'
import { getPaths } from '../config/paths.js'
import { AgentLoop } from '../agent/agent-loop.js'
import { dispatchSlashCommand, listSlashCommands } from './keybindings.js'
import {
  renderMarkdown,
  //renderUserLabel,
  renderMentorLabel,
  renderError,
  renderStatus,
  renderSpinner,
} from './renderer.js'
import { logDebug } from '../logging/logger.js'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/**
 * Terminal chat REPL. A thin terminal wrapper around AgentLoop — handles input,
 * output rendering, and the readline lifecycle. Has no knowledge of the LLM or
 * filesystem beyond the agentLoop reference it receives.
 *
 * ## Send / Receive mechanism
 *
 * SEND: The user types a message and hits Enter. readline fires a 'line' event,
 * which routes to handleLine() → sendMessage(input).
 *
 * RECEIVE: onDelta accumulates streamed chunks silently into fullText while the
 * spinner runs. Once agentLoop.chat() resolves, the full response is rendered
 * as markdown in one shot. This avoids partial markdown artifacts mid-stream.
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
  private readonly agentLoop: AgentLoop
  private pasteMode = false
  private pasteBuffer: string[] = []
  private spinnerTimer: ReturnType<typeof setInterval> | null = null
  private spinnerFrame = 0

  constructor(projectRoot: string, agentLoop: AgentLoop) {
    this.agentLoop = agentLoop
    this.paths = getPaths(projectRoot)
    fs.mkdirSync(this.paths.stateDir, { recursive: true })

    // this creates an instance of the Node readline interfacve
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 200,
    })
    // readline input history
    this.loadHistory()
  }

  /** Starts the REPL loop. Resolves when the user exits. */
  async start(): Promise<void> {
    this.clearTerminal()
    this.printWelcome()
    await this.orientLearner()
    return new Promise((resolve) => {
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

  /*************************************************************************
   * PASSES INPUT TO AGENT and renders the response.
   * onDelta accumulates chunks into fullText while the spinner runs.
   * Markdown is rendered once on the complete text after streaming finishes.
   **************************************************************************/
  private async sendMessage(input: string): Promise<void> {
    process.stdout.write(`\n${renderMentorLabel()}\n`)

    this.startSpinner()

    let fullText = ''

    // Accumulate chunks silently — spinner stays up until the full response arrives.
    // Markdown is rendered once on the complete text after streaming finishes.
    const onDelta = (chunk: string): void => {
      fullText += chunk
    }

    const onToolCall = (name: string, toolInput: Record<string, unknown>): void => {
      this.stopSpinner()
      if (name === 'read_file') {
        const path = toolInput['path'] as string
        process.stdout.write(renderStatus(`⚙ ${name}: ${path}\n`))
      } else {
        process.stdout.write(renderStatus(`⚙ ${name}\n`))
      }
      this.startSpinner()
    }

    try {
      await this.agentLoop.chat(input, onDelta, onToolCall)

      this.stopSpinner()
      process.stdout.write(renderMarkdown(fullText))
      logDebug('Turn complete', { chars: fullText.length })
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

      case '/phase': {
        const phase = this.agentLoop.currentPhaseDetail()
        if (phase) {
          const checkpoints = phase.checkpoints.map((c) => `  - ${c}`).join('\n')
          const goals = phase.goals.map((g) => `  - ${g}`).join('\n')
          process.stdout.write(
            renderStatus(
              `Phase: ${phase.id} — ${phase.title}\n\nGoals:\n${goals}\n\nCheckpoints (all must be met to advance):\n${checkpoints}\n`,
            ),
          )
        } else {
          process.stdout.write(renderStatus(`Current phase: ${this.agentLoop.currentPhaseId()}\n`))
        }
        this.prompt()
        break
      }

      case '/files':
        process.stdout.write(renderStatus(`${this.agentLoop.fileTree()}\n`))
        this.prompt()
        break

      default:
        process.stdout.write(renderError(`Unknown command: ${command}\n`))
        this.prompt()
    }
  }

  private async orientLearner(): Promise<void> {
    await this.sendMessage(
      'Session started. Use list_directory to see what the learner has built, then use read_file to read only the source files for the current phase. ' +
        'Do not read curriculum docs, config files, or README files. ' +
        'Base your assessment only on what the code actually shows — not on what the learner has said. ' +
        'If the code satisfies all checkpoints for the current phase, call advance_phase immediately. ' +
        'Then give the opening brief for wherever the learner actually is.',
    )
  }

  private prompt(): void {
    // const label = renderUserLabel()
    // this.rl.setPrompt(`\n${label} > `)
    this.rl.setPrompt(`\n> `)
    this.rl.prompt()
  }

  private printWelcome(): void {
    const commands = listSlashCommands().join('  ')
    const model = this.agentLoop.modelId()
    process.stdout.write(
      renderMarkdown(
        `# CrucibleBuild — Mentor Session\n\nModel: ${model}\n\nSlash commands: ${commands}\n\nTo paste multi-line text, type \`:paste\` to enter paste mode, paste your text, then type \`:paste\` again to send.`,
      ),
    )
  }

  private clearTerminal(): void {
    process.stdout.write('\x1B[2J\x1B[0f')
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
