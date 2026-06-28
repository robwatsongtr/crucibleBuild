# CrucibleBuild - Programming Mentorship App

CrucibleBuild is a project-based technical mentorship CLI application. Run it in a project directory — it watches your files, holds context of what you've written, and chats with you in the terminal. The AI mentor is constrained by a profile: it cannot write code or give solutions, but it can explain architecture, point at concepts, answer questions, and give feedback on code you wrote.

The first and flagship project is Luthor — a Turing complete interpreted programming language built in two passes. To keep the focus tight and on the 'lexer -> parser -> interpreter' pipeline, functions and closures were omitted. 

---

## Why This Exists

The app developer — a music teacher and developer — built a Turing complete interpreted programming language using an 'inverted AI workflow'. Instead of asking Claude Code to write code, Claude Code was used as a project mentor: providing architecture, guidance, and feedback on code the human wrote — but never writing the code itself.

The result was deeper understanding of tokenizing, recursive descent parsing, AST construction, and interpreter tree walking. More importantly, the struggle produced a genuine leveling-up in the ability to hold code and concepts in mind — which translates directly to better code comprehension and more effective use of AI tools.

This experience is the product.

---

## The Problem

Until you can implant experience into someone's brain, the only way to get experience is to actually do the task long enough for the proper patterns to get established. There is no other way. You must write programs to understand how to properly use AI to write programs. 

People entering software development now face a fundamental paradox:

- LLMs can write code for you instantly
- Using them that way hollows out the understanding you need to use them well
- You need experience to steer a nondeterministic model effectively
- But LLMs short-circuit the process of getting that experience

The result is developers who can generate code they don't understand, can't debug when it breaks, can't evaluate whether it's good, and can't steer the model when it goes wrong.

The people who are aware of this problem have no structured solution. They know they need to struggle. They don't have a tool designed around that need. CrucibleBuild aims to be a tool that provides a framework to learn classic deep systems: interpreters / compilers, servers, databases, and the like. By building deep systems from scratch you gain fundamental programming skills. 

For more experienced developers, it's important to maintain deliberate practice writing code and working through problems by hand. A regular Leetcode practice is a good way to accomplish this, but those problems are small in scope. Building a language, a web server, or a database engine is a much more in-depth and fun way to keep your chops up. 

---

## The Constraint Profile

CrucibleBuild's mentor operates under a structured constraint profile; and explicit set rules with a deliberate escalation path:

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

As mentioed above, the first and flagship project is **Luthor** — a complete interpreted programming language, Turing complete, built in two passes. 

**Pass 1: Python**
Build the full pipeline: lexer, parser (recursive descent), AST nodes, and a tree-walking interpreter. Python lets you focus on the concepts without fighting the language.

**Pass 2: C++ Rewrite**
Rewrite the same project in C++. Every abstraction Python was hiding becomes viscerally concrete: `unique_ptr` ownership, virtual dispatch, the visitor pattern with double dispatch, `std::variant` for runtime values. This is where everything clicks.


---

## Using CrucibleBuild

### Prerequisites

- Node >= 20
- An Anthropic API key (or Google Gemini API key for the free-tier Gemini provider)
- For the Python pass: comfortable with Python (functions, classes, loops, enums)
- For the C++ rewrite: C fundamentals (pointers, heap allocation, stack vs heap)

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

Navigate to a project directory (e.g. `python_luthor/`) and run:

```bash
cruciblebuild init
```

This prints the Luthor overview and writes `.cruciblebuild/config.json` into the project directory.

Then start a chat session:

```bash
cruciblebuild chat
```

The mentor opens with a summary of your current phase and what you should be working on. Edit files in your project — the watcher picks up changes and the mentor can read them with `read_file` and `list_directory`.

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

---

## Extensibility

CrucibleBuild is a learning framework. Luthor is the first project. Adding a new curriculum — a web server, a shell, a database engine — requires authoring content and a profile module schema. 

### What gets reused

The constraint profile mechanics, mentor persona, graduated escalation path, and all CLI plumbing (init, chat, file watching, agent loop) are shared across every project. 

### What gets authored per project

Each project is a self-contained **curriculum bundle** — a directory of markdown files the agent reads at runtime via `read_file`. 
```
<project>_curriculum/
  <project>_overview.md    # learner-facing intro: what it is, example output
  <project>_project.md     # full reference spec: phases, components, design decisions
  mentor_charter.md        # phase sequence, file-to-doc mapping, pacing rules
  <concept>.md             # one teaching doc per major concept introduced
```

One code addition is also required: a profile module (`src/profile/<project>.default.ts`) that encodes the phase list as typed `PhaseSchema` entries — phase IDs, goals, checkpoints, concepts introduced. This is the structured counterpart to the narrative curriculum docs and drives `/phase`, phase advancement, and the dynamic system prompt block. Use `src/profile/luthor.default.ts` as the template.

`constraint_profile_example.md` at the repo root provides a ready-to-adapt base for the constraint rules, escalation protocol, and tone sections of a new `mentor_charter.md`. `luthor_curriculum/` is the canonical example of the full bundle pattern.

**Wiring a new profile into the app** requires two small code changes:

1. Add the new `profileId` to the profile selection logic in `src/cli/chat.ts` — currently `const profile = luthorDefaultProfile` is hardcoded. Add a branch for the new id that imports and returns the new profile module.
2. Register the new `profileId` as a valid value in `ProjectConfigSchema` in `src/schemas/project-config.ts` so `init` and `chat` accept it without a validation error.