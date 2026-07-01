# Lexing — How It Works

## The Problem the Lexer Solves

For the Luthor language, source code is just a string, which is essentially what a text file is, and source code is just a text file with an extension that identifies the language. Before anything meaningful can happen, that string needs to be broken into pieces the rest of the pipeline can reason about.

Consider this Luthor program:

```
know x 3 + 4
```

To a computer, that's just characters:

```
k n o w   x   3   +   4
```

The parser can't work with characters. It needs to know that `know` is a keyword, `x` is an identifier, `3` is a number, `+` is an operator, and `4` is another number. That classification — turning a raw character stream into a stream of meaningful tokens — is what the lexer does.

```
"know x 3 + 4"
        ↓  lexer
KNOW  IDENTIFIER(x)  NUMBER(3)  PLUS  NUMBER(4)  EOF
```

The parser never sees the source string. It only ever sees tokens.

---

## What a Token Is

A token is a pair: a **type** and optionally a **lexeme**.

- The **type** is the classification — `KNOW`, `IDENTIFIER`, `NUMBER`, `PLUS`, etc.
- The **lexeme** is the original text — `"x"`, `"3"`, `"know"`

Some tokens carry their lexeme because the value matters (`IDENTIFIER("x")`, `NUMBER("42")`). Others don't need it because the type says everything (`PLUS`, `EOF`).

---

## How the Lexer Works

The lexer maintains a **cursor** — a position in the source string. It works character by character:

1. Look at the current character
2. Decide what kind of token it starts
3. Consume as many characters as belong to that token
4. Emit the token
5. Repeat until end of string

This is a simple **state machine** — at each step, the current character determines what to do next. What language constructs are typically used for state machines?

The classic answer is a `switch` statement (or `match` in Python 3.10+). But `if/elif` chains are equally valid for a lexer of this size — each branch handles one character class, the structure is flat and readable, and there's no meaningful performance difference at this scale. Don't let the word "state machine" make you reach for something more complex than the problem requires.

### Single-character tokens

The easy case: one character, one token.

```
+  →  PLUS
-  →  MINUS
*  →  MULTIPLY
/  →  DIVIDE
(  →  L_PARENS
)  →  R_PARENS
```

See a `+`, emit `PLUS`, advance. Done.

### Multi-character tokens — the lookahead problem

Some tokens are two characters: `<=`, `>=`, `==`, `!=`. You can't tell from `<` alone whether you're looking at `LESS_THAN` or `LESS_THAN_EQUAL`. You need to look at the *next* character before deciding.

This is **lookahead** — peeking ahead without consuming.

```
current char: '<'
next char: '='   →  emit LESS_THAN_EQUAL, advance twice
next char: anything else  →  emit LESS_THAN, advance once
```

The lexer needs two operations for this:
- `peek()` — returns the current character without advancing
- `peek_next()` — returns the *next* character without advancing
- `advance()` — consumes and returns the current character, moves the cursor forward

Most of the lexer is just `peek()` to decide, `advance()` to consume.

### Identifiers and keywords

When the lexer sees a letter, it doesn't know yet whether it's looking at a keyword (`know`, `suppose`, `crime`) or a variable name (`x`, `count`, `total`). It can't tell until it's consumed the whole word.

The solution: treat everything as an identifier first, then check a keyword map afterward.

```
see a letter
  consume characters while alphanumeric or '_'
  look up the whole word in keyword_map
  if found → emit that keyword token (KNOW, SUPPOSE, etc.)
  if not found → emit IDENTIFIER with the word as lexeme
```

This is why keywords are reserved — `know` can never be a variable name because it will always match the keyword map before falling through to `IDENTIFIER`.

### Numbers

When the lexer sees a digit, it consumes characters as long as they're digits, then emits a `NUMBER` token with the digit string as the lexeme. The conversion from string to actual number (`"42"` → `42.0`) happens later in the parser, not here. The lexer's job is just to identify the boundary of the number, not interpret it.

### Whitespace

Whitespace is consumed and discarded — it's just a separator. The lexer advances past spaces, tabs, and newlines without emitting anything.

---

## The peek / peek_next / advance Pattern

These three operations are the entire interface the lexer uses to move through the source:

```
peek():
    if position is past end of source → return None
    return character at current position (do not advance)

peek_next():
    if position + 1 is past end of source → return None
    return character at position + 1 (do not advance)

advance():
    capture character at current position
    move position forward by one
    return the captured character
```

