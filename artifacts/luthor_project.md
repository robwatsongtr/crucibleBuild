# Luthor Language — Project Context

## Overview
Luthor is a custom interpreted programming language, initially built in Python as a learning project, then fully rewritten in C++. The C++ rewrite is complete and at parity with the Python version.

The goal is to understand the core source-to-output pipeline: lexing, parsing, AST construction, and tree-walking interpretation. Keywords are themed after Lex Luthor, inspired by the fact that a core language component is called a *lexer*.

The C++ implementation is ~1k lines, hand-coded, compact, and not over-engineered.

AGENTS / LLM : DO NOT GIVE CODE, JUST GUIDANCE LIKE A TEACHER.

---

## Python Implementation

The pipeline is: **source string → Lexer → Parser → AST → Interpreter → output**

The original Python version (~500 lines) is in `python/src/` and uses `isinstance`-based dispatch rather than the visitor pattern.

### Tokens (`tokens.py`)
- Arithmetic: `PLUS`, `MINUS`, `MULTIPLY`, `DIVIDE`
- Grouping: `L_PARENS`, `R_PARENS`
- Comparison: `LESS_THAN`, `GREATER_THAN`, `LESS_THAN_EQUAL`, `GREATER_THAN_EQUAL`, `EQUAL_TO`, `NOT_EQUAL`
- Values: `NUMBER`, `IDENTIFIER`
- Keywords: `KNOW` (assignment), `SUPPOSE` (if), `OTHERWISE` (else), `END` (block delimiter), `DOOM` (print), `CRIME` (while loop)
- `EOF`

### Lexer (`lexer.py`)
- Handles whitespace, single-char tokens via `single_char_map`
- Multi-character comparison tokens via `peek`/`peek_next` state transition
- Keywords via `keyword_map`, falls back to `IDENTIFIER`
- Numeric literals
- Raises `ValueError` on unexpected characters

### Parser (`parser.py`)
- Recursive descent
- Precedence chain: `expression → comparison → term → factor → unary → primary`
- `primary` handles `NUMBER`, `IDENTIFIER`, and parenthesized expressions
- `comparison` handles all six comparison operators via class-level `comparison_tokens` list
- `assignment` method — consumes `KNOW`, `IDENTIFIER`, then parses expression; not part of precedence chain
- `block` method — loops collecting statements until `END`, returns `BlockNode`
- `consume` does validation and advances in one step; includes `None` guard for unexpected EOF
- `conditional` method — consumes `SUPPOSE`, parses condition expression, then-block, optional `OTHERWISE` else-block
- `while_statement` method — consumes `CRIME`, parses condition expression and body block, returns `WhileNode`
- `print_statement` method — consumes `DOOM`, parses expression, returns `PrintNode`
- `statement` method — dispatcher; peeks at current token and routes to `assignment`, `conditional`, `while_statement`, `print_statement`, or `expression`
- `unary` method — checks for leading `-` token; if found consumes it, parses `primary`, returns `UnaryOpNode`; otherwise passes through to `primary`
- `program` method — entry point; loops collecting statements until EOF, returns `ProgramNode`

### Nodes (`nodes.py`)
- `BinaryOpNode(op, left, right)` — binary operations
- `NumberNode(number)` — numeric literals
- `IdentifierNode(identifier)` — leaf node for variable references
- `AssignNode(var_name, expression)` — stores variable name and expression to assign
- `BlockNode(statements)` — container for a list of statement nodes
- `ConditionalNode(condition, then_block, else_block)` — conditional branching; `else_block` can be `None`
- `WhileNode(condition, body_block)` — while loop; re-evaluates condition each iteration
- `UnaryOpNode(op, operand)` — unary operations; operand is a single child node
- `PrintNode(expression)` — wraps an expression to print
- `ProgramNode(statements)` — top-level container for all statements

### Interpreter (`interpreter.py`)
- Tree walker using `isinstance` dispatch chain
- `symbol_table` — plain dict for variable storage, initialized in `__init__`
- `binary_op_map` — maps `TokenType` to Python `operator` functions (arithmetic + comparison operators)
- `unary_op_map` — maps `TokenType` to Python unary `operator` functions (`MINUS` → `operator.neg`)
- `run()` method — entry point; loops through `program.statements` and calls `evaluate()` on each
- `evaluate(node)` method — type-based dispatch that handles all node types:
  - `NumberNode` — returns the numeric value (base case)
  - `IdentifierNode` — looks up variable in symbol table, raises error if undefined
  - `BinaryOpNode` — recursively evaluates left/right children, applies operator via `binary_op_map`
  - `UnaryOpNode` — evaluates operand, applies unary operator via `unary_op_map`
  - `AssignNode` — evaluates expression, stores result in symbol table (mutation enables loops)
  - `PrintNode` — evaluates expression, prints result to console
  - `BlockNode` — loops through statements, evaluates each
  - `ConditionalNode` — evaluates condition, branches to then/else blocks based on truthiness
  - `WhileNode` — evaluates condition, loops body while truthy, re-evaluates condition each iteration

