# CrucibleBuild: Programming mentorship app

A project-based technical mentorship CLI application. Run it in a project directory — it watches your files, holds context of what you've written, and chats with you in the terminal. The AI mentor is constrained by a profile: it cannot write code or give solutions, but it can explain architecture, point at concepts, answer questions, and give feedback on code you wrote.

---

## Why This Exists

The founder — a music teacher and developer — built a complete interpreted programming language using an inverted AI workflow. Instead of asking Claude to write code, Claude was used as a project mentor: providing architecture, guidance, and feedback on code the human wrote — but never writing the code itself.

The result was deeper understanding of tokenizing, recursive descent parsing, AST construction, the visitor pattern, smart pointers, and virtual dispatch than years of conventional learning had produced. More importantly, the struggle produced a genuine leveling-up in the ability to hold complex code and concepts in mind — which translates directly to better code comprehension and more effective use of AI tools.

This experience is the product.

---

## The Problem

Until you can implant experience into someone's brain, the only way to get experience is to actually do the task long enough for the proper patterns to get established. There is no other way. You must write programs to understand how to properly use AI to write programs. 

This is a well established pattern in school: you have computers and calculators that can do Algebra, Trig, and Calculus, but the student still does a large part of it by hand 

People entering software development now face a fundamental paradox:

- LLMs can write code for you instantly
- Using them that way hollows out the understanding you need to use them well
- You need experience to steer a nondeterministic model effectively
- But LLMs short-circuit the process of getting that experience

The result is developers who can generate code they don't understand, can't debug when it breaks, can't evaluate whether it's good, and can't steer the model when it goes wrong.

The people who are aware of this problem have no structured solution. They know they need to struggle. They don't have a tool designed around that need.

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

The first and flagship project is **Luthor** — a complete interpreted programming language, Turing complete, built in two passes. The founder was able to implement all features in Python in arojnd 600 lines, and the
C++ version in about 1000 lines. 

**Pass 1: Python**
Build the full pipeline: lexer, parser (recursive descent), AST nodes, and a tree-walking interpreter. Python lets you focus on the concepts without fighting the language.

**Pass 2: C++ Rewrite**
Rewrite the same project in C++. Every abstraction Python was hiding becomes viscerally concrete: `unique_ptr` ownership, virtual dispatch, the visitor pattern with double dispatch, `std::variant` for runtime values. This is where everything clicks.


---

## Prerequisites

- Node >= 20
- An Anthropic API key (or Google Gemini API key for the free-tier Gemini provider)
- For the Python pass: comfortable with Python (functions, classes, loops, enums)
- For the C++ rewrite: C fundamentals (pointers, heap allocation, stack vs heap) 

---

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and add your API key:

```
ANTHROPIC_API_KEY=sk-...
# CRUCIBLEBUILD_PROVIDER=gemini
# GEMINI_API_KEY=your-key-here
```

By default the Anthropic provider is used. Set `CRUCIBLEBUILD_PROVIDER=gemini` to use Gemini instead.

## Build

```bash
npm run build
```

To watch for changes during development:

```bash
npm run dev
```

## Link the CLI globally

```bash
npm link
```

This makes the `cruciblebuild` command available system-wide.

---

## Usage

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

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run lint        # eslint src/
npm run format      # prettier --write src/
```

Pre-commit hooks run lint-staged, typecheck, and the full test suite automatically on every commit.

---

## Extensibility

CrucibleBuild is a learning framework. Luthor is the first project. Each project is a self-contained curriculum bundle in its own directory — `luthor_curriculum/` establishes the pattern. Adding a new project (web server, shell, database engine) means authoring that directory. The CLI, agent loop, watcher, and TUI don't change.