The main loop calls `peek()` to decide what kind of token is starting, then calls `advance()` one or more times to consume it. `peek_next()` is only needed for the two-character comparison tokens.

`peek()` returning `None` and the `tokenize()` loop checking for `None` are two halves of the same design. `peek()` doesn't need a special EOF sentinel — it just returns `None` when the position is past the end of the source. The first check in `tokenize()`'s `while True` loop is `if self.peek() is None`: append `Token(TokenType.EOF, '')` and return. That's the entire EOF handling. No additional guard logic needed in `peek()` itself.

---

## Worked Example: `know x <= 10`

Characters: `k n o w   x   < =   1 0`

```
pos=0  peek()='k'  → letter, start identifier
  advance through 'k','n','o','w'  → lexeme = "know"
  lookup in keyword_map → found: KNOW
  emit KNOW

pos=4  peek()=' '  → whitespace, skip
  advance

pos=5  peek()='x'  → letter, start identifier
  advance through 'x'  → lexeme = "x"
  lookup in keyword_map → not found
  emit IDENTIFIER("x")

pos=6  peek()=' '  → whitespace, skip
  advance

pos=7  peek()='<'  → could be LESS_THAN or LESS_THAN_EQUAL
  peek_next()='='  → it's LESS_THAN_EQUAL
  advance twice
  emit LESS_THAN_EQUAL

pos=9  peek()=' '  → whitespace, skip
  advance

pos=10  peek()='1'  → digit, start number
  advance through '1','0'  → lexeme = "10"
  emit NUMBER("10")

pos=12  peek()=None  → end of string
  emit EOF
```

Result:
```
KNOW  IDENTIFIER("x")  LESS_THAN_EQUAL  NUMBER("10")  EOF
```

---

## What the Lexer Doesn't Do

The lexer is intentionally simple. It does not:

- Check whether tokens are in a valid order — that's the parser's job
- Interpret values — `NUMBER("42")` is still a string; conversion happens in the parser
- Understand scope, variables, or meaning — it just classifies characters

The lexer only needs to answer one question per character: *what token starts here, and where does it end?*

---

## Structure of tokenize()

`tokenize()` is the entry point — it runs the main loop and returns the completed token list. The token list should be a **local variable** inside `tokenize()`, not an instance variable on the class. It only exists during tokenization and has no purpose beyond that. Build it up locally, append to it as tokens are emitted, and return it at the end.

The lexer's instance state is just what it needs to traverse the source: the source string itself, the current position, and whatever is needed for `peek()`, `peek_next()`, and `advance()`. Everything else is local.

---

## The Three Lookup Structures

The lexer uses three class-level data structures to keep the main loop clean. They are static — defined on the class, not in `__init__` — because they never change between instances.

### `single_char_map`

A dict mapping single characters to their token type. The main loop checks `peek() in single_char_map` — if it matches, look up the type, emit the token, advance once. No branching needed — the map replaces eight `elif` branches with a single lookup.

Note that `<` and `>` are in `single_char_map`. They are valid single-character tokens on their own. The multi-character check runs *before* the single-character check, so `<=` is caught first and `<` alone is only reached when the next character is not `=`.

### `multi_start`

A list of characters that could begin a two-character token: `['<', '>', '=', '!']`. This is the gate for the lookahead branch — when `peek()` is in `multi_start` *and* `peek_next()` is `=`, you have a two-character token. Without this list, you'd need four separate `elif` branches just to enter the lookahead check.

### `keyword_map`

A dict mapping keyword strings to their token type. Used after consuming a full word — if the word is in `keyword_map`, emit the keyword token; if not, it's an `IDENTIFIER`. This is the mechanism that makes keywords reserved: a variable named `know` is impossible because `know` always matches the map first.

Together, the three structures mean the main loop stays flat and readable. Each branch handles one character class; the maps do the classification work inside.

---

## Key Insights Summary

- **The lexer converts raw characters into a token stream** — the parser never sees the source string
- **A token is a type + lexeme pair** — type is the classification, lexeme is the original text
- **The lexer is a state machine** — the current character determines what to do next
- **Lookahead resolves ambiguity** — `peek_next()` lets you distinguish `<` from `<=` before committing
- **Keywords are identifiers first** — consume the whole word, then check the keyword map
- **The token list is local to tokenize()** — build it up, return it; no need for it to live on the instance
- **The lexer does one thing** — classify character boundaries; interpretation is someone else's problem
