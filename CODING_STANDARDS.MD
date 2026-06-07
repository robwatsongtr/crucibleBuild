# Coding Standards

## Implementation Standards

- **Separation of concerns**: 
 - Maintain clear separation in both files and directories. 
 - Specifically create directories for similar kinds of files: examples are `models`, `db`, `schemas`, `routes`, `services`.
 - Put configs and constants into their own file and import where needed. 

- **Clean code**: 
  - Keep code clean and readable. Always have one space above a return statement. 
  - Keep methods/functions short when possible. 
  - Separate function/method calls from return statements - don't combine them on one line.

- **Use classes**: Organize functionality with classes to reduce code duplication if possible.


## TypeScript Project Setup

All TypeScript projects must include:

- **tsc**: TypeScript compiler used as the type checker
  - Run type checking with: `tsc --noEmit`
  - Configure in `tsconfig.json` with `strict: true`
  - Type checking also runs continuously in your editor (VS Code) as you work

- **vitest**: Testing framework for all unit and integration tests
  - Run tests with: `vitest run`
  - Configure in `vitest.config.ts`

- **zod**: Data validation and structured data modeling
  - Required for all structured data (API responses, configuration, data transfer objects)
  - Define a schema, infer the type from it, use the inferred type everywhere
  - Schemas should be in their own files
  - ✅ Good:
    ```ts
    // models/user.ts
    import { z } from 'zod'

    export const UserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
    })

    export type User = z.infer<typeof UserSchema>
    ```
  - ❌ Bad: `function getUser(): Record<string, any> { ... }`

- **ESLint + Prettier**: Linting and formatting
  - Run lint with: `eslint src/`
  - Run format with: `prettier --write src/`
  - Configure in `.eslintrc.json` and `.prettierrc`


## Documentation Standards

- **JSDoc**: Always include comprehensive JSDoc comments for classes and functions.
  ```ts
  /**
   * Loads and validates project config from the given path.
   * Throws if the file is missing or fails schema validation.
   */
  class ConfigLoader { ... }
  ```

- **Inline comments**: Keep inline comments minimal. Only comment tricky logic.
  - ✅ Good: Explaining why something works a certain way
  - ❌ Bad: Explaining what obvious code does

- **Types**: TypeScript is statically typed — types are required on all function signatures.
  - `strict: true` in `tsconfig.json` enforces this at the compiler level
  - Never use `any` — use `unknown` if the type is genuinely unknown


## MCP-Specific Guidelines

- **No stdout pollution**: Never use `console.log()` in MCP servers - it corrupts the protocol.
  - ✅ Use: `process.stderr.write('debug info\n')` for debugging
  - ✅ Use: a logger configured to write to stderr

- **Tool descriptions**: Make tool descriptions clear and specific - the LLM uses these to decide when to call tools.
