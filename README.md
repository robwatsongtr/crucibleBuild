# CrucibleBuild

A project-based technical mentorship CLI. Run it in a project directory — it watches your files, holds context of what you've written, and chats with you in the terminal. The mentor is constrained by a profile: it cannot write code or give solutions, but it can explain architecture, point at concepts, answer questions, and give feedback on code you wrote.

## Prerequisites

- Node >= 20
- An Anthropic API key (or Google Gemini API key for the free-tier Gemini provider)

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

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run lint        # eslint src/
npm run format      # prettier --write src/
```

Pre-commit hooks run lint-staged, typecheck, and the full test suite automatically on every commit.
