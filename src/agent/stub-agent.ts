/**
 * Stub agent used in Phase 4 to exercise the TUI before the real AgentLoop
 * is wired in Phase 5. Streams a canned response with a fake tool-use turn.
 */

export interface StubTurn {
  text: string
  simulatedToolUse?: { tool: string; result: string }
}

const CANNED_TOOL_USE: StubTurn = {
  text: "I can see your project files. Let me check what you've been working on.",
  simulatedToolUse: {
    tool: 'list_directory',
    result: 'Listed project root — found source files.',
  },
}

const CANNED_REPLY =
  "That's a good question. Think about what data structure best represents a token — what two pieces of information does every token need to carry? Check `luthor_curriculum/tokens.md` for the full breakdown."

/**
 * Simulates a streaming agent response by calling onDelta for each word,
 * then resolving with the full response text.
 *
 * SEND/RECEIVE: input is the user message (send). onDelta is called once per
 * word chunk as the response is "streamed" (receive). The caller writes each
 * chunk to stdout immediately — this produces the typewriter effect.
 *
 * On the first turn, includes a simulated tool-use round-trip.
 * In Phase 5 this is replaced by AgentLoop.stream(input, onDelta).
 */
export const stubStream = async (
  input: string,
  turnIndex: number,
  onDelta: (text: string) => void,
): Promise<string> => {
  const isFirstTurn = turnIndex === 0
  const turn = isFirstTurn ? CANNED_TOOL_USE : null
  const replyText = turn?.text ?? CANNED_REPLY

  if (turn?.simulatedToolUse) {
    await streamWords(`[tool: ${turn.simulatedToolUse.tool}] `, onDelta)
    await streamWords(`${turn.simulatedToolUse.result}\n\n`, onDelta)
  }

  await streamWords(replyText, onDelta)

  const suffix = `\n\n_(stub agent — input was: "${input.slice(0, 40)}")_`
  await streamWords(suffix, onDelta)

  return replyText + suffix
}

const streamWords = async (text: string, onDelta: (chunk: string) => void): Promise<void> => {
  const words = text.split(' ')

  for (const word of words) {
    onDelta(word + ' ')
    await delay(30)
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
