import chalk from 'chalk'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getPaths } from '../config/paths.js'
import { ProjectConfigSchema } from '../schemas/project-config.js'
import { luthorDefaultProfile } from '../profile/luthor.default.js'
import { renderPrompt } from '../services/prompt-renderer.js'
import { ContextStore } from '../services/context-store.js'
import { FileWatcher } from '../services/file-watcher.js'
import { createInferenceClient } from '../agent/create-inference-client.js'
import { AgentLoop } from '../agent/agent-loop.js'
import { ChatRepl } from '../tui/chat-repl.js'

//************************************************************* */
/** Runs cruciblebuild chat in the current working directory.   */
// ************************************************************ */
export const runChat = async (): Promise<void> => {
  const cwd = process.cwd()
  const paths = getPaths(cwd)

  if (!existsSync(paths.configFile)) {
    console.log(chalk.red('No .cruciblebuild/config.json found.'))
    console.log(chalk.dim('Run `cruciblebuild init` first.'))
    process.exit(1)
  }

  const config = ProjectConfigSchema.parse(JSON.parse(readFileSync(paths.configFile, 'utf-8')))

  // Only Luthor profile supported at MVP
  const profile = luthorDefaultProfile

  // Curriculum lives at the package root, not the learner's cwd
  // this resolves from the compilation location which is dist/cli hece the .. / ..
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const curriculumRoot = resolve(packageRoot, 'luthor_curriculum')
  const mentorCharter = readFileSync(resolve(curriculumRoot, 'mentor_charter.md'), 'utf-8')

  //
  // ContextStore and FileWatcher are wired together — watcher pushes events into the store
  //
  const contextStore = new ContextStore(cwd, config.currentPhaseId)
  contextStore.refreshFileTree()

  const watcher = new FileWatcher(cwd, contextStore, profile.project.watchPaths)
  watcher.start()

  // Static system prompt built once — stable across the session for caching
  const { staticSystem } = renderPrompt(
    profile,
    {
      projectSlug: config.projectSlug,
      currentPhaseId: config.currentPhaseId,
      fileTree: contextStore.getFileTree(),
      recentChanges: contextStore.getRecentChanges(),
      acknowledgedContractAt: config.contract.acknowledgedAt,
    },
    mentorCharter,
  )

  // Dynamic system prompt re-evaluated per turn so file tree and recent changes stay fresh
  // This works because it's a closure over contextStore
  const dynamicSystem = (): string => {
    const { dynamicSystem: ds } = renderPrompt(
      profile,
      {
        projectSlug: config.projectSlug,
        currentPhaseId: config.currentPhaseId,
        fileTree: contextStore.getFileTree(),
        recentChanges: contextStore.getRecentChanges(),
        acknowledgedContractAt: config.contract.acknowledgedAt,
      },
      mentorCharter,
    )

    return ds
  }

  const client = createInferenceClient()

  const agentLoop = new AgentLoop(client, {
    staticSystem,
    dynamicSystem,
    deps: {
      projectRoot: cwd,
      contextStore,
      profile,
      config,
    },
  })

  const repl = new ChatRepl(cwd, agentLoop)
  await repl.start()

  watcher.stop()
}
