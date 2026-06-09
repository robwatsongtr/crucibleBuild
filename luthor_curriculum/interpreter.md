# The Interpreter — Walking the Tree

## What the Interpreter Does

The parser hands you a tree. The interpreter's job is to walk that tree and produce output — running assignments, evaluating expressions, branching on conditions, looping.

The interpreter never sees source code. It never sees tokens. It only ever sees AST nodes. By the time it runs, the hard structural work is done. Precedence is baked into the tree shape. Block boundaries are encoded in `BlockNode`. The interpreter just has to walk.

---

## Tree-Walking Evaluation

The evaluation strategy is **post-order traversal** — children before parents, leaves first, root last.

To evaluate a `BinaryOpNode`, you:
1. Evaluate the left child — get a value
2. Evaluate the right child — get a value
3. Apply the operator to those two values — produce a result

You can't evaluate the operator until you have both operands. You can't have the operands until you've evaluated the children. So children always complete before parents.

This falls out naturally from recursion. `evaluate(node)` calls itself on children before doing its own work. The call stack handles the ordering automatically.

---

## isinstance Dispatch

The interpreter receives an `ASTNode`. But `ASTNode` is the base type — at runtime, the actual object is a `NumberNode` or `BinaryOpNode` or `AssignNode`. The interpreter needs to know which one in order to handle it correctly.

In Python, the standard tool for this is `isinstance` — a chain of checks that routes execution to the right handling code. The shape looks like this:

```
function evaluate(node):
    if node is a NumberNode:
        return its numeric value

    if node is an IdentifierNode:
        look up its name in the symbol table and return the value
        raise an error if it hasn't been assigned yet

    if node is a BinaryOpNode:
        left  ← evaluate(node.left)
        right ← evaluate(node.right)
        return apply the operator to left and right

    if node is an AssignNode:
        value ← evaluate(node.expression)
        store value in symbol table under node.var_name

    ... and so on for each node type
```

Each branch handles one node type. The recursive calls to `evaluate()` on child nodes are what make this a tree walker — each node delegates to its children before computing its own result.

---

## The Symbol Table

Variables need to be stored somewhere. The symbol table is a plain dictionary mapping variable names to their current values. It lives on the interpreter and is initialised empty.

- Assignment nodes write to it
- Identifier nodes read from it
- If a variable is read before it is assigned, raise an error

The symbol table is what makes loops possible. Each iteration of a `crime` loop re-evaluates the condition against the current symbol table. When the body updates a variable (`know count count - 1`), it mutates the symbol table. The next condition check sees the updated value.

---

## The Operator Maps

Rather than a chain of `if op == PLUS / elif op == MINUS` checks, the interpreter uses a dictionary mapping `TokenType` to operator functions. This keeps the `BinaryOpNode` handler short and the operator logic centralised.

The map contains entries for every arithmetic and comparison operator. When `BinaryOpNode` is evaluated, it looks up the operator type in the map and calls the function it finds there with the two operand values. Adding a new operator means adding one entry to the map — the node handler itself doesn't change.

The same pattern applies to `UnaryOpNode` — a smaller map covering just the unary operators.

---

## Worked Example: `know x 3 + 4 * 2` then `doom x`

AST:
```
ProgramNode
├── AssignNode("x")
│   └── BinaryOpNode(+)
│       ├── NumberNode(3)
│       └── BinaryOpNode(*)
│           ├── NumberNode(4)
│           └── NumberNode(2)
└── PrintNode
    └── IdentifierNode("x")
```

Evaluation trace:

```
evaluate(ProgramNode)
  evaluate(AssignNode("x"))
    evaluate(BinaryOpNode(+))
      evaluate(NumberNode(3))      → 3
      evaluate(BinaryOpNode(*))
        evaluate(NumberNode(4))    → 4
        evaluate(NumberNode(2))    → 2
        op_map[MULTIPLY](4, 2)     → 8
      → 8
      op_map[PLUS](3, 8)           → 11
    → 11
    symbol_table["x"] = 11
  evaluate(PrintNode)
    evaluate(IdentifierNode("x"))
      symbol_table["x"]            → 11
    output 11
```

Output: `11`

---

## What Changes in C++

The Python interpreter uses `isinstance` to dispatch — one `evaluate()` method with branches per node type. The C++ interpreter uses the **visitor pattern** with double dispatch instead.

The reason: C++ is statically typed. You can't switch on runtime type cleanly without casts. The visitor pattern solves this using virtual dispatch on the node and overload resolution on the visitor — two dispatches that together route execution to the right handler without any `isinstance` equivalent.

The logic is identical. The dispatch mechanism is different. When you build the C++ interpreter, you will feel exactly why the visitor pattern exists — it solves a problem you just lived with in Python.

See [`visitor_pattern.md`](./visitor_pattern.md) for the full explanation.

---

## Key Insights Summary

- **Post-order traversal** — children evaluate before parents; leaves are the base cases
- **isinstance dispatch** — one `evaluate()` method routes to the right handling code based on node type
- **The symbol table is a plain dict** — variables are stored and mutated here; loops work because the condition re-reads it each iteration
- **Statements produce side effects, expressions produce values** — assignment writes to the symbol table, print outputs a value, control flow decides what to execute
- **Operator maps keep the handlers clean** — one dict lookup instead of a chain of conditionals; adding an operator means adding one entry
- **The tree shape is the execution shape** — the interpreter doesn't reason about precedence or structure; the parser already encoded it
