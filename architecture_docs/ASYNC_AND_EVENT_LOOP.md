# Async and the Event Loop

## The Mental Model

JavaScript is single-threaded. There is one thread, and it runs one thing at a time. The event loop is the mechanism that makes it feel concurrent — it queues up work and processes it one piece at a time, yielding between tasks so nothing blocks.

The practical consequence: you never wait. Instead of blocking a thread until an operation finishes, you register a callback or await a promise, and the runtime calls you back when the result is ready. While you're waiting, the thread is free to do other work.

---

## Why This Matters for a Harness

A harness like CrucibleBuild is almost entirely I/O:

- Waiting for the user to type (readline)
- Waiting for the LLM API to respond (HTTP)
- Watching the filesystem for changes (chokidar)

None of these block the thread. They register interest in an event and yield. When the event fires — a line is entered, tokens arrive, a file changes — the runtime calls back into your code. This is why JS/TS is a natural fit for this kind of tool.

---

## Callbacks

The original model. Pass a function to be called when something happens.

```
readline.on('line', (line) => {
  // called every time the user hits Enter
})
```

The function is not called now. It is registered and called later, by the event loop, when the event fires. This is the foundation everything else is built on.

---

## Promises

A Promise is an object that represents the eventual result of an async operation. It has three states: pending, fulfilled, rejected.

```
const promise = doSomethingAsync()
// promise is pending

promise.then((result) => {
  // called when fulfilled
})
```

You can create a Promise manually when you need to wrap event-based code:

```ts
return new Promise((resolve) => {
  rl.on('close', () => {
    resolve()  // fulfills the promise — whoever awaited this can continue
  })
})
```

`resolve` is provided by the runtime. Calling it is the button that fulfills the Promise. This pattern appears in `ChatRepl.start()` — readline works through events, not return values, so a Promise wraps it to make it awaitable.

---

## async / await

Syntactic sugar over Promises. `async` marks a function as returning a Promise. `await` pauses execution inside that function until the Promise resolves, without blocking the thread.

```ts
async function sendMessage(input: string): Promise<void> {
  await agentLoop.chat(input, onDelta)  // waits here, thread is free
  renderMarkdown(fullText)              // runs after chat() resolves
}
```

Without `await`, `renderMarkdown` would run immediately before `chat()` finished. With `await`, it waits for the right moment without blocking anything else.

The rule: you can only `await` inside an `async` function. This is why making one function async tends to propagate up the call chain — callers need to `await` it, so they need to be `async` too.

---

## void

When you call an async function but don't want to `await` it — fire and forget — you use `void` to explicitly discard the Promise:

```ts
void this.sendMessage('Session started.')
```

Without `void`, TypeScript warns about an unhandled Promise. `void` signals intentionality: "I know this is async, I'm not awaiting it."

---

## The Closure Connection

Closures and async interact in a specific way that matters in this codebase. In `chat.ts`, `dynamicSystem` is defined as a closure:

```ts
const dynamicSystem = (): string => {
  return renderDynamic(contextStore.getFileTree(), ...)
}
```

The closure captures `contextStore` by reference. Every time `AgentLoop` calls `dynamicSystem()` — once per turn, inside the `while(true)` loop — it executes fresh and reads the current state of `contextStore`. The file watcher has been mutating `contextStore` in the background between turns. The closure sees the latest state because it holds a reference to the object, not a snapshot of its data.

This is closures and async working together: a long-running async loop (the agent turn cycle) reading live data via a closure that was set up once at startup.

---

## How It All Fits in CrucibleBuild

```
cruciblebuild chat
  → runChat() sets up all dependencies
  → await repl.start()
      → await orientLearner()        — async: waits for opening brief
      → return new Promise(resolve)  — wraps readline event loop
          → rl.on('line', ...)       — callback: fires on each Enter
              → await sendMessage()  — async: waits for LLM response
                  → await agentLoop.chat()
                      → while(true)
                          → await client.stream()   — async: waits for API
                          → if tool calls: execute, loop
                          → else: break
          → rl.on('close', resolve)  — callback: fulfills the Promise on exit
```

The thread is never blocked. It yields at every `await`, processes other events (file watcher, etc.), and resumes when the awaited operation completes.
