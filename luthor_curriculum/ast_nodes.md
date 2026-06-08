# AST Nodes — Why a Tree

## Why Not Evaluate Directly?

When the parser sees `3 + 4 * 2`, a natural instinct is to evaluate it immediately — just compute the answer as you parse. Some simple calculators work this way.

The problem is that you can't always evaluate immediately. Consider:

```
know x 10
suppose x > 5
    doom x * 2
otherwise
    doom x
end
```

When the parser processes the `suppose` block, it doesn't yet know whether the condition is true. It can't evaluate the then-block or the else-block yet — it needs to parse both, store them, and only evaluate one of them later when the interpreter runs.

The same problem applies to loops. The body of a `crime` loop needs to be executed multiple times, re-evaluated on each iteration. You can't evaluate it once during parsing and be done.

**The parser's job is to understand structure. The interpreter's job is to evaluate it.** An AST is how the parser hands its understanding to the interpreter.

---

## What an AST Is

An **Abstract Syntax Tree** is a tree where each node represents a syntactic construct in the program. The tree captures the structure and meaning of the program without the original source text.

"Abstract" means irrelevant details are dropped — whitespace, parentheses, the exact spelling of keywords. What remains is pure structure.

`3 + 4 * 2` as an AST:

```
BinaryOpNode(+)
├── NumberNode(3)
└── BinaryOpNode(*)
    ├── NumberNode(4)
    └── NumberNode(2)
```

The parentheses are gone. The operator precedence is baked into the tree shape — `*` is deeper, so it evaluates first. The interpreter doesn't need to think about precedence at all. The parser already encoded it.

---

## One Node Type Per Construct

Each distinct thing a Luthor program can express gets its own node type. Nodes are pure data — they hold the pieces of a construct and nothing else. They don't know how to evaluate themselves.

### Expression nodes

**`NumberNode`** — a numeric literal
```
fields: number (the value as a float)
example: NumberNode(3.14)
```

**`IdentifierNode`** — a variable reference
```
fields: identifier (the variable name as a string)
example: IdentifierNode("x")
```

**`BinaryOpNode`** — two operands and an operator
```
fields: op (TokenType), left (ASTNode), right (ASTNode)
example: BinaryOpNode(PLUS, NumberNode(3), NumberNode(4))
```

**`UnaryOpNode`** — one operand and an operator
```
fields: op (TokenType), operand (ASTNode)
example: UnaryOpNode(MINUS, IdentifierNode("x"))
```

### Statement nodes

**`AssignNode`** — variable assignment
```
fields: var_name (string), expression (ASTNode)
example: AssignNode("x", NumberNode(10))
```

**`PrintNode`** — print a value
```
fields: expression (ASTNode)
example: PrintNode(IdentifierNode("x"))
```

**`ConditionalNode`** — if/else
```
fields: condition (ASTNode), then_block (BlockNode), else_block (BlockNode | None)
```

**`WhileNode`** — while loop
```
fields: condition (ASTNode), body_block (BlockNode)
```

### Container nodes

**`BlockNode`** — a sequence of statements
```
fields: statements (list of ASTNodes)
```

**`ProgramNode`** — the entire program
```
fields: statements (list of ASTNodes)
```

---

## Nodes Are Just Data

This is worth emphasising. A `BinaryOpNode` does not know how to add. A `WhileNode` does not know how to loop. They are structs — data containers that describe what the program says.

All the logic lives in the interpreter. This separation is not just tidiness — it is what makes the visitor pattern possible in the C++ rewrite. Because nodes are pure data with no behaviour, you can plug any number of different visitors into them: an interpreter, a type checker, a printer, a bytecode emitter. None of them require touching the nodes.

---

## The Tree Reflects the Program

The shape of the AST directly reflects the structure of the program. A nested expression produces a deeper tree. A flat sequence of statements produces a wide tree. You can read a program by reading its tree.

`know x 3 + 4 * 2`:

```
ProgramNode
└── AssignNode("x")
    └── BinaryOpNode(+)
        ├── NumberNode(3)
        └── BinaryOpNode(*)
            ├── NumberNode(4)
            └── NumberNode(2)
```

`suppose x > 0` / `doom x` / `otherwise` / `doom 0` / `end`:

```
ProgramNode
└── ConditionalNode
    ├── condition: BinaryOpNode(>, IdentifierNode("x"), NumberNode(0))
    ├── then_block: BlockNode
    │   └── PrintNode(IdentifierNode("x"))
    └── else_block: BlockNode
        └── PrintNode(NumberNode(0))
```

The interpreter will walk this tree top-down, evaluating each node by recursing into its children. The tree structure is the execution structure.

---

## The Deeper Shape: A Linear Spine With Trees Hanging Off It

Look carefully at the full structure of a Luthor program. `ProgramNode` holds a flat **list** of statements. `BlockNode` holds a flat list of statements. That list is sequential — statement 1, then statement 2, then statement 3. The interpreter walks it with a `for` loop, not recursion.

The trees come off each individual statement. An `AssignNode` has an expression child that can be a deeply nested `BinaryOpNode` tree. A `WhileNode` has a condition tree and a body that is itself a linear list of statements, each with their own expression trees hanging off them.

The real shape of a Luthor program:

```
ProgramNode  ← linear list
├── AssignNode              ← expression tree hangs here
│   └── BinaryOpNode(+)
│       ├── NumberNode(3)
│       └── BinaryOpNode(*)
│           ├── NumberNode(4)
│           └── NumberNode(2)
├── WhileNode               ← expression tree for condition
│   ├── condition: BinaryOpNode(>)
│   │   ├── IdentifierNode("x")
│   │   └── NumberNode(0)
│   └── body: BlockNode  ← another linear list
│       └── AssignNode      ← expression tree hangs here
│           └── ...
└── PrintNode               ← expression tree hangs here
    └── IdentifierNode("x")
```

The spine is linear. The expressions branching off that spine are trees.

This is not a quirk of Luthor. It is the fundamental shape of every imperative programming language. Python, JavaScript, C++, Rust — all of them have this same duality baked in:

- **The linear spine is sequential execution** — the imperative model. Do this, then this, then this. Statements run in order.
- **The expression trees are composable values** — the functional model living inside the imperative one. Nestable, recursive, evaluate to a value.

The reason you can write `f(g(x) + h(y) * z)` in any language is because expressions are trees and trees are recursively composable. You can nest arbitrarily deep. The parser handles it naturally because recursive descent mirrors the recursive structure. The interpreter handles it naturally because tree recursion mirrors the tree shape.

This is also what enables higher level languages to build more complex software. When a language gives you lambdas, closures, method chains, or generics — it is giving you more powerful ways to build those expression trees. A lambda is a subtree you can pass around. A method chain is a spine of expression trees. The abstraction keeps compressing more meaning into the expression side while the statement spine stays simple.

You are building this structure from scratch. Most developers work at the top of it their entire careers without ever seeing the shape underneath.

---

## Key Insights Summary

- **You can't always evaluate immediately** — conditionals and loops need their bodies stored for later; the AST is that storage
- **Nodes are pure data** — no evaluation logic; they describe structure, the interpreter provides behaviour
- **One node type per construct** — each distinct syntactic thing gets its own type with its own fields
- **Tree shape encodes precedence and structure** — the interpreter doesn't need to re-derive it; the parser already did that work
- **Separation of parser and interpreter** — the AST is the handoff point; the parser builds it, the interpreter walks it
- **The AST has a linear spine and expression trees** — statement lists are sequential (the imperative model); expressions are recursively composable trees (the functional model inside the imperative one); every higher level language is built on this same duality
