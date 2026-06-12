import { Command } from 'commander'
import { runInit } from './init.js'


// CLI entry point — wires commander subcommands and routes to handlers.
//
// Execution chain:
//   cruciblebuild init
//     → bin/cruciblebuild        (OS entry — shebang + imports dist)
//     → dist/cli/index.js        (this file, compiled)
//     → dist/cli/init.js         (runInit logic)
//     → dist/services/...        (scaffolder, renderer, etc.)

const program = new Command()

program
  .name('cruciblebuild')
  .description('Project-based technical mentorship CLI')
  .version('1.0.0')

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
    console.log('Chat not yet implemented — coming in Phase 4.')
  })

program.parseAsync(process.argv)
