import chalk from 'chalk'
import { existsSync } from 'fs'
import { getPaths } from '../config/paths.js'
import { ChatRepl } from '../tui/chat-repl.js'

/** Runs cruciblebuild chat in the current working directory. */
export const runChat = async (): Promise<void> => {
  const cwd = process.cwd()
  const paths = getPaths(cwd)

  if (!existsSync(paths.configFile)) {
    console.log(chalk.red('No .cruciblebuild/config.json found.'))
    console.log(chalk.dim('Run `cruciblebuild init` first.'))
    process.exit(1)
  }

  const repl = new ChatRepl(cwd)

  await repl.start()
}
