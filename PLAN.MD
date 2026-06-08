# CrucibleBuild MVP — Implementation Plan

## Context

CrucibleBuild is a project-based technical mentorship CLI. The learner runs it in a project directory; it watches files, holds context of what they've written, and chats with them in the terminal. The mentor is constrained by a **constraint profile** — architecturally, it cannot write code or give solutions. It can give architecture, point at concepts, answer questions, give feedback on code the learner wrote, and look up syntax.

The repository today is documentation and reference curriculum (Luthor, in `python_luthor/` and `cpp_luthor/`). No app code exists. This plan covers building the MVP from scratch.

**Locked decisions before planning:**
- **TypeScript / Node stack** 
- **Core loop only — 5 phases**. Phase synthesis docs and packaging deferred.
- **Terminal-only chat for MVP**. No web UI, no React, no local server. Audience lives in the terminal (Claude Code is the precedent). Web UI deferred.
- **One constraint profile for MVP** — the Luthor default the founder actually used. "Profile" is an *internal* architectural concept (schemas + renderer) so multi-profile support is trivial later. The learner does not pick at init — they're shown the contract and must explicitly acknowledge it.
- **Profile pieces defined as Zod schemas** and assembled into the system prompt by a renderer.

---

## Stack & Tooling

- **Runtime**: Node ≥20, TypeScript strict, ESM.
- **Validation**: `zod` for every structured data shape.
- **Test**: `vitest`.
- **Lint/format**: ESLint + Prettier; husky + lint-staged per `PRE_COMMIT_SETUP.MD`.
- **CLI framework**: `commander` (small, stable, clean subcommands for `init` and `chat`).
- **Filesystem watcher**: `chokidar` (de-facto Node standard, debounced, cross-platform).
- **Terminal chat**: `readline` + `chalk` + `marked` + `marked-terminal`. **No Ink** — Ink earns its keep with rich layouts; MVP is a scroll-back REPL with streamed tokens and rendered code blocks, which `readline` does with zero ceremony. Revisit if we add split panes.
- **Anthropic SDK**: `@anthropic-ai/sdk`, streaming via `client.messages.stream`, tool-use loop driven manually. Use latest Opus model id at build time.
- **Logger**: stderr-only `Logger` class. No `console.log` anywhere — the TUI owns stdout.

---

## Repository Layout

```
src/
  cli/
    index.ts                # bin entry, wires commander
    init.ts                 # `cruciblebuild init`
    chat.ts                 # `cruciblebuild chat`
  schemas/                  # zod schemas only
    constraint-rule.ts
    persona.ts
    project-definition.ts
    learner-context.ts
    constraint-profile.ts   # composes the above
    project-config.ts       # on-disk .cruciblebuild/config.json shape
    agent-tool-io.ts        # tool input/output schemas
  models/index.ts           # re-exported inferred types
  services/
    profile-loader.ts
    prompt-renderer.ts      # static/dynamic split that drives caching
    project-scaffolder.ts   # all init filesystem writes
    file-watcher.ts         # chokidar wrapper + ring buffer
    context-store.ts        # in-memory snapshot
    fs-reader.ts            # sandboxed read_file / list_directory
  agent/
    anthropic-client.ts     # SDK wrapper; model + cache config in one place
    tool-registry.ts        # tool declarations to the SDK
    tool-handlers.ts        # tool execution against services/
    agent-loop.ts           # streaming + tool_use turn loop
  tui/
    chat-repl.ts            # readline loop
    renderer.ts             # markdown → ANSI, spinner
    keybindings.ts          # slash commands
  config/
    constants.ts            # paths, debounce ms, model id, cache breakpoints
    paths.ts                # resolves .cruciblebuild/ in cwd
  profile/
    luthor.default.ts       # the single MVP profile
    fragments/              # persona/rules/project string fragments
  logging/logger.ts         # stderr-only
  index.ts                  # library entry for tests
tests/                      # mirrors src/
bin/cruciblebuild           # shebang → dist/cli/index.js
```

---

## Phase 1 — Constraint Profile / System Prompt

**The core IP. Everything else is scaffolding around this.**

Deliverables:
- Zod schemas for every piece of a constraint profile.
- The Luthor default profile as a typed module in `src/profile/luthor.default.ts` (JSON-on-disk profiles deferred; schemas make adding it trivial).
- A `PromptRenderer` class that takes a validated `ConstraintProfile` + runtime `LearnerContext` and returns `{ staticSystem, dynamicSystem }`. The split is what makes prompt caching work.
- Vitest snapshot tests.

