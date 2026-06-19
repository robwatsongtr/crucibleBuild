# The Luthor Language

## Prerequisites

**Python pass:** Comfortable writing Python — functions, classes, loops,
conditionals, enums. No prior knowledge of compilers or interpreters required.

**C++ rewrite:** A working understanding of C fundamentals — pointers, heap
allocation, stack vs heap, manual memory management. Full details in
`cpp_rewrite_concepts.md` — read the Prerequisites section there before
starting the rewrite.

---

## What It Is

Luthor is a small interpreted programming language. You are going to build it
from scratch — the lexer, the parser, the AST, and the interpreter. When you
are done, you will have a complete pipeline that takes source code as a string
and produces output.

It is intentionally small. Small enough that you can hold the entire thing in
your head. Every piece must work or nothing works — there is no way to fake
understanding.

It is also Turing complete. Luthor has variables, arithmetic, conditionals, and
loops. That is enough to compute anything computable. There are no functions or
closures, but those can be built easily with the foundation here (it's just
taking the state of the variables as a context and placing that in a stack).

The scope is tight not because the language is a toy, but because the goal is
deep understanding of the pipeline, not feature breadth. If you understand how
a program stores state, you can extend that later.

---

## Keyword Theme

The core component you will build first is called a **lexer**. So Luthor is a
pun on **Lex Luthor** — Superman's villain. The keywords in Luthor are themed
around him. Crime being a while loop is a nice touch.

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

There is no `=` sign. Assignment uses `know`. There are no parentheses around
conditions. Blocks end with `end` rather than `}`. The syntax is deliberately
minimal — fewer moving parts means the parser is simpler to build.

**One deliberate design decision worth noticing:** there is no opening block
delimiter. `suppose` and `crime` implicitly open a block — the keyword itself
is the signal. Only `end` is needed to close it.

This is not unusual. Ruby's control flow works the same way — `if`, `while`,
and `def` all open blocks implicitly, and `end` closes them. Python does
something similar — `if`, `for`, and `while` are the implicit openers, with
`:` as a lightweight separator and indentation as the closer.

The practical effect in Luthor: the parser's `conditional()` method consumes
`suppose`, parses the condition, and immediately calls `block()`. There's no
opening delimiter to consume. `block()` just collects statements until it sees
`end`. Less syntax, simpler parser, same expressive power.

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

Each stage is independent. The lexer does not know about the parser. The parser
does not know about the interpreter. They communicate only through the data
structures between them — tokens and AST nodes. You will build these too.

---

## How You Will Know It Works

You are provided with two test harness files — one for each pass:

- **`python_luthor/main.py`** (Python pass) — runs a hardcoded source string
  through the full pipeline, printing tokens, AST, then interpreter output
- **`cpp_luthor/main.cpp`** (C++ pass) — takes a `.lut` source file as a
  command line argument and does the same: prints tokens, AST, then output

These are not implementation files — they are scaffolding that calls your code
and shows you what it produces. You did not write them and do not need to. Read
them before you start each pass. They define the interface you are building
toward — what `Lexer` takes, what `tokenize()` returns, how the pipeline
connects.

For the Python pass, `main.py` imports from `src/` — so your implementation
files go in `python_luthor/src/`:

```
src/tokens.py
src/lexer.py
src/nodes.py
src/parser.py
src/interpreter.py
```

Run them after completing each component. If your lexer is working, the token
output will look right. If your parser is working, the AST will look right. You
will know immediately which stage is broken and which is not.

For the C++ pass, a `Makefile` is provided at `cpp_luthor/Makefile`. Read it
before you start — the `SRCS` line tells you exactly which source files you
need to create:

```
src/lexer.cpp
src/parser.cpp
src/interpreter.cpp
src/runner.cpp
```

To build and run a `.lut` file:
```
make
./luthor source.lut
```

---

## What You Are Actually Learning

Luthor is the vehicle. What you are building toward is an understanding of:

- How a program is represented at each stage of compilation
- How recursive descent parsing works and why it produces correct precedence
- How a tree-walking interpreter evaluates expressions bottom-up
- In the C++ rewrite: how ownership, virtual dispatch, and the visitor
  pattern work at a mechanical level

These are not abstract concepts. By the time you finish, you will have felt
them — through the code you wrote, the bugs you fixed, and the moment the
interpreter runs its first correct program.
