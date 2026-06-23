# Execution Flow — `cruciblebuild chat`

## 1. `cli/chat.ts` — Setup

- Reads and validates `.cruciblebuild/config.json` via Zod (`ProjectConfigSchema`)
- Loads `luthorDefaultProfile` (the constraint profile + phase catalog)
- Reads `mentor_charter.md` off disk from the package root
- Creates `ContextStore` with the current phase ID, calls `refreshFileTree()` to snapshot the learner's files
- Starts `FileWatcher` — from this point on, any file the learner saves pushes an event into the context store's ring buffer
- Calls `renderPrompt()` once to build `staticSystem` — this is built now and never rebuilt
- Defines `dynamicSystem` as a closure — called fresh every turn so file tree and recent changes are always current
- Creates the inference client (`AnthropicClient` or `GeminiClient` depending on env)
- Constructs `AgentLoop` with the client, both system prompt pieces, and `ToolHandlerDeps`
- Hands off to `ChatRepl` and awaits it

---

## 2. `tui/chat-repl.ts` — The REPL

- Opens a `readline` interface on stdin/stdout, loads command history from `.cruciblebuild/state/history`
- Prints the welcome banner and shows the prompt
- Sits in Node's readline event loop — no explicit `while`. Each Enter fires `handleLine()`
- `handleLine()` checks for paste mode, multiline `\` continuation, slash commands, or a plain message
- Slash commands (`/phase`, `/files`, `/clear`, `/exit`) are handled locally without touching the agent
- Plain messages go to `sendMessage()`

---

## 3. `tui/chat-repl.ts` → `agent/agent-loop.ts` — Per-turn cycle

- `sendMessage()` starts the spinner on stderr, then calls `agentLoop.chat(input, onDelta)`
- Inside `agentLoop.chat()`: pushes the user message onto `history`, then enters a `while(true)` loop:
  - Assembles the full API request: `staticSystem`, fresh `dynamicSystem()`, full `history`, `toolRegistry`
  - Calls `client.stream(request, onDelta)` — tokens stream back, `onDelta` accumulates them in `fullText`
  - If response has no tool calls: pushes assistant text to history, breaks out of the loop
  - If response has tool calls: pushes the tool call turn to history, executes each tool via `executeTool()`, pushes tool results back to history, loops again — LLM gets the results and produces its next response
- Back in `sendMessage()`: spinner stops, `renderMarkdown(fullText)` is printed to stdout in one shot, prompt is shown again

---

## 4. `services/prompt-renderer.ts` — What the LLM actually sees

- `staticSystem` (built once, cached): persona + constraint rules table + project summary + full phase catalog + mentor charter
- `dynamicSystem` (rebuilt every turn): current phase detail (goals, checkpoints, concepts) + file tree snapshot + recent file changes

---

## Key Architectural Points

- The REPL has no knowledge of the LLM — it just calls `agentLoop.chat()` and gets a stream
- The agent loop has no knowledge of the terminal — it just calls `client.stream()` and dispatches tools
- The file watcher runs independently the whole time — the context store is updated by file events, and `dynamicSystem()` picks up those changes on the next turn automatically
- `staticSystem` is stable for the whole session so the Anthropic cache key never busts mid-conversation