## C++ Implementaton 

The pipeline is: **source string → Lexer → token stream → Parser → AST → Runner → Interpreter → output**

### C++ File Structure (`cpp/`)
- `main.cpp` — entry point; reads `.lut` source file, runs pipeline, prints each stage
- `src/tokens.h` — `enum class TokenType` and `Token` struct with `toString()`
- `src/lexer.h` / `src/lexer.cpp` — `Lexer` class
- `src/nodes.h` — AST node hierarchy, `Visitor` interface, `accept` dispatch
- `src/parser.h` / `src/parser.cpp` — `Parser` class (recursive descent)
- `src/interpreter.h` / `src/interpreter.cpp` — `Interpreter` class (visitor, tree walker)
- `src/runner.h` / `src/runner.cpp` — `Runner` class; owns `ProgramNode`, drives the visitor loop.       Allows addition of other visitors easily, like a bytecode emitter. 
- `Makefile` — builds with `g++ -std=c++17`
 


### Sample Programs (`cpp/`)
- `fib.lut` — Fibonacci sequence (first 10 terms)
- `countdown.lut` — countdown from 10 with running total
- `test_bool.lut` — boolean comparison output

---

## C++ Design Decisions

### Ownership: `unique_ptr`
All AST nodes are heap-allocated and owned via `std::unique_ptr<ASTNode>`. Children are moved into parent nodes at construction. Ownership is unambiguous: when a node goes out of scope, it and all its children are automatically freed (RAII).

### Runtime Values: `std::variant<double, bool>`
```cpp
using LuthorValue = std::variant<double, bool>;
std::unordered_map<std::string, LuthorValue> symbol_table;
```
Arithmetic results are `double`; comparison results are `bool`. The `result` member on `Interpreter` acts as a side-channel return value since `visit()` is `void`.

### Visitor Pattern
The interpreter uses double dispatch. Every node implements `accept(Visitor&)`, which calls back `v.visit(*this)` with the concrete type. The `Interpreter` inherits from `Visitor` and provides one `visit` overload per node type.

```
evaluate(node)
  → node.accept(*this)
    → v.visit(*this)           // dispatch 1: vtable on node
      → Interpreter::visit(ConcreteType&)   // dispatch 2: overload on concrete type
```

The `Visitor` struct declares a pure virtual `visit` for every node type — the compiler enforces that no node can be silently skipped.

### Runner
`Runner` owns the `ProgramNode` and iterates its statements, calling `stmt->accept(v)` for each. This separates traversal control from evaluation logic and makes it straightforward to swap in a different visitor (e.g. a future printer or type checker).

---

## Token Set

| Token | Description |
|---|---|
| `PLUS`, `MINUS`, `MULTIPLY`, `DIVIDE` | Arithmetic |
| `L_PARENS`, `R_PARENS` | Grouping |
| `LESS_THAN`, `GREATER_THAN` | Comparison (single char) |
| `LESS_THAN_EQUAL`, `GREATER_THAN_EQUAL`, `EQUAL_TO`, `NOT_EQUAL` | Comparison (multi-char) |
| `NUMBER` | Numeric literal |
| `IDENTIFIER` | Variable name |
| `KNOW` | Variable assignment |
| `SUPPOSE` | If statement |
| `OTHERWISE` | Else clause |
| `END` | Block terminator |
| `DOOM` | Print statement |
| `CRIME` | While loop |
| `END_OF_FILE` | Stream end |

---

## AST Nodes

| Node | Fields |
|---|---|
| `ProgramNode` | `vector<unique_ptr<ASTNode>> statements` |
| `BlockNode` | `vector<unique_ptr<ASTNode>> statements` |
| `AssignNode` | `string var_name`, `unique_ptr<ASTNode> expression` |
| `ConditionalNode` | `condition`, `then_block`, `else_block` (nullable) |
| `WhileNode` | `condition`, `body_block` |
| `PrintNode` | `unique_ptr<ASTNode> expression` |
| `BinaryOpNode` | `Token op_type`, `left`, `right` |
| `UnaryOpNode` | `Token op_type`, `unique_ptr<ASTNode> operand` |
| `NumberNode` | `double number` |
| `IdentifierNode` | `string identifier` |

All nodes implement `toString()` for debug output and `accept(Visitor&)` for dispatch.

---

## Lexer

- Advances through the source string character by character using `peek()` / `peek_next()` / `advance()`
- `single_char_map` handles `+`, `-`, `*`, `/`, `(`, `)`, `<`, `>`
- Multi-char tokens (`<=`, `>=`, `==`, `!=`) detected by checking if `peek_next()` is `=`
- Identifiers: alphanumeric + `_`; looked up in `keyword_map`, fallback to `IDENTIFIER`
- Numbers: digit runs; stored as string lexeme, converted to `double` in parser
- Throws `std::invalid_argument` on unexpected characters

