# Recursive Descent Parsing — How It Works

## The Problem the Parser Solves

The lexer gives you a flat stream of tokens:

```
KNOW  IDENTIFIER(x)  NUMBER(3)  PLUS  NUMBER(4)  MULTIPLY  NUMBER(2)
```

That's just a list. It has no structure, no precedence, no hierarchy. The parser's job is to take that flat stream and build a tree that reflects the *meaning* of the program — where `4 * 2` is grouped together before being added to `3`, not the other way around.

The question is: how do you write code that does that reliably?

The answer is recursive descent. But to get there, you first need a grammar.

---

## EBNF — A Notation for Describing Languages

**EBNF** (Extended Backus-Naur Form) is a way of writing down the rules of a language precisely. Each rule says: "a thing of type X looks like this."

### The notation

| Symbol | Meaning |
|---|---|
| `a b` | a followed by b (sequence) |
| `a \| b` | a or b (alternation) |
| `(a b)` | grouping |
| `a*` | zero or more a |
| `a+` | one or more a |
| `a?` | zero or one a (optional) |
| `'keyword'` | a literal token |
| `UPPERCASE` | a terminal (token from the lexer) |
| `lowercase` | a non-terminal (another grammar rule) |

### A simple example

```
greeting → 'hello' NAME '!'?
```

This says: a greeting is the literal token `hello`, followed by a NAME token, followed by an optional `!`. All of these are valid greetings:

```
hello world
hello world !
```

---

## The Luthor Grammar

Here is the full Luthor grammar written in EBNF:

```
program        → statement*
statement      → assignment | conditional | while_statement | print_statement | expression
assignment     → 'know' IDENTIFIER expression
conditional    → 'suppose' expression block ('otherwise' block)?
while_statement → 'crime' expression block
print_statement → 'doom' expression
block          → statement* 'end'

expression     → comparison
comparison     → term (('==' | '!=' | '<' | '>' | '<=' | '>=') term)*
term           → factor (('+' | '-') factor)*
factor         → unary (('*' | '/') unary)*
unary          → '-' unary | primary
primary        → NUMBER | IDENTIFIER | '(' expression ')'
```

Take a moment to read this. It says:

- A **program** is zero or more statements
- A **statement** is one of five things: assignment, conditional, while, print, or expression
- An **expression** is a comparison, which is terms combined with comparison operators, which are factors combined with `+`/`-`, which are unaries combined with `*`/`/`, which are either negation or a primary
- A **primary** is the bottom: a literal number, a variable, or a parenthesized expression

The chain `expression → comparison → term → factor → unary → primary` is the precedence chain. It is the grammar's way of encoding operator precedence.

---

## How Precedence Emerges From Nesting

This is the central insight. Read it carefully.

Consider `3 + 4 * 2`. The correct parse groups `4 * 2` first:

```
BinaryOpNode(+)
├── NumberNode(3)
└── BinaryOpNode(*)
    ├── NumberNode(4)
    └── NumberNode(2)
```

Why does multiplication bind tighter than addition? Because `factor` (which handles `*`) is *lower* in the grammar chain than `term` (which handles `+`). Lower in the chain means deeper in the tree. Deeper in the tree means evaluated first.

Trace through the grammar manually:

```
term
└── factor          ← starts parsing 3
    └── unary
        └── primary → NumberNode(3)
    sees +, loops back for next factor
└── factor          ← starts parsing 4
    └── unary
        └── primary → NumberNode(4)
    sees *, loops for next unary
    └── unary
        └── primary → NumberNode(2)
    returns BinaryOpNode(*, 4, 2)
returns BinaryOpNode(+, 3, BinaryOpNode(*, 4, 2))
```

The `*` got resolved inside `factor` before `term` ever finished. That's why it has higher precedence — it's handled at a deeper level of the grammar.

**Rule: operators handled lower in the chain have higher precedence.**

---

## Two Kinds of Grammar Rules

Before translating rules into functions, notice that the Luthor grammar has two fundamentally different kinds of rules. They look similar on the page but are implemented very differently in code.

**Structure rules** — `program`, `statement`, `assignment`, `conditional`, `while_statement`, `print_statement`, `block`:

These describe the shape of the program. They dispatch based on what token they see. `statement` peeks at the current token and routes to `assignment`, `conditional`, `while_statement`, etc. There is no nesting relationship between them that encodes meaning — `conditional` doesn't call `while_statement` because one is "deeper" than the other. It calls it because the current token is `CRIME`.

Implementation: `if/elif` or `switch` on the current token.

**Expression rules** — `expression`, `comparison`, `term`, `factor`, `unary`, `primary`:

These form the precedence chain. Each one calls the next level down **unconditionally** — `term` always calls `factor`, whether or not there's a `*` or `/` anywhere nearby. The nesting relationship between the rules *is* the meaning. The chain encodes precedence purely through structure.

Implementation: each method calls the next method in the chain first, then loops for its own operators.

**The critical difference:**

A structure rule dispatches — it asks "what token do I see?" and routes accordingly.

An expression rule descends — it calls the next rule unconditionally, then handles its own operators if present.

If you try to implement `term` like a dispatcher — only calling `factor` when you see `+` or `-` — precedence breaks entirely. `term` must call `factor` first, always, before checking for its own operators. The descent happens regardless of what tokens are present.

---

## One Rule, One Function

This is the mechanical translation that makes recursive descent work.

Every grammar rule becomes a method. The structure of the method directly mirrors the structure of the rule. No magic, no lookup tables, no state machine — just functions calling functions.

### Sequence → call in order

Rule:
```
assignment → 'know' IDENTIFIER expression
```

