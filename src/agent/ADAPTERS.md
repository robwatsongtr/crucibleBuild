# Inference Adapters

The adapters are what translate between the generic `InferenceClient` interface and the specific SDKs.

## The problem they solve

`AgentLoop` needs to talk to an LLM but shouldn't care which one. So it only knows about `InferenceClient`:

```ts
interface InferenceClient {
  stream(request: InferenceRequest, onDelta: (text: string) => void): Promise<InferenceResponse>
}
```

`AnthropicClient` and `GeminiClient` both implement that interface, but internally they do completely different things.

## What each adapter does

When `stream()` is called, the adapter has to:

1. **Convert the messages array** — our `InferenceMessage[]` uses a generic shape. Anthropic wants `TextBlockParam`, `ToolUseBlockParam`, `ToolResultBlockParam`. Gemini wants `Content[]` with `parts` arrays containing `functionCall` and `functionResponse` objects. The `toAnthropicMessages` and `toGeminiContents` functions handle this translation.

2. **Convert the tool definitions** — our `ToolDefinition` has `inputSchema`. Anthropic wants `input_schema`. Gemini wants `parametersJsonSchema` inside a `FunctionDeclaration`.

3. **Send the request** — Anthropic uses `client.messages.stream()`. Gemini uses `client.models.generateContentStream()`. Completely different APIs.

4. **Collect the streaming response** — Anthropic fires a `text` event per chunk. Gemini returns an async generator you iterate over. Both call `onDelta(chunk)` as text arrives so the TUI sees tokens in real time.

5. **Normalize the response** — both return an `InferenceResponse` with `text` and `toolCalls` in the same shape. `AgentLoop` never sees anything provider-specific.

## The Anthropic-specific extra — prompt caching

Anthropic supports caching the system prompt so it doesn't get re-billed on every turn. The adapter sets `cache_control: { type: 'ephemeral' }` on the `staticSystem` block. That tells Anthropic to cache it after the first turn, and subsequent turns get a cache hit — cheaper and faster. Gemini doesn't support this on the free tier, so the Gemini adapter just omits it entirely.

## The factory (`create-inference-client.ts`)

Reads `CRUCIBLEBUILD_PROVIDER` from the environment and constructs the right one:

```
CRUCIBLEBUILD_PROVIDER=anthropic  →  new AnthropicClient()   (default)
CRUCIBLEBUILD_PROVIDER=gemini     →  new GeminiClient()
```

`AgentLoop` calls `createInferenceClient()` and gets back an `InferenceClient` — it never knows which concrete class it got.

## Adding a new provider

Any provider not already supported needs its own adapter implementing `InferenceClient`. Add the file, then add a case to `create-inference-client.ts`.

### OpenAI-compatible providers (Groq, Together, Ollama, DeepSeek, OpenAI)

Many providers implement the OpenAI Chat Completions API. Rather than writing a separate adapter per provider, one `OpenAICompatClient` can cover all of them — parameterized by base URL and API key:

```ts
// src/agent/openai-compat-client.ts
import OpenAI from 'openai'

export class OpenAICompatClient implements InferenceClient {
  constructor(
    private readonly baseURL: string,   // e.g. 'https://api.groq.com/openai/v1'
    private readonly apiKey: string,
    private readonly model: string,
  ) {}
  // ...
}
```

Provider presets using this adapter:

| Provider  | Base URL                          | Free tier |
|-----------|-----------------------------------|-----------|
| Groq      | `https://api.groq.com/openai/v1`  | Yes — rate limited, Llama/Mixtral/Gemma |
| Ollama    | `http://localhost:11434/v1`        | Free — runs locally, no API key needed |
| OpenAI    | `https://api.openai.com/v1`        | No — but `gpt-4o-mini` is cheap |
| Together  | `https://api.together.xyz/v1`      | Small free credit on signup |
| DeepSeek  | `https://api.deepseek.com/v1`      | No — but very cheap per token |

To add one of these, install the `openai` npm package, write `openai-compat-client.ts`, and add cases to `create-inference-client.ts` for each provider name.
