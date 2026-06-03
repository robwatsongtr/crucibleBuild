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

```cpp
struct Visitor;  // forward declaration — says "this type exists, defined later"

struct ASTNode {
    virtual void accept(Visitor& v) = 0;  // every node must implement
};

struct NumberNode : ASTNode {
    void accept(Visitor& v) override { v.visit(*this); }  // *this is NumberNode
};

struct BinaryOpNode : ASTNode {
    void accept(Visitor& v) override { v.visit(*this); }  // *this is BinaryOpNode
};

// defined after all node structs so it can reference them
struct Visitor {
    virtual void visit(NumberNode& node) = 0;
    virtual void visit(BinaryOpNode& node) = 0;
    // ... one per concrete node type
    virtual ~Visitor() = default;
};
```

---

## Interpreter structure

```cpp
// evaluate is the entry point — takes base type, dispatch handles the rest
void Interpreter::evaluate(ASTNode& node) {
    node.accept(*this);
}

// leaf node — no children, just read the value
void Interpreter::visit(NumberNode& node) {
    result = node.number;
}

// recursive node — evaluate children first, then combine
void Interpreter::visit(BinaryOpNode& node) {
    node.left->accept(*this);
    double left = result;          // capture before next accept overwrites it

    node.right->accept(*this);
    double right = result;

    // apply operator, store in result
}
```

`result` is a member variable on `Interpreter`. Since `visit` returns `void`, it uses `result` as a side channel to pass values back up the call stack. Each `accept` call overwrites `result`, so capture it immediately after each call.

---

## Key insights

**Visitor vs Python isinstance**
- Python: one `evaluate` with `isinstance` branches, returns value directly up the call stack
- C++: `evaluate` calls `accept`, which dispatches to the right `visit` overload; result flows through a `result` member variable
- Same logic, different dispatch mechanism and return path

**The boilerplate enforces completeness**
- The compiler won't let you create a concrete `Visitor` that ignores any node type
- If you add a new node, you must add it to `Visitor` and implement `visit` for it — no node falls through silently

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
