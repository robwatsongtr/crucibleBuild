# The Luthor Language

## What It Is

Luthor is a small interpreted programming language. You are going to build it from scratch — the lexer, the parser, the AST, and the interpreter. When you are done, you will have a complete pipeline that takes source code as a string and produces output.

It is intentionally small. Small enough that you can hold the entire thing in your head. Every piece must work or nothing works — there is no way to fake understanding.

It is also Turing complete. Luthor has variables, arithmetic, conditionals, and loops. That is enough to compute anything computable. The scope is tight not because the language is a toy, but because the goal is deep understanding of the pipeline, not feature breadth.

---

## Why the Keywords Are Themed

The core component you will build first is called a **lexer**. A lexer is named after **Lex Luthor** — Superman's villain. The keywords in Luthor are themed around him. This is not arbitrary. It means every time you type `know` or `crime`, you are reminded that you named your language after the thing you built to read it.

---

## What Luthor Can Do

- **Variables** — store and retrieve values by name
- **Arithmetic** — `+`, `-`, `*`, `/` with correct precedence
- **Comparison** — `<`, `>`, `<=`, `>=`, `==`, `!=`
- **Unary negation** — `-x`, `-5`
- **Conditionals** — if/else branching
- **While loops** — repeat while a condition holds
- **Print** — output a value
- **Nested expressions** — parentheses, arbitrary depth

---

## The Keyword Set

| Keyword | Meaning | Example |
|---|---|---|
| `know` | Variable assignment | `know x 10` |
| `suppose` | If statement | `suppose x > 0` |
| `otherwise` | Else clause | `otherwise` |
| `end` | Block terminator | `end` |
| `doom` | Print | `doom x` |
| `crime` | While loop | `crime x > 0` |

There is no `=` sign. Assignment uses `know`. There are no parentheses around conditions. Blocks end with `end` rather than `}`. The syntax is deliberately minimal — fewer moving parts means the parser is simpler to build.

---

## Example Programs

**Variable assignment and arithmetic:**
```
know x 10
know y 3
know result x * y + 2
doom result
```
Output: `32`

---

**Conditional:**
```
know score 85
suppose score >= 90
    doom 1
otherwise
    doom 0
end
```
Output: `0`

---

**While loop — countdown:**
```
know count 5
crime count > 0
    doom count
    know count count - 1
end
```
Output:
```
5
4
3
2
1
```

---

**Fibonacci sequence (first 8 terms):**
```
know i 0
know a 0
know b 1
crime i < 8
    doom a
    know temp b
    know b a + b
    know a temp
    know i i + 1
end
```
Output:
```
0
1
1
2
3
5
8
13
```

---

## The Pipeline

When you run a Luthor program, it passes through four stages you will build:

```
source string
    ↓
  Lexer        →  token stream
    ↓
  Parser       →  abstract syntax tree (AST)
    ↓
  Interpreter  →  output
```

Each stage is independent. The lexer does not know about the parser. The parser does not know about the interpreter. They communicate only through the data structures between them — tokens and AST nodes. You will build these data structures too.

---

## What You Are Actually Learning

Luthor is the vehicle. What you are building toward is an understanding of:

- How a program is represented at each stage of compilation
- How recursive descent parsing works and why it produces correct precedence without special cases
- How a tree-walking interpreter evaluates expressions bottom-up
- In the C++ rewrite: how ownership, virtual dispatch, and the visitor pattern work at a mechanical level

These are not abstract concepts. By the time you finish, you will have felt them — through the code you wrote, the bugs you fixed, and the moment the interpreter runs its first correct program.
