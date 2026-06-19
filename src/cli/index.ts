import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import { runInit } from './init.js'
import { runChat } from './chat.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
config({ path: resolve(packageRoot, '.env') })

// CLI entry point — wires commander subcommands and routes to handlers.
//
// Execution chain:
//   cruciblebuild init → runInit → project-scaffolder, prompt-renderer
//   cruciblebuild chat → runChat → ChatRepl → stubStream (Phase 4) / AgentLoop (Phase 5)

const program = new Command()

program.name('cruciblebuild').description('Project-based technical mentorship CLI').version('1.0.0')

program
  .command('init')
  .description('Initialise CrucibleBuild in the current project directory')
  .action(async () => {
    await runInit()
  })

program
  .command('chat')
  .description('Start a mentorship chat session')
  .action(async () => {
    await runChat()
  })

program.parseAsync(process.argv)
