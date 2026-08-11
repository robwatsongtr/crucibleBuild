# CrucibleBuild - AI Programming Mentor 

CrucibleBuild is a project-based technical mentorship CLI application. Run it in a project directory — it watches your files, holds context of what you've written, and chats with you in the terminal. The AI mentor is constrained by a profile: it cannot write code or give solutions, but it can explain architecture, point at concepts, answer questions, and give feedback on code you wrote.


### The first and flagship project is Luthor — a Turing-complete interpreted programming language built in two passes: a Python pass and a C++ rewrite.


---

## Prerequisites

- Node >= 20
- An Anthropic API key (or Google Gemini API key for the free-tier Gemini provider)
- **Python pass:** Comfortable writing Python — functions, classes, loops, conditionals, enums. No prior knowledge of compilers or interpreters required.
- **C++ rewrite:** A working understanding of C fundamentals — static typing, pointers, heap allocation, stack vs heap, manual memory management. No prior C++ experience required per se, but it doesn't hurt :) 

---

## Why This Exists

The app developer — developer and music teacher — built a Turing complete interpreted programming language using an 'inverted AI workflow'. Instead of asking Claude Code to write code, Claude Code was used as a project mentor: providing architecture, guidance, and feedback on code the human wrote — but never writing the code itself.

The result was deeper understanding of tokenizing, recursive descent parsing, AST construction, and interpreter tree walking. More importantly, the struggle produced a genuine leveling-up in the ability to hold code and concepts in mind — which translates directly to better code comprehension and more effective use of AI tools.

Out of this experience was born the idea of an "AI Mentor" that can provide the guidance of a senior developer and assist a learner in building challenging projects.

---

## The Problem

Until you can implant experience into someone's brain, the only way to get it is to actually do the task long enough for the right patterns to form. There's no shortcut — you have to write programs to understand how to use AI to write programs.

People entering software development now face a paradox: LLMs can write code for you instantly, but using them that way hollows out the understanding you need to steer them well. Effective use requires experience, and LLMs short-circuit the process of getting that experience.

CrucibleBuild is a structured tool for the struggle these developers know they need: a framework for learning classic deep systems — interpreters, compilers, servers, databases — from scratch, where the difficulty is the point.

Experienced developers benefit too. Deliberate practice matters — Leetcode is one way to get it, but those problems are small in scope. Building a language, a web server, or a database engine keeps your chops up at a much deeper level.

---

## The Mentor Profile

CrucibleBuild's mentor operates under a structured mentor profile — an explicit set of rules with a deliberate escalation path:

| | Allowed |
|---|---|
| Architecture and structure | ✅ |
| Pointing toward the right concepts | ✅ |
| Answering specific questions | ✅ |
| Import and syntax help | ✅ |
| Feedback on code you wrote | ✅ |
| Writing code | ❌ |
| Giving solutions | ❌ |

When you're genuinely stuck, help is calibrated in stages: hints → explanations → reference material → pseudocode as a last resort. The escalation exists to distinguish productive struggle (the kind that builds real patterns) from unproductive friction (getting stuck on a typo, which teaches nothing and burns motivation).


---

## The Curriculum: Luthor

The first and flagship project is **Luthor** — a Turing-complete interpreted programming language built in two passes. To keep the focus tight and on the 'lexer -> parser -> interpreter' pipeline, functions and closures were omitted. See [`luthor_curriculum/luthor_overview.md`](luthor_curriculum/luthor_overview.md) for the full learner-facing introduction. Also in that directory are a complete set of reference documents covering the key concepts in language design and implementation from lexer to interpreter. 

**Pass 1: Python**
Build the full pipeline: lexer, parser (recursive descent), AST nodes, and a tree-walking interpreter. Python lets you focus on the concepts without fighting the language.

**Pass 2: C++ Rewrite**
Rewrite the same project in C++. Every abstraction Python was hiding becomes viscerally concrete: `unique_ptr` ownership, virtual dispatch, the visitor pattern with double dispatch, `std::variant` for runtime values. This is where everything clicks.


---

## Using CrucibleBuild

### Setup

```bash
npm install
npm run build
npm link
```

Copy `.env.example` to `.env` and add your API key:

```
ANTHROPIC_API_KEY=your-key-here
# CRUCIBLEBUILD_PROVIDER=gemini
# GEMINI_API_KEY=your-key-here
# CRUCIBLEBUILD_MODEL=claude-haiku-4-5-20251001
```

By default the Anthropic provider is used. Set `CRUCIBLEBUILD_PROVIDER=gemini` to use Gemini instead.

### Running

