import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { ProjectConfig } from '../models/index.js'
import { ProjectConfigSchema } from '../schemas/project-config.js'
import { getPaths } from '../config/paths.js'
import { DEFAULT_PROFILE_ID, DEFAULT_PHASE_ID } from '../config/constants.js'

const CRUCIBLEBUILD_README = `# .cruciblebuild/

This directory is managed by CrucibleBuild.

- \`config.json\` — project config and contract acknowledgement. Commit this.
- \`state/\` — session state (history, etc). Do not commit this.
`

const GITIGNORE_BLOCK = `
# CrucibleBuild session state
.cruciblebuild/state/
`

/** Returns true if .cruciblebuild/config.json already exists in the given root. */
export const isInitialised = (projectRoot: string = process.cwd()): boolean =>
  existsSync(getPaths(projectRoot).configFile)

/** Returns true if a .git directory exists at the project root — used to warn, not block. */
export const hasGitRepo = (projectRoot: string = process.cwd()): boolean =>
  existsSync(join(projectRoot, '.git'))

/** Returns true if the given directory contains python_luthor/ and cpp_luthor/ — i.e. it's a my_luthor/ project dir, not the repo root above it. */
export const isLuthorProjectRoot = (projectRoot: string = process.cwd()): boolean =>
  existsSync(join(projectRoot, 'python_luthor')) && existsSync(join(projectRoot, 'cpp_luthor'))

/**
 * Writes .cruciblebuild/ directory structure, config.json, README.md,
 * and updates .gitignore. Returns the validated config that was written.
 */
export const scaffold = (projectRoot: string = process.cwd()): ProjectConfig => {
  const paths = getPaths(projectRoot)

  mkdirSync(paths.crucibleDir, { recursive: true })
  mkdirSync(paths.stateDir, { recursive: true })

  const config = buildConfig()

  writeConfig(paths.configFile, config)
  writeReadme(paths.readmeFile)
  updateGitignore(projectRoot)

  return config
}

/**
 * Reads and validates config.json. Throws if missing or invalid.
 * Used by the chat command to verify init has been run.
 */
export const loadConfig = (projectRoot: string = process.cwd()): ProjectConfig => {
  const paths = getPaths(projectRoot)

  if (!existsSync(paths.configFile)) {
    throw new Error('No .cruciblebuild/config.json found. Run `cruciblebuild init` first.')
  }

  const raw = JSON.parse(readFileSync(paths.configFile, 'utf-8')) as unknown
  const result = ProjectConfigSchema.safeParse(raw)

  if (!result.success) {
    throw new Error(`Invalid config.json: ${result.error.message}`)
  }

  return result.data
}

const buildConfig = (): ProjectConfig => {
  return {
    profileId: DEFAULT_PROFILE_ID,
    projectSlug: 'luthor',
    currentPhaseId: DEFAULT_PHASE_ID,
  }
}

const writeConfig = (configFile: string, config: ProjectConfig): void => {
  writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}

const writeReadme = (readmeFile: string): void => {
  writeFileSync(readmeFile, CRUCIBLEBUILD_README, 'utf-8')
}

const updateGitignore = (projectRoot: string): void => {
  const gitignorePath = join(projectRoot, '.gitignore')

  if (existsSync(gitignorePath)) {
    const existing = readFileSync(gitignorePath, 'utf-8')

    if (existing.includes('.cruciblebuild/state/')) {
      return
    }

    writeFileSync(gitignorePath, existing + GITIGNORE_BLOCK, 'utf-8')
  } else {
    writeFileSync(gitignorePath, GITIGNORE_BLOCK.trimStart(), 'utf-8')
  }
}
