# How the LLM API Works — Context and Caching

## The Core Insight

The LLM is completely stateless. Every API call is a fresh request with zero memory of previous calls. What feels like "memory" or "context" in a conversation is just the client reconstructing the full history and sending it back every single time.

---

## Structure of Every API Call

Every call to the Anthropic API has three distinct parts:

```
{
  system: [ block1, block2 ],   // instructions — never a speaker
  messages: [ ... ],            // the back and forth
  tools: [ ... ]                // functions the model can call
}
```

### 1. System Prompt

Sets the stage. The model treats system instructions with more authority than anything in the messages array. In CrucibleBuild this is split into two blocks:

**Block 1 — Static (cached)**
- Who the mentor is: persona, tone, firmness rules
- The constraint rules table (✅/❌)
- Project summary and reference artifact list
- Full phase catalog (all 10 phases)
- Pointer to mentor_charter.md

This content never changes during a session. It carries `cache_control: { type: 'ephemeral' }`.

**Block 2 — Dynamic (not cached)**
- Current phase detail (goals, checkpoints, concepts)
- File tree snapshot
- Recent file changes

This can change every turn as the learner edits files.

### 2. Messages

The conversation history — every user message and every assistant response, from the beginning of the session. Alternates user/assistant. The full history is resent on every call.

### 3. Tools

Declarations of the functions the model can call (`read_file`, `list_directory`, etc.). Stable across the session.

---

## Prompt Caching

Anthropic's prompt caching stores a prefix of your input tokens server-side for up to 5 minutes. If the next request starts with the same prefix, it's a cache hit — Anthropic skips reprocessing those tokens and charges ~10% of the normal input token cost.

The `cache_control: { type: 'ephemeral' }` marker on Block 1 tells the API to cache everything up to and including that block.

**Cache lifetime:**
- The 5-minute TTL resets on every cache hit
- An active conversation keeps the cache alive indefinitely
- If the learner pauses for more than 5 minutes, the cache expires and the next turn pays full price to rebuild it

**Why the two-block split matters:**
Block 2 changes every turn (file tree, recent changes). If it were part of Block 1, it would bust the cache key on every turn and you'd never get a hit. Separating them means Block 1's cache key is stable for the whole session.

**Turn-by-turn cost:**
- Turn 1: cache miss — full price, cache created
- Turn 2+: cache hit on Block 1 — ~10% cost for that chunk
- After 5 min idle: cache expires, next turn is a miss again

---

## What the PromptRenderer Does

`PromptRenderer` produces the *content* of the two system blocks:

```ts
{ staticSystem: string, dynamicSystem: string }
```

It does not assemble the full API call. That's the `AgentLoop`'s job — it takes those strings, wraps them in the full request structure with `cache_control`, appends the message history and tool definitions, and sends the call.

This separation means the renderer can be unit tested in isolation without touching the SDK.

---

## Tool Use Turns

When the model wants to read a file or check the current phase, it emits a `tool_use` block instead of a text response. The agent loop catches this, executes the tool, appends a `tool_result` turn, and sends back to the model. The model then produces its actual text response.

The learner never sees this exchange — they just see the final answer. From the API's perspective these are just additional turns in the messages array.

---

## The Art

The stateless nature of the API means the "intelligence" of a system like this lives in:

- **What you include** — you can't append forever; at some point history must be summarized or compressed
- **What you put where** — static content at the top caches well; volatile content at the bottom doesn't bust the cache key
- **What the model notices** — a large context window doesn't mean equal attention across it; recency and position matter

CrucibleBuild's file-watching context store feeding into the dynamic block is the product-specific application of this: instead of the learner pasting their code every turn, the agent reads files on demand and always has a current view of the project.
