# C++ Rewrite — Core Concepts Reference

## The Big Picture

Python hides memory management behind the runtime. C++ makes it explicit.
Every variable in Python is secretly a pointer to a heap object — C++ just
makes you write that out. When rewriting Luthor in C++, you're not learning
new concepts, you're making visible what Python was doing silently.

---

## Ownership and `unique_ptr`

When you heap allocate something, someone has to free it. **Ownership** is the
concept of "who is responsible for freeing this." In C++ you must be explicit
about it.

`unique_ptr` is a smart pointer that owns its heap object. When the
`unique_ptr` goes out of scope, it automatically calls `delete`. This pattern
is called **RAII** — the resource lifetime is tied to the object's lifetime.

```cpp
// Old way — manual, error prone
ASTNode* node = new NumberNode(3.14);
delete node;  // easy to forget

// Smart pointer way
auto node = std::make_unique<NumberNode>(3.14);
// delete called automatically when node goes out of scope
```

**Key rule:** you cannot *copy* a `unique_ptr` — only *move* it. Copying
would create two owners, violating uniqueness. Moving transfers ownership.

```cpp
return std::make_unique<NumberNode>(3.14);  // moves out of function — fine
```

Use `unique_ptr` by default. Use `shared_ptr` only when multiple things
genuinely need to own the same object (you won't need it for the AST).

---

## Type Erasure — The Core Problem

Python uses duck typing — a variable can hold anything and the runtime figures
out the type. C++ is statically typed, so you must be explicit when a variable
could hold one of several types. This is the central design challenge of the
rewrite.

There are two places this problem appears in Luthor:

| Problem | Where |
|---|---|
| AST nodes are different types stored in the same tree | `unique_ptr<ASTNode>` + inheritance |
| Runtime values (numbers, bools) stored in the symbol table | `std::variant<double, bool>` |

---

## Inheritance + Virtual Dispatch (for AST nodes)

Define a base class `ASTNode`. All node types inherit from it. Store them as
`unique_ptr<ASTNode>` — the pointer type is always the base, but it can point
to any subclass at runtime. Virtual dispatch handles "what type is this really"
without needing a tag.

```cpp
struct ASTNode {
    virtual ~ASTNode() = default;  // virtual destructor required
};

struct NumberNode : public ASTNode {
    double number;
    NumberNode(double n) : number(n) {}
};

struct BinaryOpNode : public ASTNode {
    TokenType op_type;
    std::unique_ptr<ASTNode> left;
    std::unique_ptr<ASTNode> right;

    BinaryOpNode(TokenType op, std::unique_ptr<ASTNode> l, std::unique_ptr<ASTNode> r)
        : op_type(op), left(std::move(l)), right(std::move(r)) {}
};
```

Creating a node:

```cpp
auto node = std::make_unique<BinaryOpNode>(
    TokenType::PLUS,
    std::make_unique<NumberNode>(1.0),
    std::make_unique<NumberNode>(2.0)
);
// when node goes out of scope, it deletes itself and both children
```

---

## Tagged Unions and `std::variant` (for runtime values)

A union is a block of memory with multiple named interpretations — all members
share the same bytes. In C you pair it with an enum "bookkeeper" to track
which member is currently valid. `std::variant` is the C++ version — same
idea, but the bookkeeper is managed automatically and violations are caught.

```cpp
using LuthorValue = std::variant<double, bool>;

LuthorValue val = 3.14;
double n = std::get<double>(val);       // throws if wrong type
double* p = std::get_if<double>(&val);  // returns nullptr if wrong type — safer
```

The symbol table:

```cpp
std::unordered_map<std::string, LuthorValue> symbol_table;
symbol_table["x"] = 42.0;
```

---

## Evaluation Strategy

Your Python `evaluate()` is already the visitor pattern — one central function
with `isinstance` branches per node type. The C++ rewrite maps directly:

| Python | C++ |
|---|---|
| `isinstance(node, NumberNode)` | virtual dispatch |
| `self.symbol_table` | `std::unordered_map<std::string, LuthorValue>` |
| `self.evaluate(node.left)` | `evaluate(*node->left)` |
| duck-typed return value | `std::variant<double, bool>` |

Consider splitting `evaluate()` into:
- `evaluate()` — expressions, returns `LuthorValue`
- `execute()` — statements (assign, print, while), returns `void`

---

## Suggested Rewrite Order

1. `tokens.h` — `enum class` for token types, `Token` struct (no pointers, good starting point)
2. `lexer.h/.cpp` — straightforward translation
3. `nodes.h` — AST hierarchy with `unique_ptr` children
4. `parser.h/.cpp` — returns `unique_ptr<ASTNode>` from each method
5. `interpreter.h/.cpp` — the tree walker with `LuthorValue` and symbol table
