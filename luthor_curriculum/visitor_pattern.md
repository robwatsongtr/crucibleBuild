# Visitor Pattern in the Luthor Interpreter

## What the visitor pattern solves

The interpreter needs to handle different node types differently — a `NumberNode` is evaluated differently than a `BinaryOpNode`. In Python this is done with `isinstance` checks in one big `evaluate` method. In C++ you can't switch on runtime type cleanly without casts. The visitor pattern solves this using double dispatch.

---

## The two dispatch diagram

```
interpreter calls:
    node->accept(*this)
         │
         │  dispatch #1: vtable lookup on node
         │  "which concrete node type am I?"
         ▼
    NumberNode::accept(Visitor& v)
         │
         │  calls back into visitor
         ▼
    v.visit(*this)
         │
         │  dispatch #2: overload resolution on concrete *this type
         │  "which visit overload matches this node?"
         ▼
    Interpreter::visit(NumberNode& n)
         │
         │  does the actual work
         ▼
    result = node.number
```

Without both dispatches: `evaluate` would only see `ASTNode&` and have no way to know the concrete type.

---

## Setup in nodes.h

The structure requires three things working together:

**1. A forward declaration of `Visitor` at the top of `nodes.h`** — tells the compiler the type exists before it's defined, so `ASTNode` can reference it:

```
forward declare: struct Visitor
```

**2. A base `ASTNode` with a pure virtual `accept` method** — every node must implement this:

```
struct ASTNode:
    pure virtual: accept(Visitor&)
    virtual destructor
```

**3. Each concrete node implements `accept` by calling back into the visitor with its own concrete type:**

```
struct NumberNode inherits ASTNode:
    accept(Visitor& v):
        v.visit(*this)    ← *this is NumberNode, not ASTNode

struct BinaryOpNode inherits ASTNode:
    accept(Visitor& v):
        v.visit(*this)    ← *this is BinaryOpNode, not ASTNode
```

**4. The `Visitor` struct declares a pure virtual `visit` overload for every concrete node type** — defined after all nodes so it can reference them:

```
struct Visitor:
    pure virtual: visit(NumberNode&)
    pure virtual: visit(BinaryOpNode&)
    pure virtual: visit(AssignNode&)
    ... one per concrete node type
    virtual destructor
```

The compiler enforces completeness: you cannot create a concrete `Visitor` subclass without implementing every `visit` overload.

---

## Interpreter structure

The `Interpreter` inherits from `Visitor` and implements one `visit` method per node type.

The entry point takes the base type — dispatch handles the rest:

```
evaluate(ASTNode& node):
    node.accept(*this)
```

Each `visit` method does the actual work for that node type. For leaf nodes, no recursion:

```
visit(NumberNode& node):
    result ← node.number
```

For recursive nodes, evaluate children first, capture the result immediately after each call (because the next call will overwrite it), then combine:

```
visit(BinaryOpNode& node):
    evaluate(node.left)
    left ← result          ← capture before next evaluate overwrites result

    evaluate(node.right)
    right ← result         ← capture before anything overwrites result

    result ← apply operator to left and right
```

`result` is a member variable on `Interpreter`. Since `visit` returns `void`, it uses `result` as a side channel to pass values back up the call stack.

---

## Key insights

**Visitor vs Python isinstance**
- Python: one `evaluate` with `isinstance` branches, returns value directly up the call stack
- C++: `evaluate` calls `accept`, which dispatches to the right `visit` overload; result flows through a `result` member variable
- Same logic, different dispatch mechanism and return path

**The boilerplate enforces completeness**
- The compiler won't let you create a concrete `Visitor` that ignores any node type
- If you add a new node, you must add it to `Visitor` and implement `visit` for it — no node falls through silently
- This is the thing Python's `isinstance` chain cannot do — a missing branch fails silently at runtime

**Visitor is a shadow vtable**
- The compiler builds a vtable for `Visitor` with all the `visit` overloads
- When `v.visit(*this)` is called, the vtable routes to the right implementation
- It's vtable dispatch explicitly written out as a class hierarchy

**Why two dispatches?**
- `node->accept()` resolves which concrete node type you're dealing with (runtime, via vtable)
- `v.visit(*this)` routes to the correct `visit` overload for that type (compile-time overload resolution, but on the concrete type exposed by `*this`)
- You need both because C++ overload resolution is compile-time — without `accept` surfacing the concrete type, the compiler would only see `ASTNode&`

**Nodes are pure data**
- All evaluation logic lives in the interpreter, not the nodes
- Nodes just say "here I am" via `accept`
- You could add a `TypeChecker`, `Printer`, or `CodeGenerator` visitor without touching the nodes at all

---

## The recursion

The interpreter still recurses through the tree — it's just routed through `accept`/`visit` instead of direct recursive calls:

```
evaluate(ProgramNode)
└── visit(ProgramNode) — loops over statements
    └── evaluate(AssignNode)
        └── visit(AssignNode) — evaluates expression child
            └── evaluate(BinaryOpNode)
                └── visit(BinaryOpNode)
                    ├── evaluate(NumberNode) → result = 3
                    └── evaluate(NumberNode) → result = 4
                    result = 3 + 4 = 7
            symbol_table["x"] = 7
```

Post-order traversal: children before parent, leaves first, tree assembled bottom-up.
