# Trees and Recursion

## Why This Matters

The parser builds a tree. The interpreter walks it. Both use recursion to do their work. If recursion doesn't feel natural yet — if you have to mentally simulate it step by step every time — the parser and interpreter will be harder than they need to be.

This doc builds the intuition. By the end, the recursive structure of both components should feel inevitable rather than clever.

---

## What a Tree Is

A tree is a data structure where each node can have zero or more children. Every node except the root has exactly one parent. Nodes with no children are called **leaves**.

```
        root
       /    \
      A      B
     / \      \
    C   D      E
```

- `root` has children `A` and `B`
- `A` has children `C` and `D`
- `B` has child `E`
- `C`, `D`, `E` are leaves

Trees show up everywhere in programming because they naturally represent **hierarchical structure** — things that contain other things of the same kind.

An arithmetic expression is hierarchical: `3 + 4 * 2` contains a `+` operation, whose right side contains a `*` operation. That nesting is a tree:

```
    +
   / \
  3   *
     / \
    4   2
```

This is exactly what the parser builds and the interpreter walks.

---

## Pure Recursion

A recursive function is one that calls itself. Every recursive function has two parts:

- **Base case** — a condition where it returns directly without calling itself
- **Recursive case** — where it does some work and calls itself on a smaller version of the problem

The classic example — summing a list:

```python
def sum_list(numbers):
    if len(numbers) == 0:   # base case
        return 0

    first = numbers[0]
    rest = numbers[1:]

    return first + sum_list(rest)   # recursive case
```

Trace `sum_list([3, 4, 2])`:

```
sum_list([3, 4, 2])
  = 3 + sum_list([4, 2])
        = 4 + sum_list([2])
              = 2 + sum_list([])
                    = 0
              = 2 + 0 = 2
        = 4 + 2 = 6
  = 3 + 6 = 9
```

Notice the pattern: the function keeps calling itself on smaller and smaller input until it hits the base case. Then the results bubble back up through all the waiting call frames.

**The call stack is the mechanism.** Each call to `sum_list` pauses at the `return` statement, waiting for the inner call to finish. When the inner call returns, execution resumes. The stack of paused frames unwinds from the bottom up.

---

## Tree Recursion

Recursing over a tree works the same way — but instead of peeling off one element at a time, you recurse on each child.

A simple tree node:

```python
class Node:
    def __init__(self, value, children=None):
        self.value = value
        self.children = children or []
```

Summing all values in a tree:

```python
def sum_tree(node):
    if len(node.children) == 0:   # base case: leaf node
        return node.value

    total = node.value
    for child in node.children:
        total += sum_tree(child)   # recurse on each child

    return total
```

Trace on this tree:

```
        10
       /  \
      3    4
     / \
    1   2
```

```
sum_tree(10)
  = 10 + sum_tree(3) + sum_tree(4)
         = 3 + sum_tree(1) + sum_tree(2)
               = 1             = 2
         = 3 + 1 + 2 = 6
                              sum_tree(4) = 4
  = 10 + 6 + 4 = 20
```

**Key insight: children before parent.** The recursive calls on children complete before the parent node finishes. This is **post-order traversal** — leaves first, root last. The Luthor interpreter uses exactly this: evaluate both sides of a `BinaryOpNode` before computing the result.

---

## Mutual Recursion

Mutual recursion is when two or more functions call each other. Neither one is purely self-referential — they depend on each other.

A simple example — classifying numbers as even or odd without using `%`:

```python
def is_even(n):
    if n == 0:
        return True
    return is_odd(n - 1)

def is_odd(n):
    if n == 0:
        return False
    return is_even(n - 1)
```

`is_even` calls `is_odd`, which calls `is_even`, back and forth until one of them hits its base case.

Trace `is_even(3)`:

```
is_even(3)
  → is_odd(2)
    → is_even(1)
      → is_odd(0)
        → False
```

This feels strange at first. The key is that each call has a smaller argument — the recursion terminates because it always moves toward the base case.

---

## Mutual Recursion in the Parser

The Luthor parser is mutually recursive. Look at the grammar:

```
expression  → comparison
comparison  → term ...
term        → factor ...
factor      → unary ...
unary       → primary | ...
primary     → NUMBER | IDENTIFIER | '(' expression ')'
```

`primary` can contain a parenthesized `expression`. `expression` calls `comparison`, which calls `term`, which calls `factor`, which calls `unary`, which calls `primary` — which can call `expression` again.

```
expression()
  → comparison()
    → term()
      → factor()
        → unary()
          → primary()
            → '(' expression() ')'   ← calls back to the top
```

This is mutual recursion across a chain of functions. It terminates because each call consumes tokens — eventually you hit a `NUMBER` or `IDENTIFIER` that doesn't recurse further.

Parsing `(3 + 4) * 2`:

```
factor()
  unary()
    primary()           ← sees '('
      advance()         ← consume '('
      expression()      ← recurse into full expression
        ...             ← parses 3 + 4, returns BinaryOpNode(+, 3, 4)
      consume(')')      ← consume ')'
      returns BinaryOpNode(+, 3, 4)
  sees '*'
  unary()
    primary() → NumberNode(2)
  returns BinaryOpNode(*, BinaryOpNode(+, 3, 4), 2)
```

The parentheses literally cause the recursion to restart at the top of the precedence chain. That's how they override precedence — not through special cases, but through the natural structure of the recursive calls.

---

## Mutual Recursion in the Interpreter

The interpreter is also mutually recursive, though less obviously. `evaluate()` dispatches to `visit()` overloads (or `isinstance` branches in Python), each of which calls `evaluate()` on child nodes.

Evaluating `BinaryOpNode(+, NumberNode(3), BinaryOpNode(*, NumberNode(4), NumberNode(2)))`:

```
evaluate(BinaryOpNode(+))
  evaluate(NumberNode(3))       ← left child
    returns 3
  evaluate(BinaryOpNode(*))     ← right child
    evaluate(NumberNode(4))
      returns 4
    evaluate(NumberNode(2))
      returns 2
    returns 4 * 2 = 8
  returns 3 + 8 = 11
```

`evaluate` calls itself on children, which may themselves call `evaluate` again. The base cases are the leaf nodes — `NumberNode` and `IdentifierNode` — which return a value without recursing.

---

## The Pattern, Restated

Both the parser and interpreter follow the same recursive structure:

1. **Handle the current node/token** — do the work for this level
2. **Recurse on children/sub-expressions** — let the recursive call handle the inner structure
3. **Combine the results** — use what came back to produce this level's result
4. **Base case** — leaf nodes (literals, identifiers) return without recursing

Once you see this pattern, it appears everywhere: tree traversal, expression evaluation, directory walking, JSON parsing. It's one of the most broadly applicable structures in programming.

---

## Key Insights Summary

- **Trees represent hierarchy** — things that contain other things of the same kind; expressions are naturally trees
- **Recursive functions have a base case and a recursive case** — the base case stops the recursion, the recursive case moves toward it
- **Tree recursion recurses on children** — children complete before parents; results bubble up from leaves to root
- **Mutual recursion is two functions calling each other** — it terminates because each call moves toward a base case
- **The parser's grammar chain is mutually recursive** — `expression` → ... → `primary` → `expression`; parentheses restart the chain
- **The interpreter's evaluate/visit loop is mutually recursive** — `evaluate` calls `visit`, `visit` calls `evaluate` on children
- **The call stack during execution mirrors the tree** — the shape of active frames is the shape of the structure being processed
