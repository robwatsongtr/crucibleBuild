# CrucibleBuild - Programming Mentorship App

## Foundation Document

## Origin

This product concept emerged from a direct personal experience. The founder — a music teacher and developer  — built a complete interpreted programming language (Luthor) using an inverted AI workflow. Instead of asking Claude to write code, Claude was used as a project mentor: providing architecture, guidance, answering questions, giving feedback on code written by the human — but never writing the code itself.

The result was deeper understanding of tokenizing, recursive descent parsing, AST construction, visitor pattern, smart pointers, and virtual dispatch than years of conventional learning had produced. The project was built twice: first in Python, then rewritten in C++. The C++ rewrite is where everything "extra clicked."

More importantly, because of the struggle and effort, the result was a leveling up in congnitive ability regarding being able to hold complex code, concepts, and connections in mind. This translates directly to improved code reading comprehension and coding ability. 

This experience is the product.

---

## The Core Problem

Until you can implant experience into someone's brain, the only way to get experience is to actually do the task long enough for the proper patterns to get established. There is no other way. You must write programs to understand how to properly use AI to write programs. 

People entering software development now face a fundamental paradox:

- LLMs can write code for you instantly
- Using them that way hollows out the understanding you need to use them well
- You need experience to steer a nondeterministic model effectively
- But LLMs short-circuit the process of getting that experience

The result is developers who can generate code they don't understand, can't debug when it breaks, can't evaluate whether it's good, and can't steer the model when it goes wrong.

The people who are aware of this problem have no structured solution. They know they need to struggle. They don't have a tool designed around that need.

For more experienced developers, it's important to maintain deliberate practice writing code and working through problems by hand. A regular Leetcode practice is a good way to accomplish this, but those problems are small in scope. Building a language, a web server, or a database engine is a much more in depth and fun way to keep your chops up. 

---

## The Insight

The founder's workflow was not "Socratic tutoring" in the academic sense. It was a specific, negotiated **constraint profile** applied to a real project:

- Architecture and structure: ✅
- Pointing toward the right concepts: ✅
- Answering specific questions: ✅
- Import and syntax help: ✅
- Feedback on code written by the human: ✅
- Writing code: ❌
- Giving solutions: ❌

This maps to how a great senior developer mentors a junior — here are the pieces, figure out how they fit together. It is project-shaped, not lesson-shaped. The learner is building something real with a finish line they care about.

The key additional elements that made it work:
- **Just-in-time answers**: curiosity was hot and got fed immediately, at any hour
- **Contextual feedback**: the AI could read actual files, not just descriptions
- **Project the learner chose**: intrinsic motivation drove the whole thing
- **Real checkpoints**: the lexer either tokenizes correctly or it doesn't — comprehension is load-bearing

---


## From Insight to System

This constraint profile isn't a loose set of vibes — it's a structured 
set of rules with a deliberate escalation path for when a learner is 
genuinely stuck, not just looking for a shortcut.

When help is needed, it's calibrated in stages:

1. **Hints** — a nudge toward the right question to ask
2. **Explanations** — clarifying a concept without applying it to the 
   user's code
3. **Custom documentation** — pointing to reference material
4. **Pseudocode** — as a last resort, the logic without the 
   implementation, preserving the translation step where much of 
   the learning happens

The line is never crossed: the AI does not write the user's code, 
and it does not hand over solutions. The escalation exists to 
distinguish *productive struggle* (the kind that builds the patterns 
this whole product is designed around) from *unproductive friction* 
(getting stuck on a typo or an undocumented quirk, which teaches 
nothing and just burns motivation).

The full constraint profile and system prompt design — including how 
this is enforced and how edge cases are handled — is specified 
separately.

---

## The Product

A **project-based technical mentorship tool** — a CLI application that:

1. Is initialized in a project directory
2. Watches the filesystem in real time (using watchdog or equivalent)
3. Maintains live context of what the learner has actually written
4. Pairs that with a chat interface 
5. Has the constraint profile baked in architecturally — it cannot give code, by design
6. Reacts to file changes intelligently — sometimes proactively, mostly waiting for the learner to engage


### Why CLI, not web app

- Target audience lives in the terminal
- Filesystem watching requires local installation
- Claude Code (the closest analogous tool) is npm-installed — precedent is set
- Feels like a serious developer tool, not consumer ed-tech
- Install experience: `npm install -g cruciblebuild` → `cd my-project` → `cruciblebuild init --project lexer`

### Tech Stack (MVP)