---

## Parser

Recursive descent. Precedence chain (lowest to highest):

```
program → statement*
statement → assignment | conditional | while_statement | print_statement | expression
assignment → 'know' IDENTIFIER expression
conditional → 'suppose' expression block ('otherwise' block)?
while_statement → 'crime' expression block
print_statement → 'doom' expression
block → statement* 'end'
expression → comparison
comparison → term (('==' | '!=' | '<' | '>' | '<=' | '>=') term)*
term → factor (('+' | '-') factor)*
factor → unary (('*' | '/') unary)*
unary → ('-')? primary
primary → NUMBER | IDENTIFIER | '(' expression ')'
```

- `statement()` dispatches via `switch` on current token type
- `consume(expected)` validates the token type and advances; throws on mismatch or EOF
- `block()` collects statements until `END` token
- `comparison_tokens` is a static `vector<TokenType>` used with `contains()` helper
- All methods return `unique_ptr<ASTNode>`

---

## Interpreter

Inherits from `Visitor`. Implements one `visit()` per node type. Uses `result` member as return channel.

- `evaluate(ASTNode&)` — entry point; calls `node.accept(*this)`
- `visit(NumberNode&)` — `result = node.number`
- `visit(IdentifierNode&)` — looks up symbol table; throws if undefined
- `visit(BinaryOpNode&)` — captures left and right results, looks up `binary_op_map`
- `visit(UnaryOpNode&)` — captures operand result, looks up `unary_op_map`
- `visit(AssignNode&)` — evaluates expression, stores in `symbol_table`
- `visit(PrintNode&)` — evaluates expression, prints with `std::get_if` for type dispatch
- `visit(BlockNode&)` — loops and evaluates each statement
- `visit(WhileNode&)` — evaluates condition as `bool`, loops body while true
- `visit(ConditionalNode&)` — evaluates condition, branches to then or optional else block
- `visit(ProgramNode&)` — throws; `Runner` handles the top level, not the interpreter

`binary_op_map` maps `TokenType` → `function<variant<double,bool>(double, double)>`.
`unary_op_map` maps `TokenType` → `function<variant<double,bool>(double)>`.
Both are `static const` members initialized with lambdas.

---

## Current Capabilities

- **Variable assignment** — `know x 10`
- **Arithmetic** — `+`, `-`, `*`, `/` with correct precedence
- **Unary negation** — `-x`, `-5`, `-(expr)`
- **Comparison** — `<`, `>`, `<=`, `>=`, `==`, `!=`; result is `bool`
- **Conditionals** — `suppose`/`otherwise`/`end`
- **While loops** — `crime` keyword
- **Print** — `doom` outputs numbers and booleans
- **Nested expressions** — parentheses, arbitrary nesting
- **Turing complete** — variables + conditionals + loops

---

## Example Programs

**Fibonacci:**
```
know i 0
know a 0
know b 1
crime i < 10
    doom a
    know temp b
    know b a + b
    know a temp
    know i i + 1
end
```

**Countdown with running total:**
```
know count 10
know total 0
crime count > 0
    doom count
    know total total + count
    doom total
    know count count - 1
end
```

**Boolean output:**
```
know x 5
know y 10
doom x < y    # > True
doom x > y    # > False
doom x == y   # > False
doom x != y   # > True
```

---

## Building and Running

```bash
cd cpp
make
./luthor source.lut
```

Source files use `.lut` by convention. The binary prints each pipeline stage (tokens, AST, then output) for educational visibility.

---

## Future Additions

- **Functions** — reusable code blocks, parameters, return values; requires call stack and scope management
- **Strings** — string literals, concatenation, string operations
- **Boolean literals** — explicit `true`/`false` keywords
- **Logical operators** — `and`, `or`, `not`
- **Arrays/Lists** — collections
- **For loops** — syntactic sugar over `crime`
- **Better error messages** — line numbers, diagnostics, stack traces
- **Bytecode compiler + VM** — compile AST to bytecode, interpret in a virtual machine (faster than tree walking)
- **Standard library** — built-in functions for I/O, math, strings

---



### Python vs C++ Dispatch
The key structural difference: Python uses an `isinstance` chain in `evaluate()`, while C++ uses the visitor pattern with double dispatch. The visitor pattern enforces completeness at compile time — the compiler will error if a new node type is added without a corresponding `visit()` overload. The `isinstance` chain fails silently at runtime.

---

## Notes
- `=` alone is not a token; assignment uses `know`, no `=` needed
- The visitor pattern enforces completeness at compile time — adding a node type requires updating `Visitor` and all implementors
- `ProgramNode` is handled by `Runner`, not `visit(ProgramNode&)` — that overload throws if reached
- Numbers are stored as `double` throughout; integer display depends on the value
- The Python version remains in `python/` as a readable reference implementation