Schemas in `src/schemas/`:
- `ConstraintRuleSchema` — `{ id, label, allowed: boolean, description, examples? }`. Renderer groups by `allowed` into the ✅/❌ tables from `constraint_profile.md`.
- `PersonaSchema` — `{ name, voice, tone[], firmnessExamples[], antiPatterns[] }`. Encodes "firm but genuinely helpful, not a lobotomized refuser."
- `ProjectDefinitionSchema` — `{ slug, title, summary, language, phases: PhaseSchema[], referenceArtifacts[] }`.
- `PhaseSchema` — `{ id, title, goals[], checkpoints[], conceptsIntroduced[] }`.
- `LearnerContextSchema` (runtime) — `{ projectSlug, currentPhaseId, fileTree, recentChanges, acknowledgedContractAt }`.
- `ConstraintProfileSchema` — composes persona, rules, project.
- `ProjectConfigSchema` — what `init` writes: `{ profileId, projectSlug, currentPhaseId, contract: { acknowledgedAt, version } }`.

**Luthor curriculum phase order** (sourced from `luthor_curriculum/luthor_project.md`, encoded into `src/profile/luthor.default.ts`):

**Pass 1 — Python**
1. `python-tokens` — token enum and `Token` class; no dependencies
2. `python-lexer` — character-by-character traversal; produces tokens
3. `python-nodes` — AST node types; pure data structures
4. `python-parser` — recursive descent; consumes tokens, constructs nodes
5. `python-interpreter` — tree-walking `isinstance` dispatch; evaluates AST

**Pass 2 — C++ Rewrite**
6. `cpp-tokens` — `enum class TokenType`, `Token` struct; scoped enums
7. `cpp-lexer` — same logic as Python, explicit memory; `peek()` / `advance()`
8. `cpp-nodes` — `unique_ptr` children, virtual destructor, `accept(Visitor&)`, `Visitor` struct with pure virtual `visit()` per node type
9. `cpp-parser` — returns `unique_ptr<ASTNode>`; move semantics; `consume()`, `block()`
10. `cpp-interpreter` — inherits `Visitor`; `result` side-channel; `std::variant<double, bool>`; `static const` op maps; `Runner` class

Each phase is a `PhaseSchema` entry with its own goals, checkpoints, and concepts introduced. At `init`, the current phase is printed to the terminal and a `CURRICULUM.md` is written into the learner's project dir with the full breakdown. The `/phase` slash command shows current phase + what's next.

Renderer:
- Static system prompt = persona + rules tables + project + phase catalog + mentor charter. Stable across the session — this is what we cache.
- Dynamic addendum = current phase, file-tree summary, recent-changes window. Passed as a second system block so it never busts the cache key.

Verification:
- Unit: schemas reject malformed input; renderer matches snapshot; `staticSystem` is byte-stable across two renders with different `LearnerContext`.

---

## Phase 2 — CLI Init + Project Setup

Deliverables:
- `cruciblebuild init` (commander subcommand):
  1. Confirms cwd is a sensible project root (warn if no `.git`).
  2. Prints the rendered constraint contract (rules tables + persona summary).
  3. Requires the learner to type a literal acknowledgement phrase (e.g. `I accept`) at a `readline` prompt. No `--yes` bypass at MVP — this is the "negotiation moment" from `constraint_profile.md`.
  4. Writes `.cruciblebuild/config.json` (validated through `ProjectConfigSchema`) with acknowledgement timestamp + profile version hash.
  5. Writes `.cruciblebuild/README.md` explaining the directory.
  6. Updates `.gitignore` to ignore `.cruciblebuild/state/` but commit `config.json`.
- `ProjectScaffolder` class owns all filesystem writes; CLI command is a thin wrapper.

Verification:
- Unit: scaffolder writes into a temp dir; assert file contents and schema validity.
- Manual: `cruciblebuild init` in a fresh dir; confirm `config.json` round-trips.

---

## Phase 3 — Filesystem Watcher + Context Store

Deliverables:
- `FileWatcher` class wrapping `chokidar` — ignores `node_modules`, `.git`, `.cruciblebuild/state`, dotfiles by default. Respects `.cruciblebuildignore` if present.
- `ContextStore` class maintaining:
  - `fileTree` — lazy-loaded tree, refreshed on `add`/`unlink`, capped depth.
  - `recentChanges` — ring buffer of last 50 events `{ path, kind, at }`, debounced 300ms per path.
  - `currentPhaseId` from `ProjectConfigSchema`.
- `FsReader` class with sandboxed reads — every path resolved and verified inside project root; symlinks rejected; binaries refused; size capped at 256KB with truncation marker.
- Pure services with no SDK dependency yet.

Verification:
- Unit: simulate file events with a temp dir; assert ring buffer behavior.
- Unit: `FsReader` rejects `../escape`, absolute paths outside root, escaping symlinks.