`my_luthor/` is your working directory for the entire Luthor curriculum — both the Python pass and the C++ rewrite. Initialize a git repo there to save your work, then run `init` (you must be in my_luthor/ to run init):

```bash
cd my_luthor
git init
cruciblebuild init
```

This prints the Luthor overview and writes `.cruciblebuild/config.json` into `my_luthor/`.

Then start a chat session (you must be in my_luthor/ to run chat session):

```bash
cruciblebuild chat
```

The mentor opens with a summary of your current phase and what you should be working on. Write your code in `my_luthor/python_luthor/src/` (Python pass) or `my_luthor/cpp_luthor/src/` (C++ pass) — the watcher picks up changes and the mentor can read them.

### Slash commands

| Command  | Description                        |
|----------|------------------------------------|
| `/phase` | Show current phase and what's next |
| `/files` | List tracked project files         |
| `/clear` | Clear conversation history         |
| `/exit`  | Exit the session                   |

---

## Developing CrucibleBuild

### Build

```bash
npm run build       # compile TypeScript to dist/
npm run dev         # watch mode — recompiles on change
```

### Checks

```bash
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run lint        # eslint src/
npm run format      # prettier --write src/
```

Pre-commit hooks run lint-staged, typecheck, and the full test suite automatically on every commit.

### Debug mode

Set `CRUCIBLEBUILD_DEBUG=1` to enable verbose logging — prints token usage, cache stats, stop reason, and tool call details to the terminal.

```bash
CRUCIBLEBUILD_DEBUG=1 cruciblebuild chat   # single session
export CRUCIBLEBUILD_DEBUG=1              # persist for the shell session
```

---

## Extensibility

CrucibleBuild is a learning framework. Luthor is the first project. Adding a new curriculum — a web server, a shell, a database engine — requires authoring content and a profile module schema. 

### What gets reused

The mentor profile mechanics, mentor persona, graduated escalation path, and all CLI plumbing (init, chat, file watching, agent loop) are shared across every project. 

### What gets authored per project

Each project is a self-contained **curriculum bundle** — a directory of markdown files the agent reads at runtime via `read_file`. 
```
<project>_curriculum/
  <project>_overview.md    # learner-facing intro: what it is, example output
  <project>_project.md     # full reference spec: phases, components, design decisions
  mentor_guide.md        # behavioral spec: constraint rules, escalation ladder, scaffolding order, phase sequence, pacing
  <concept>.md             # one teaching doc per major concept introduced
```

One code addition is also required: a profile module (`src/profile/<project>.default.ts`) that encodes the phase list as typed `PhaseSchema` entries — phase IDs, goals, checkpoints, concepts introduced. This is the structured counterpart to the narrative curriculum docs and drives `/phase`, phase advancement, and the dynamic system prompt block. Use `src/profile/luthor.default.ts` as the template.

`mentor_guide_example.md` at the repo root provides a ready-to-adapt base for the rules, escalation protocol, and tone sections of a new `mentor_guide.md`. `luthor_curriculum/` is the canonical example of the full bundle pattern.

**Wiring a new profile into the app** requires these code changes:

1. Add the new `profileId` to the profile selection logic in `src/cli/chat.ts` — currently `const profile = luthorDefaultProfile` is hardcoded. Add a branch for the new id that imports and returns the new profile module.
2. Register the new `profileId` as a valid value in `ProjectConfigSchema` in `src/schemas/project-config.ts` so `init` and `chat` accept it without a validation error.
3. Update (or generalize) the project-root directory check in `src/services/project-scaffolder.ts` and the messages in `src/cli/init.ts` / `src/cli/chat.ts` — they currently assume Luthor's `my_luthor/`, `python_luthor/`, `cpp_luthor/` naming.

### The learner's working directory

Each project also has its own working directory the learner builds in — `my_luthor/` for Luthor, e.g. `my_webserver/` for a web server project — containing that project's own subdirectories (Luthor's are `python_luthor/` and `cpp_luthor/`). This is separate from the curriculum bundle: the curriculum bundle is docs the agent reads, the working directory is where the learner's code lives and where `init`/`chat` are run.

This directory shape is currently hardcoded for Luthor: `isLuthorProjectRoot` in `src/services/project-scaffolder.ts` checks specifically for `python_luthor/` and `cpp_luthor/` before allowing `init`/`chat` to run, and the CLI's error messages reference `my_luthor/` by name. A new project needs the equivalent check for its own subdirectory names — this is not yet generalized and is a real code change.

---

## License

MIT License — see `LICENSE` file.

## Contact

Rob Watson — rwatso [at] gmail [dot] com