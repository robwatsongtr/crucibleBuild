import { join } from 'path'
import { CRUCIBLEBUILD_DIR, CONFIG_FILE, STATE_DIR, README_FILE } from './constants.js'

export interface CruciblePaths {
  root: string
  crucibleDir: string
  configFile: string
  stateDir: string
  readmeFile: string
  historyFile: string
}

/** Resolves .cruciblebuild/ paths relative to the given project root. */
export const getPaths = (projectRoot: string = process.cwd()): CruciblePaths => {
  const crucibleDir = join(projectRoot, CRUCIBLEBUILD_DIR)
  const stateDir = join(crucibleDir, STATE_DIR)

  return {
    root: projectRoot,
    crucibleDir,
    configFile: join(crucibleDir, CONFIG_FILE),
    stateDir,
    readmeFile: join(crucibleDir, README_FILE),
    historyFile: join(stateDir, 'history'),
  }
}
