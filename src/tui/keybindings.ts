export type SlashCommand = '/exit' | '/clear' | '/phase' | '/files'

export interface SlashCommandResult {
  command: SlashCommand
  handled: true
}

export interface NotACommand {
  handled: false
}

export type DispatchResult = SlashCommandResult | NotACommand

const SLASH_COMMANDS: SlashCommand[] = ['/exit', '/clear', '/phase', '/files']

/**
 * Checks whether the input is a recognised slash command.
 * Returns the matched command if so, or `handled: false` if it's regular input.
 */
export const dispatchSlashCommand = (input: string): DispatchResult => {
  const trimmed = input.trim() as SlashCommand

  if (SLASH_COMMANDS.includes(trimmed)) {
    return { command: trimmed, handled: true }
  }

  return { handled: false }
}

/** Returns the list of all recognised slash commands. */
export const listSlashCommands = (): SlashCommand[] => [...SLASH_COMMANDS]
