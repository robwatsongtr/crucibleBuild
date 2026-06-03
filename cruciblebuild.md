# CrucibleBuild — Product Foundation Document

## Origin

This product concept emerged from a direct personal experience. The founder — a music teacher of 20 years, self-taught backend/frontend developer of 6 years — built a complete interpreted programming language (Luthor) over two months using an inverted AI workflow. Instead of asking Claude to write code, Claude was used as a project mentor: providing architecture, guidance, answering questions, giving feedback on code written by the human — but never writing the code itself.

The result was deeper understanding of tokenizing, recursive descent parsing, AST construction, visitor pattern, smart pointers, and virtual dispatch than years of conventional learning had produced. The project was built twice: first in Python, then rewritten in C++. The C++ rewrite is where everything "extra clicked."

This experience is the product.

---

## The Core Problem

People entering software development now face a fundamental paradox:

- LLMs can write code for you instantly
- Using them that way hollows out the understanding you need to use them well
- You need experience to steer a nondeterministic model effectively
- But LLMs short-circuit the process of getting that experience

The result is a generation of developers who can generate code they don't understand, can't debug when it breaks, can't evaluate whether it's good, and can't steer the model when it goes wrong.

The people who are aware of this problem — and there are many — have no structured solution. They know they need to struggle. They don't have a tool designed around that need.

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

## The Product

A **project-based technical mentorship tool** — a CLI application that:

1. Is initialized in a project directory
2. Watches the filesystem in real time (using watchdog or equivalent)
3. Maintains live context of what the learner has actually written
4. Pairs that with a chat interface (lightweight local web UI served locally)
5. Has the constraint profile baked in architecturally — it cannot give code, by design
6. Reacts to file changes intelligently — sometimes proactively, mostly waiting for the learner to engage
7. Generates a synthesis document at the end of each phase capturing decisions made and concepts understood

The constraint is not a setting. It is the product.

### Why CLI, not web app

- Target audience lives in the terminal
- Filesystem watching requires local installation
- Claude Code (the closest analogous tool) is npm-installed — precedent is set
- Feels like a serious developer tool, not consumer ed-tech
- Install experience: `pip install cruciblebuild` → `cd my-project` → `cruciblebuild init --project lexer`

### Tech Stack (MVP)

- Python / FastAPI backend
- Watchdog for filesystem monitoring
- Simple React frontend (local web UI)
- Anthropic API (core intelligence)
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
- ~600 lines Python, ~1000 lines C++ — comprehensible end to end
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

## Go To Market (MVP)

1. Build the CLI tool and refine the Luthor curriculum against it
2. Dogfood: run another person through the project while observing closely
3. Document the experience — what worked, what the moments of breakthrough were
4. Reach out to creator community (ThePrimeagen adjacents) with a genuine story, not a pitch
5. The founder's story *is* the marketing: music teacher builds a compiler from scratch in two months using an inverted AI workflow and understood it end to end

The repo already exists. The docs already exist. The CLAUDE.md showing the method is already public. The story is already there.

---

## MVP Build Sequence

1. Nail the system prompt / constraint profile — this is the core IP
2. Basic CLI init and project setup
3. Filesystem watcher with context loading
4. Local web UI chat interface
5. Agent loop with file-aware responses
6. Phase synthesis document generation
7. Package and install experience (`pip install cruciblebuild`)

The constraint profile prompt engineering is the first and most important task. Everything else is scaffolding around it.

---

## Extensibility

Each project is a self-contained bundle:
- Project definition MD file — what's being built, phases, checkpoints
- Phase-specific system prompt configuration
- Constraint profile
- Reference materials the agent can pull from

Adding a new project (web server, shell, database, etc.) means authoring that bundle. The CLI and agent loop don't change. This separation is worth designing toward explicitly from the start even if only one project ships at MVP.

---

## Domain & Identity

- Domain: `cruciblebuild.dev`
- CLI: `cruciblebuild`
- Install: `pip install cruciblebuild`

---

## Open Questions

- Whether to start with pip or npm packaging
- Exact constraint negotiation UX at project init
- How proactive vs reactive the file-watching agent should be
- Pricing model (direct to learner vs B2B bootcamp)
- Whether the Luthor project ships as open curriculum or gated content