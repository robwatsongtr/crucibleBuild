# History and the Turn Cycle

## The Core Question

How does a stateful conversation work on a stateless API? The LLM has no memory between calls. Every turn, the client reconstructs the full conversation and sends it again. `this.history` in `AgentLoop` is what holds that state.

---

## Where History Lives

`agent-loop.ts` — `private readonly history: InferenceMessage[] = []`

It's an in-memory array on the `AgentLoop` instance. It starts empty and grows with every turn. It is never persisted to disk — when the session ends, it's gone.

---

## What Gets Pushed onto History

There are three distinct push calls inside `chat()`, one per message type:

**1. User message** — at the start of every turn:
```
{ role: 'user', content: 'what should I work on next?' }
```

**2. Assistant response** — either a text response or a list of tool calls:
```
// text response
{ role: 'assistant', content: 'You have tokens.py but no lexer.py yet...' }

// tool call response
{ role: 'assistant', content: [
  { id: 'tool_abc123', name: 'list_directory', input: { path: '.' } }
]}
```

**3. Tool results** — pushed as a user turn (the API's convention):
```
{ role: 'user', content: [
  { toolCallId: 'tool_abc123', content: '{"entries":[...]}' }
]}
```

Tool results are `role: 'user'` not `role: 'assistant'` — the model emits tool calls, and the client feeds results back as if they were the user responding.

---

## A Sample History After One Tool-Using Turn

```
[
  { role: 'user',      content: 'what should I work on next?' },
  { role: 'assistant', content: [{ id: 'tool_abc123', name: 'list_directory', input: { path: '.' } }] },
  { role: 'user',      content: [{ toolCallId: 'tool_abc123', content: '{"entries":[...]}' }] },
  { role: 'assistant', content: 'You have tokens.py but no lexer.py yet...' },
  { role: 'user',      content: 'ok I started the lexer' },
  { role: 'assistant', content: 'Good. What have you implemented so far?' }
]
```

---

## How History Becomes the API Payload

At the top of the `while(true)` loop in `chat()`, the request is assembled fresh every iteration:

```ts
const request = {
  staticSystem: this.options.staticSystem,
  dynamicSystem: this.options.dynamicSystem(),
  messages: [...this.history],
  tools: toolRegistry,
}
```

The full history is spread into `messages` on every call. The API sees the entire conversation from the beginning every time — that's what makes the model appear to have memory.

---

## The Turn Loop

The `while(true)` loop runs until the model produces a plain text response:

1. Assemble request with current history
2. Call `client.stream(request, onDelta)` — tokens arrive via callback, full response returned when done
3. If no tool calls → push assistant text to history, break
4. If tool calls → push tool call turn, execute each tool, push tool results, loop back to step 1

The loop can execute multiple iterations in a single user turn if the model makes several tool calls before giving its final response.

---

## The Types

Defined in `agent/inference-client-types.ts`:

- `InferenceMessage` — `{ role: 'user' | 'assistant', content: string | ToolCall[] | ToolResult[] }`
- `ToolCall` — `{ id, name, input }`
- `ToolResult` — `{ toolCallId, content }`
- `InferenceClient` — interface with `stream(request, onDelta): Promise<InferenceResponse>`
- `InferenceResponse` — `{ text: string, toolCalls: ToolCall[] }`

The `content` field on `InferenceMessage` is a union — it holds a plain string for text turns, a `ToolCall[]` for tool-calling turns, or a `ToolResult[]` for tool result turns.
