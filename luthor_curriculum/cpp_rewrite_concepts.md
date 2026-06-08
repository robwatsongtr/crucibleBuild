# C++ Rewrite — Core Concepts Reference

## Prerequisites

This rewrite assumes you have a basic understanding of C — specifically:

- **Pointers** — what they are, how to declare them, how to dereference them
- **Heap allocation** — `malloc`/`free` or `new`/`delete`; the difference between stack and heap
- **Manual memory management** — what a memory leak is, why forgetting to `free` is a bug

If those concepts are unfamiliar, learn them in C first before starting the rewrite. The concepts are not complicated, but they are load-bearing — everything in this doc assumes you've felt the pain that C++ is solving.


---

## Why C++ and Not C

**C would give you:**
- Raw pointers and manual `new`/`delete` — you feel the pain, but managing memory *becomes* the lesson instead of the interpreter
- No constructors or destructors — node cleanup is manual and error-prone
- Tagged unions and function pointer tables by hand — the mechanism buries the concept
- You'd end up teaching C as much as compilers

**C++ maps cleaner to this domain because:**
- `unique_ptr` models AST ownership *declaratively* — parent owns children, scope handles cleanup — which is the right mental model
- Virtual dispatch and vtables are exactly what Python was doing invisibly — C++ just makes you write it out; the abstraction becomes concrete
- The visitor pattern fits C++'s type system naturally — the compiler enforces completeness in a way C cannot
- The concepts map one-to-one from Python: `isinstance` → virtual dispatch, duck-typed return → `std::variant`, dict → `unordered_map`
- Constructors make node construction expressive and explicit — you see exactly what a node owns

**The caveat:** C++ only works as a teaching tool here *if you understand what it's abstracting*. Smart pointers only make sense if you know raw pointers. `std::move` only makes sense if you understand why copying a pointer creates two owners. Virtual dispatch only makes sense if you understand that a pointer-to-base doesn't carry the concrete type.

The downside of C++ is that it is a complicated language and the syntax can be hard to read at times, especially templated classes; that being said, we are using just a specific subset of the language and you can get a grip on it fairly quickly. 

---

## The Big Picture

Python hides memory management behind the runtime; the Python interpreter itself is written in C. 
So a C++ makes it explicit.
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
Animal* a = new Dog("rex");
delete a;  // easy to forget, causes a memory leak if you don't

// Smart pointer way — delete is automatic
auto a = std::make_unique<Dog>("rex");
// when a goes out of scope, the Dog is deleted automatically
```

**Key rule:** you cannot *copy* a `unique_ptr` — only *move* it. Copying would create two owners, violating uniqueness. Moving transfers ownership to the new location and leaves the original empty.

```cpp
// returning a unique_ptr moves it out of the function — fine
std::unique_ptr<Animal> make_animal() {
    return std::make_unique<Dog>("rex");
}

// passing a unique_ptr into a constructor — must use std::move
auto a = std::make_unique<Dog>("rex");
auto cage = std::make_unique<Cage>(std::move(a));  // a is now empty, cage owns the dog
```

This is exactly the pattern your parser will use — each method returns a `unique_ptr<ASTNode>`, and parent nodes take ownership of their children via `std::move` in the constructor.

Use `unique_ptr` by default. Use `shared_ptr` only when multiple things genuinely need to own the same object (you won't need it for the AST).

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

Define a base class. All concrete types inherit from it. Store them via a pointer to the base — the pointer type is always the base, but it can point to any subclass at runtime. Virtual dispatch handles "what type is this really" without needing a tag.

The base class needs a virtual destructor — without it, deleting a derived object through a base pointer won't call the right destructor:

```cpp
struct Shape {
    virtual ~Shape() = default;  // required for correct cleanup through base pointer
};

struct Circle : public Shape {
    double radius;
    Circle(double r) : radius(r) {}
};

struct Rectangle : public Shape {
    double width, height;
    Rectangle(double w, double h) : width(w), height(h) {}
};

// store different types behind a base pointer
auto s = std::make_unique<Circle>(5.0);
// s has type unique_ptr<Shape>, but points to a Circle at runtime
```

Your node hierarchy follows this exact pattern — `ASTNode` is the base, every node type inherits from it, and child nodes are stored as `unique_ptr<ASTNode>` members. Constructors take child nodes by `unique_ptr` and move them in.

When a node goes out of scope, it deletes itself and all its children automatically. The destructor chain unwinds the whole subtree — no manual cleanup anywhere.

---

## Tagged Unions and `std::variant` (for runtime values)

A union is a block of memory with multiple named interpretations — all members share the same bytes. `std::variant` is the modern C++ version — the type bookkeeping is managed automatically and type violations are caught.

```cpp
// a Value can hold either an int or a string, but not both at once
using Value = std::variant<int, std::string>;

Value v = 42;
int n = std::get<int>(v);          // gets the int — throws if it's actually a string

Value s = std::string("hello");
std::string* p = std::get_if<std::string>(&s);  // returns nullptr if wrong type — safer
```

In Luthor, the runtime value type holds either a `double` (arithmetic results) or a `bool` (comparison results). You'll define a type alias for it and use it for your symbol table values and as the return type from expression evaluation.

`std::get_if` is the safer accessor — it returns a pointer to the value if the type matches, `nullptr` if it doesn't. Prefer it over `std::get` when you're not certain which type is active.

The symbol table maps string variable names to this value type. The container for that is `std::unordered_map<std::string, YourValueType>` — a hash map from the standard library that works the same way as a Python dict.

---

## Evaluation Strategy

Your Python `evaluate()` is already the visitor pattern — one central function with `isinstance` branches per node type. The C++ rewrite maps directly:

| Python | C++ equivalent |
|---|---|
| `isinstance(node, NumberNode)` | virtual dispatch via `accept`/`visit` |
| `self.symbol_table` dict | `std::unordered_map<std::string, LuthorValue>` |
| duck-typed return value from `evaluate` | `std::variant<double, bool>` stored in `result` member |
| single `evaluate()` for everything | consider splitting: expressions return a value, statements don't |

The split between expressions (produce a value) and statements (produce a side effect) maps cleanly to two separate methods with different return types — something Python's duck typing let you paper over but C++'s type system makes you confront explicitly.

---

## Suggested Rewrite Order

1. `tokens.h` — `enum class` for token types, `Token` struct (no pointers, good starting point)
2. `lexer.h/.cpp` — straightforward translation
3. `nodes.h` — AST hierarchy with `unique_ptr` children
4. `parser.h/.cpp` — returns `unique_ptr<ASTNode>` from each method
5. `interpreter.h/.cpp` — the tree walker with `LuthorValue` and symbol table