- TypeScript / Node (≥20), ESM, `tsc --strict`
- `commander` for CLI subcommands (`init`, `chat`)
- `chokidar` for filesystem watching
- Terminal-only chat interface — `readline` + `chalk` + `marked` + `marked-terminal`. No web UI for MVP.
- `@anthropic-ai/sdk` with streaming and prompt caching (core intelligence)
- `zod` for all structured data; `vitest` for tests; ESLint + Prettier; husky + lint-staged
- Agent loop with read-only filesystem tools: `read_file`, `list_directory`, `get_recent_changes`, `get_project_phase`
- No write tools — the agent observes and responds, never acts on the filesystem

---

## The Curriculum

The first and flagship curriculum project is the **Luthor Language** — a complete interpreted programming language, Turing complete, built in two passes:

**Phase 1: Python**
- Lexer
- Parser (recursive descent)
- AST nodes
- Interpreter (tree-walking visitor)

**Phase 2: C++ Rewrite**
- Same architecture, same project
- Smart pointers, unique_ptr ownership
- Virtual dispatch, vtable
- Visitor pattern with double dispatch
- std::variant for runtime values

The Python pass teaches concepts without fighting the language. The C++ pass makes every abstraction Python was hiding viscerally concrete. The rewrite is where deep understanding crystallizes.

**Why this scope is correct:**
- The founder was able to implement in ~600 lines Python, ~1000 lines C++ — comprehensible end to end
- Turing complete: variables, conditionals, loops, arithmetic
- Not overwhelming — the learner can hold the whole thing in their head
- Every piece must work or nothing works — can't fake understanding
- Natural, exciting extension paths exist (functions, bytecode VM) without being required

---

### Phase 1: Python Implementation

The Python version establishes the full pipeline using `isinstance`-based dispatch. Each component maps directly to a file:

**Tokens** — `PLUS`, `MINUS`, `MULTIPLY`, `DIVIDE`, `L_PARENS`, `R_PARENS`, comparison operators, `NUMBER`, `IDENTIFIER`, keywords (`KNOW`, `SUPPOSE`, `OTHERWISE`, `END`, `DOOM`, `CRIME`), `EOF`

**Lexer** — character-by-character traversal with `peek`/`peek_next` state transition; single-char map, multi-char comparison tokens, keyword map with `IDENTIFIER` fallback, numeric literals

**Parser** — recursive descent with explicit precedence chain:
```
expression → comparison → term → factor → unary → primary
```
Statement dispatcher routes to `assignment`, `conditional`, `while_statement`, `print_statement`, or `expression`. `block()` collects until `END`. `consume()` validates and advances in one step.

**Nodes** — `ProgramNode`, `BlockNode`, `AssignNode`, `ConditionalNode`, `WhileNode`, `PrintNode`, `BinaryOpNode`, `UnaryOpNode`, `NumberNode`, `IdentifierNode`

**Interpreter** — tree walker using `isinstance` dispatch. `symbol_table` as plain dict. `binary_op_map` and `unary_op_map` mapping `TokenType` to Python operator functions. `run()` loops statements, `evaluate()` dispatches on node type recursively.

---

### Phase 2: C++ Rewrite

Same architecture, same project, everything Python was hiding becomes explicit:

**New concepts introduced:**
- `std::unique_ptr<ASTNode>` — heap allocation, RAII, ownership semantics, move semantics
- `std::variant<double, bool>` — explicit type representation for runtime values
- `enum class TokenType` — scoped enums
- Virtual dispatch and vtables — `accept(Visitor&)` on every node
- Visitor pattern with double dispatch — compiler enforces completeness, no silent failures
- `static const` maps initialized with lambdas
- `Runner` class separating traversal control from evaluation logic
- Makefile and clang++ build toolchain

**The critical pedagogical difference:**

Python uses an `isinstance` chain in `evaluate()`. C++ uses the visitor pattern with double dispatch:
```
evaluate(node)
  → node.accept(*this)           // dispatch 1: vtable on node
    → v.visit(*this)
      → Interpreter::visit(ConcreteType&)   // dispatch 2: overload on concrete type
```
The visitor pattern enforces completeness at **compile time** — add a node type without a `visit()` overload and it won't compile. The `isinstance` chain fails silently at runtime. This difference is felt, not just understood.

**This is the "everything clicked" moment.** When the learner rewrites the same lexer, parser, and interpreter they already built in Python, every abstraction Python was providing invisibly becomes concrete. What a string actually is. What ownership means. Why the visitor pattern exists as a solution to a real problem they just felt.

---