The method calls things in exactly that order:

```
function assignment:
    consume a KNOW token
    consume an IDENTIFIER token, capture its name
    call expression() to parse the value
    return an AssignNode with the name and expression
```

Each item in the sequence maps to one step.

### Alternation → if/elif or switch

Rule:
```
statement → assignment | conditional | while_statement | print_statement | expression
```

The method peeks at the current token to decide which branch to take:

```
function statement:
    if current token is KNOW    → call assignment()
    if current token is SUPPOSE → call conditional()
    if current token is CRIME   → call while_statement()
    if current token is DOOM    → call print_statement()
    otherwise                   → call expression()
```

### Repetition (`*`) → while loop

Rule:
```
term → factor (('+' | '-') factor)*
```

The `*` means "zero or more repetitions of `('+' | '-') factor`." That becomes a while loop:

```
function term:
    left ← call factor()

    while current token is PLUS or MINUS:
        capture the operator token
        right ← call factor()
        left ← new BinaryOpNode(operator, left, right)

    return left
```

Parse the first factor. Then loop: as long as the next token is `+` or `-`, consume the operator and parse another factor, wrapping the accumulated result into a new `BinaryOpNode`. The result is left-associative — `1 + 2 + 3` becomes `BinaryOpNode(+, BinaryOpNode(+, 1, 2), 3)`.

**The critical thing to notice:** `term` calls `factor()` unconditionally as its very first act — before it checks for `+` or `-`, before it knows anything about what operators are present. It always descends. Even parsing a bare `3` with no operators goes all the way down: `term → factor → unary → primary → NumberNode(3)`, then unwinds back up with nothing to combine.

This unconditional descent is not incidental — it is the mechanism. The descent builds up the call stack, and the call stack mirrors the tree structure. When you hit a literal at the bottom, you start returning back up through the waiting call frames. Each frame is an operator waiting to wrap its left and right results into a node. By the time you're back at the top the tree is assembled, and precedence is baked in by how deep each operator sits.

If you made the descent conditional — calling `factor` only when you see a `+` or `-` — precedence would break entirely. A standalone `3` would never descend and the tree wouldn't get built. The chain only works because every level always goes deeper first.

### Optional (`?`) → if

Rule:
```
conditional → 'suppose' expression block ('otherwise' block)?
```

The `?` on `('otherwise' block)` means it might not be there:

```
function conditional:
    consume a SUPPOSE token
    condition  ← call expression()
    then_block ← call block()

    else_block ← None
    if current token is OTHERWISE:
        advance past it
        else_block ← call block()

    return a ConditionalNode(condition, then_block, else_block)
```

---

## The Call Stack Is the Parse Tree

When `term` calls `factor` which calls `unary` which calls `primary`, those nested calls build up a call stack. When they return, they return nodes that get assembled into the tree. The shape of the call stack during parsing mirrors the shape of the AST that comes out.

This is why it's called *recursive* descent — the grammar is recursive (`expression` can contain a parenthesized `expression`), and the functions call each other recursively to match.

---

## Worked Example: `know x 3 + 4 * 2`

Tokens:
```
KNOW  IDENTIFIER(x)  NUMBER(3)  PLUS  NUMBER(4)  MULTIPLY  NUMBER(2)  EOF
```

Call trace:

```
statement()               sees KNOW → calls assignment()
  assignment()
    consume(KNOW)
    consume(IDENTIFIER) → name = "x"
    expression()
      comparison()
        term()
          factor()
            unary()
              primary()   → NumberNode(3)
            no * or /
          returns NumberNode(3)
        sees PLUS → loop
          factor()
            unary()
              primary()   → NumberNode(4)
            sees MULTIPLY → loop
              unary()
                primary() → NumberNode(2)
              no more * or /
            returns BinaryOpNode(*, NumberNode(4), NumberNode(2))
          no more + or -
        returns BinaryOpNode(+, NumberNode(3), BinaryOpNode(*, 4, 2))
      no comparison operators
    returns BinaryOpNode(+, NumberNode(3), BinaryOpNode(*, 4, 2))
  returns AssignNode("x", BinaryOpNode(+, NumberNode(3), BinaryOpNode(*, 4, 2)))
```

Final AST:

```
AssignNode
├── var_name: "x"
└── expression: BinaryOpNode(+)
    ├── NumberNode(3)
    └── BinaryOpNode(*)
        ├── NumberNode(4)
        └── NumberNode(2)
```

The interpreter will evaluate `4 * 2` first (it's deeper), then `3 + 8`, then assign `11` to `x`. Operator precedence fell out of the grammar structure — no special cases, no precedence tables.

---

## `consume()` — Validation and Advance in One Step

Throughout the parser, `consume(expected)` does two things: asserts the current token is the expected type, then advances past it and returns it. If the token doesn't match, it throws.

The behaviour:

```
function consume(expected_type):
    token ← current token
    if token is None:
        raise error: unexpected end of input
    if token.type != expected_type:
        raise error: expected X got Y
    advance position by one
    return the token
```

Use `consume()` when you *know* a token must be there — `KNOW` at the start of assignment, `END` at the end of a block. Use `current()` (without consuming) when you're peeking to decide which branch to take.

---

## Key Insights Summary

- **EBNF rules map directly to methods** — read the grammar, write the function
- **Sequence → sequential calls**, **alternation → if/switch**, **repetition → while loop**, **optional → if**
- **Precedence comes from nesting** — operators handled deeper in the chain bind tighter
- **The call stack mirrors the tree** — the shape of recursive calls during parsing is the shape of the AST
- **No tables, no state machine** — just functions calling functions, the grammar describes itself
