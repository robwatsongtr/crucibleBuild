import chalk from 'chalk'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { renderMarkdown } from '../tui/markdown.js'
import { luthorDefaultProfile } from '../profile/luthor.default.js'
import { isInitialised, hasGitRepo, scaffold } from '../services/project-scaffolder.js'

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../')

const renderMd = (text: string): string => renderMarkdown(text)

const buildWelcomeMarkdown = (): string => {
  const overviewPath = resolve(REPO_ROOT, 'luthor_curriculum/luthor_overview.md')
  const overview = readFileSync(overviewPath, 'utf-8')
  const { persona, rules } = luthorDefaultProfile

  const allowed = rules
    .filter((r) => r.allowed)
    .map((r) => `- ✅ **${r.label}** — ${r.description}`)
    .join('\n')

  const disallowed = rules
    .filter((r) => !r.allowed)
    .map((r) => `- ❌ **${r.label}** — ${r.description}`)
    .join('\n')

  return [
    overview,
    `## Your Mentor\n\n${persona.voice}`,
    `## What the mentor can do\n\n${allowed}`,
    `## What the mentor will not do\n\n${disallowed}`,
  ].join('\n\n')
}

/** Runs cruciblebuild init in the current working directory. */
export const runInit = async (): Promise<void> => {
  const cwd = process.cwd()

  if (isInitialised(cwd)) {
    console.log(chalk.yellow('Already initialised. Delete .cruciblebuild/ to re-run init.'))
    return
  }

  if (!hasGitRepo(cwd)) {
    console.log(chalk.yellow('Warning: no .git directory found. Are you in a project root?'))
    console.log()
  }

  console.log('\n' + chalk.bold.cyan('=== CrucibleBuild ===') + '\n')
  console.log(renderMd(buildWelcomeMarkdown()))

  const config = scaffold(new Date().toISOString(), cwd)

  console.log(chalk.green('✓ Initialised .cruciblebuild/'))
  console.log(chalk.dim(`  Profile:     ${config.profileId}`))
  console.log(chalk.dim(`  Project:     ${config.projectSlug}`))
  console.log(chalk.dim(`  Start phase: ${config.currentPhaseId}`))
  console.log()
  console.log(chalk.cyan('Run `cruciblebuild chat` to begin.'))
}