### Existing Curriculum Artifacts (from the real build)
- `luthor_project.md` — full architecture, design decisions, complete component breakdown for both Python and C++
- `cpp_rewrite_concepts.md` — C++ specific concepts introduced in the rewrite
- `visitor_pattern.md` — deep dive on the pattern as implemented in this codebase
- Python and C++ source as reference implementations (~600 and ~1000 lines respectively)
- the actual constraint profile used during the build from the original CLAUDE.MD: `"DO NOT GIVE CODE, JUST GUIDANCE LIKE A TEACHER"`

These are real artifacts from the real build, not reconstructed after the fact.

---

## Target Audience

**Primary**: Self-directed adult learners who are aware of the LLM shortcut problem and actively don't want to use it. People who've seen what answer-farming produces and want genuine understanding. The audience that watches ThePrimeagen, TJ DeVries, and similar creators who preach "build hard things, understand the machine."

**Prerequisites for the Luthor project:** Comfortable with Python (functions, classes, loops, enums). For the C++ rewrite: a working understanding of C fundamentals — pointers, heap allocation, stack vs heap. Not C++ experience — C fundamentals. Full details in `luthor_curriculum/cpp_rewrite_concepts.md`.

**Why this audience works:**
- Motivation is self-supplied — the hardest problem in ed-tech is largely solved
- Already bought into the philosophy — no convincing required
- Lives in the terminal — natural fit for CLI tool
- Will evangelize authentically if the experience delivers

**Secondary**: Bootcamp operators who want to offer a tool that enforces real learning and differentiates their graduates.

---

## Differentiation

| | CrucibleBuild | Khanmigo | Boot.dev | ChatGPT Study Mode |
|---|---|---|---|---|
| Won't give code | Architectural | Soft | Soft | Soft |
| Project-based | Core mechanic | No | Partial | No |
| Filesystem aware | Yes | No | No | No |
| Python → C++ curriculum | Yes | No | No | No |
| CLI / developer native | Yes | No | No | No |
| Constraint is the product | Yes | No | No | No |

The Socratic tutoring feature is becoming a commodity — every major AI product is adding it. The differentiation is the constraint profile being architectural, the project-based structure, the filesystem awareness, and the curriculum specifically designed to produce the "everything clicked" moment.

---

## Extensibility

CrucibleBuild is a learning framework. Luthor is the first project. Adding a new curriculum — say, a web server or a shell — requires authoring content, not writing code. The CLI, agent loop, filesystem watcher, and TUI are unchanged.

### What gets reused across every project

The constraint profile mechanics are shared infrastructure. Every project inherits:

- The mentor persona (firm, technically precise, not a lobotomized refuser)
- The constraint rules (✅ architecture, concepts, feedback / ❌ code, solutions)
- The graduated escalation path (hint → explanation → reference → pseudocode)
- The system prompt renderer that assembles static and dynamic blocks
- All CLI plumbing: `init`, `chat`, file watching, slash commands, the agent loop

None of this changes per project. The constraint profile is the same contract regardless of what the learner is building.

### What gets authored per project

Each project is a self-contained **curriculum bundle** — a directory of markdown files the agent reads at runtime. No code changes required to add one.

```
<project>_curriculum/
  <project>_overview.md    # learner-facing intro: what it is, what it can do, example output
  <project>_project.md     # full reference spec: phases, components, design decisions
  mentor_charter.md        # phase sequence, file-to-doc mapping, pacing rules, progress inference
  <concept>.md             # one teaching doc per major concept introduced
```

**For a web server project, this would mean authoring:**
- `webserver_overview.md` — what the learner is building (HTTP/1.1 server from scratch), what it can do (serve static files, handle routes, parse headers), example request/response
- `webserver_project.md` — full reference: TCP sockets, HTTP parsing, request routing, response encoding; design decisions and build order
- `mentor_charter.md` — phase sequence (e.g. raw TCP → HTTP parsing → routing → static file serving → concurrent connections), file-to-doc mapping, what the mentor looks for at each checkpoint
- Concept docs: `tcp_sockets.md`, `http_protocol.md`, `request_parsing.md`, `concurrency.md`, etc.

**One code addition is required:** a new profile module (e.g. `src/profile/webserver.default.ts`) that encodes the phase list as typed `PhaseSchema` entries — phase IDs, goals, checkpoints, concepts introduced. This is the structured counterpart to the narrative in the curriculum docs. It's what drives `/phase`, phase advancement, and the dynamic system prompt block. Use `src/profile/luthor.default.ts` as the template — the structure is self-evident and the Zod types guide the rest.

The `profileId` field in `.cruciblebuild/config.json` ties a session to its curriculum bundle. `luthor-default` is the first value. New projects register new ids.

---