---

## Phase 4 — Terminal Chat Interface

Deliverables:
- `cruciblebuild chat` (default verb) starts the REPL after verifying `.cruciblebuild/config.json` exists.
- `ChatRepl` class on `readline`:
  - Multiline input via trailing `\` or `:paste` toggle.
  - History via readline's built-in, persisted to `.cruciblebuild/state/history`.
  - Streamed assistant tokens to stdout; spinner on stderr while waiting for first token.
  - `Renderer` class: markdown → ANSI via `marked` + `marked-terminal`; `chalk` for role labels and code-block borders.
  - Slash commands: `/exit`, `/clear`, `/phase`, `/files` (in `tui/keybindings.ts`).
- **Phase 4 wires to a stub agent** that echoes input plus a canned tool-use turn, so the TUI is exercised before phase 5.

Verification:
- Manual smoke: type a message, see streaming, see markdown rendered, code blocks colorized.
- Unit: renderer snapshots; slash-command dispatcher routes correctly.

---

## Phase 5 — Agent Loop With File-Aware Tools

Deliverables:
- `AnthropicClient` class — wraps SDK, centralizes model id, max tokens, temperature, cache config.
- `ToolRegistry` declares the four read-only tools with input schemas.
- `ToolHandlers` executes each tool against `FsReader` / `ContextStore`. All handler I/O validated through `agent-tool-io.ts` schemas — request *and* response.
- `AgentLoop` class:
  1. Build messages array (user turn + history).
  2. Build system as a two-block array: `[{ type: 'text', text: staticSystem, cache_control: { type: 'ephemeral' } }, { type: 'text', text: dynamicSystem }]`.
  3. Stream assistant response.
  4. On `tool_use` blocks, execute via `ToolHandlers`, append `tool_result`, loop until a plain text turn.
  5. Hand text deltas to the TUI renderer.
- Replace phase 4's stub with the real `AgentLoop`.

**Tools (read-only, all schemas in `src/schemas/agent-tool-io.ts`):**
- `read_file` — `{ path }` → `{ path, content, truncated, bytes }`. Sandboxed.
- `list_directory` — `{ path, maxDepth? }` → `{ entries: { path, kind, size? }[] }`. Defaults root, depth 2.
- `get_recent_changes` — `{ limit?, since? }` → `{ changes: { path, kind, at }[] }`. From `ContextStore`.
- `get_project_phase` — `{}` → `{ projectSlug, currentPhaseId, phase: { title, goals, checkpoints, conceptsIntroduced } }`.

**No write tools. No shell-exec. No network fetch.** Architectural — the only path to filesystem mutation is the learner's editor.

**Curriculum reference access:**
- `luthor_curriculum/` is installed alongside the package and is readable by the agent via `read_file` and `list_directory`.
- Contains:
  - `language_overview.md` — learner-facing intro; what Luthor is, keywords, example programs, pipeline; printed at `init`, first thing a learner reads
  - `tokens.md` — what tokens are, type + lexeme, why enums; teaching doc for the tokens phase
  - `lexing.md` — state machine model, lookahead, peek/advance pattern, worked trace; teaching doc for the lexer phase
  - `ast_nodes.md` — why a tree instead of direct evaluation, node types, tree shape encodes structure; teaching doc for the nodes phase
  - `trees_and_recursion.md` — pure recursion, tree recursion, mutual recursion, call stack intuition; prerequisite before the parser phase
  - `recursive_descent.md` — EBNF, grammar rules → functions, precedence, worked trace; core teaching doc for the parser phase
  - `interpreter.md` — tree-walking evaluation, isinstance dispatch, symbol table, operator maps, worked trace; teaching doc for the Python interpreter phase
  - `cpp_rewrite_concepts.md` — unique_ptr, variant, ownership, RAII; prerequisite before the C++ rewrite
  - `visitor_pattern.md` — double dispatch, two-dispatch diagram, result side-channel, comparison to Python isinstance; teaching doc for the C++ interpreter phase
  - `mentor_charter.md` — the mentor's behavioural spec: constraint rules, curriculum sequence with file-to-doc mapping, opening brief behaviour, progress inference from filesystem, pacing rules, tone; this becomes the mentor charter fragment in the static system prompt assembled by `PromptRenderer`
  - `main.py` — provided test harness for the Python pass; runs a source string through the full pipeline printing tokens, AST, and output at each stage; learner reads this before starting, runs it after each component
  - `main.cpp` — provided test harness for the C++ pass; takes a `.lut` file as argument, same pipeline output; learner reads this before starting the rewrite
  - `luthor_project.md` — full reference spec for both implementations; component details, design decisions, grammar, token set
- The system prompt tells the agent these docs exist and instructs it to reach for them when answering questions about architecture, concepts, or what to build next — rather than relying solely on its training knowledge.
- The agent does not recite the curriculum verbatim; it uses it as reference to give contextual, depth-appropriate answers based on where the learner actually is.
- **Opening brief**: when `chat` starts, the agent's first turn is pre-populated with current phase + file context, so the learner never faces a blank prompt. The agent opens with a short summary of where they are and what the current goal is.

**Prompt caching strategy:**
- Static block carries `cache_control: { type: 'ephemeral' }`. Dynamic block does not.
- Tool definitions stable across the session (any per-turn jitter busts the cache key).
- Optionally mark the last assistant turn of history with `cache_control` once history grows past a few turns.
- Log `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens` per turn to confirm hits.
- All tuning lives in `config/constants.ts` + `AnthropicClient`.

Verification:
- Unit: `ToolHandlers` against a fixture project; assert sandbox enforcement, truncation, schema validation.
- Unit: `AgentLoop` against a mocked SDK replaying a canned tool-use → tool-result → text sequence.
- Manual: run inside the bundled `python_luthor/` and `cpp_luthor/` reference dirs; confirm the model never produces solution code.
- Observability: log cache hit rates per turn.

---

## Cross-Cutting

- **Testing cadence**: each phase ships with vitest coverage before the next starts (`CLAUDE.MD` workflow rule).
- **Type discipline**: no `any`; `unknown` + zod parse at every external boundary (SDK responses, file contents, JSON on disk).
- **Logging**: one `Logger` class, stderr only, level-gated by `CRUCIBLEBUILD_LOG`. No stray `console.log` — TUI owns stdout.
- **Error surface**: `CrucibleError` base + subtypes (`ProfileLoadError`, `SandboxViolationError`, `AgentToolError`). Top-level CLI handler maps to exit codes.

---

## Curriculum Bundle Pattern

CrucibleBuild is a learning framework. Luthor is the first project. Every project ships as a self-contained curriculum directory — `luthor_curriculum/` is the canonical pattern all future projects follow.

**Required shape for every curriculum directory:**

```
<project>_curriculum/
  language_overview.md     # what the learner is building, why, what it can do
  mentor_charter.md        # constraint rules, phase sequence, file-to-doc mapping, pacing rules
  project_definition.md    # phases with goals, checkpoints, concepts introduced
  <concept>.md             # one teaching doc per major concept (as many as needed)
