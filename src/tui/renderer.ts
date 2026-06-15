import chalk from 'chalk'
import { renderMarkdown } from './markdown.js'

export { renderMarkdown }

/** Renders the user's message label. */
export const renderUserLabel = (): string => chalk.bold.green('You')

/** Renders the mentor label. */
export const renderMentorLabel = (): string => chalk.bold.cyan('Mentor')

/** Renders an error message in red. */
export const renderError = (message: string): string => chalk.red(`Error: ${message}`)

/** Renders a dim status/info line. */
export const renderStatus = (message: string): string => chalk.dim(message)

/** Renders a spinner frame character with dim styling. */
export const renderSpinner = (frame: string): string => chalk.dim(frame)
