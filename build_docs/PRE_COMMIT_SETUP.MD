# Pre-Commit Setup

This project uses [husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) to automatically run checks before each commit.

## What Runs on Commit

Every time you commit, the following checks run automatically:

### 1. **tsc (Type Checking)**
- Verifies all TypeScript types are correct
- Runs `tsc --noEmit` — checks without producing compiled output
- Fails if type errors are found

### 2. **vitest (Test Suite)**
- Runs all tests automatically
- Fails if any test fails

### 3. **Code Quality Checks (lint-staged)**
- ESLint auto-fixes linting issues on staged files
- Prettier auto-formats staged files
- Checks for merge conflict markers

## Installation

```bash
npm install --save-dev husky lint-staged
npm install --save-dev typescript vitest
npm install --save-dev eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
npx husky init
```

## Configuration

**`package.json`**
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

**`.husky/pre-commit`**
```bash
#!/bin/sh
npx lint-staged
npm run typecheck
npm run test
```

**Configuration files:**
- `tsconfig.json` — TypeScript compiler config (`strict: true` required)
- `.eslintrc.json` — linting rules
- `.prettierrc` — formatting rules
- `.husky/pre-commit` — hook entry point

## Usage

### Automatic (on commit)
```bash
git add .
git commit -m "Your message"

# Pre-commit runs automatically:
# ✓ eslint --fix (staged files)
# ✓ prettier --write (staged files)
# ✓ tsc --noEmit (type checking)
# ✓ vitest run (test suite)

# If all checks pass → commit succeeds ✅
# If any check fails → commit is blocked, fix and try again ❌
```

### Manual (run before commit)
```bash
# Run type check
npm run typecheck

# Run tests
npm run test

# Run lint + format on all files
npm run lint
npm run format
```

## Bypassing Hooks (Emergency Only)

**Not recommended**, but if you need to commit without running hooks:

```bash
git commit --no-verify -m "Your message"
```

## What to Do When Hooks Fail

### tsc fails
```
tsc --noEmit.....Failed
src/services/watcher.ts:12: error TS2322: Type 'string' is not assignable to type 'number'
```

**Fix**: Correct the type error in the file, then commit again.

### ESLint/Prettier auto-fix
```
eslint --fix.....Failed
- files were modified by this hook
Fixing src/services/watcher.ts
```

**Fix**: The hook auto-fixed it — just stage the file and commit again:
```bash
git add src/services/watcher.ts
git commit -m "Your message"
```

### vitest fails
```
vitest run.....Failed
FAIL src/services/watcher.test.ts
```

**Fix**: Fix the failing test or the code it covers, then commit again.

## Notes

- lint-staged only runs ESLint and Prettier on staged files — fast
- `tsc --noEmit` and `vitest run` always check the full project
- First `husky init` takes a moment; subsequent commits are fast

## Updating

```bash
# Update dependencies
npm update husky lint-staged

# Re-install hooks after config changes
npx husky init
```
