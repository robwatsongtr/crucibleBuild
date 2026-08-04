# Async and the Event Loop

## The Mental Model

JavaScript is single-threaded. There is one thread, and it runs one thing at a time. The event loop is the mechanism that makes it feel concurrent — it queues up work and processes it one piece at a time, yielding between tasks so nothing blocks.

The practical consequence: you never wait. Instead of blocking a thread until an operation finishes, you register a callback or await a promise, and the runtime calls you back when the result is ready. While you're waiting, the thread is free to do other work.

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
