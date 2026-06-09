# Tokens — What They Are and Why You Need Them

Source code is text, in this case represented as a string. A string is just characters. Before anything meaningful can happen — before you can parse, before you can evaluate — you need to break that string into units that carry meaning.

Consider `know x 10`. To a computer reading it character by character, there is nothing special about the space between `know` and `x`. It is just another character. The computer has no innate sense that `know` is a complete unit, or that it means something different from `x`, or that `10` is a number.

Tokens are how you impose that structure. A token is the smallest meaningful unit of a program.

---
## What a Token Is

A token has two parts:

- **Type** — what kind of thing it is: a keyword, an identifier, a number, an operator
- **Lexeme** — the original text it came from

Some tokens need their lexeme because the value matters:

| Source | Type | Lexeme |
|---|---|---|
| `x` | `IDENTIFIER` | `"x"` |
| `count` | `IDENTIFIER` | `"count"` |
| `42` | `NUMBER` | `"42"` |
| `3.14` | `NUMBER` | `"3.14"` |

Others don't need a lexeme because the type says everything:

| Source | Type | Lexeme needed? |
|---|---|---|
| `+` | `PLUS` | No |
| `know` | `KNOW` | No |
| `<=` | `LESS_THAN_EQUAL` | No |

When you see `PLUS`, you already know everything about it. When you see `IDENTIFIER`, you need the lexeme to know *which* identifier.

---

## Why an Enum

The token type needs to be something you can compare, switch on, and store cheaply. An enum is the right tool — a fixed set of named constants, one per token type.

In Python:

```python
from enum import Enum, auto

class TokenType(Enum):
    PLUS = auto()
    MINUS = auto()
    NUMBER = auto()
    IDENTIFIER = auto()
    KNOW = auto()
    # ...
```

In C++, `enum class` gives you scoped names so `PLUS` doesn't collide with anything else in scope:

```cpp
enum class TokenType {
    PLUS,
    MINUS,
    NUMBER,
    IDENTIFIER,
    KNOW,
    // ...
};
```

The enum is the shared vocabulary of the entire pipeline. The lexer produces `TokenType` values. The parser consumes them. They never pass raw strings between each other — only token types and lexemes.

---

## The Full Luthor Token Set

**Arithmetic:**
- `PLUS`, `MINUS`, `MULTIPLY`, `DIVIDE`

**Grouping:**
- `L_PARENS`, `R_PARENS`

**Comparison:**
- `LESS_THAN`, `GREATER_THAN`
- `LESS_THAN_EQUAL`, `GREATER_THAN_EQUAL`
- `EQUAL_TO`, `NOT_EQUAL`

**Values:**
- `NUMBER` — numeric literals; carries lexeme
- `IDENTIFIER` — variable names; carries lexeme

**Keywords:**
- `KNOW` — variable assignment
- `SUPPOSE` — if statement
- `OTHERWISE` — else clause
- `END` — block terminator
- `DOOM` — print
- `CRIME` — while loop

**Control:**
- `EOF` — signals end of token stream; tells the parser to stop

---

## Tokens Are the Contract

The token definitions are the contract between the lexer and the parser. The lexer promises to produce only valid `TokenType` values. The parser promises to handle all of them. If you add a new token type, both sides need to know about it.

This is why tokens come first — before the lexer, before the parser, before anything else. Every other component in the pipeline is built on top of this vocabulary.

---

## Key Insights Summary

- **A token is the smallest meaningful unit of a program** — not characters, not lines, but classified units
- **Type + lexeme** — type is the classification, lexeme is the original text; some tokens need it, some don't
- **Enums are the right tool** — a fixed, named, comparable set of constants; cheap to store, easy to switch on
- **Tokens are the shared vocabulary** — the contract between the lexer and the parser; defined first because everything else depends on them