```

Adding a new project means authoring a new `<project>_curriculum/` directory. The CLI, agent loop, watcher, and TUI are unchanged. The agent reads curriculum docs via `read_file` at runtime — no code changes required to add content.

The `profileId` in `.cruciblebuild/config.json` ties a session to its curriculum bundle. `luthor-default` is the first value. New projects register new ids.

---

## Deferred to Post-MVP

- Phase synthesis docs (`cruciblebuild.md` step 6).
- `npm publish` UX (step 7). For MVP, `npm link` is fine.
- Web UI / local server / React frontend.
- Additional curriculum projects beyond Luthor (e.g. web server, shell, database engine).
- Profile picker at init for multiple registered projects.
- Any write tools, shell-exec, or network-fetch tools.
- Proactive nudges from the watcher (watcher feeds context only at MVP; it does not initiate turns).
- Multi-project / workspace mode.
- Token-budget management beyond prompt caching (compaction, summarization).
- Telemetry / opt-in analytics.

---

## Critical Files

- `src/schemas/constraint-profile.ts` — composed schema everything else keys off.
- `src/services/prompt-renderer.ts` — owns the static/dynamic split that makes caching work.
- `src/profile/luthor.default.ts` — the single MVP profile, the actual product IP.
- `src/agent/agent-loop.ts` — streaming + tool-use turn loop, heart of phase 5.
- `src/services/file-watcher.ts` — chokidar wrapper + ring buffer backing `get_recent_changes`.

---

## End-to-End Verification

After all 5 phases:

1. `npm install && npm link` in the repo.
2. `cd python_luthor` (a real reference project).
3. `cruciblebuild init` — see the contract printed, type `I accept`, confirm `.cruciblebuild/config.json` is written.
4. `cruciblebuild chat` — open a conversation.
5. Edit a file in the project. Ask the mentor about it. Confirm it can read the file via `read_file` and respond with guidance.
6. Ask the mentor to write code for you. Confirm it refuses and redirects to guidance.
7. Check stderr logs: `cache_read_input_tokens` should be non-zero on turn 2+.
8. Run `vitest run` — all phase tests pass.
9. Run `tsc --noEmit` — clean.
