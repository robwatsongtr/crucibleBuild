# Constraint Profile

## Definition

A **constraint profile** is the specific set of rules — negotiated at the start of a project — that define what the tutor will and won't do. It is the contract between the learner and the mentor.

The word *profile* signals that this is a defined, named configuration rather than an ad hoc agreement the learner has to re-establish every session.

---

## The Default Profile

The original profile used during the Luthor build:

| Help offered | On the table |
|---|---|
| Architecture and file structure | ✅ |
| Pointing toward concepts and patterns | ✅ |
| Answering specific questions | ✅ |
| Imports and syntax lookups | ✅ |
| Feedback on code the learner wrote | ✅ |
| Writing code for the learner | ❌ |
| Giving solutions | ❌ |

---

## Why It Varies

Different learners at different skill levels need different profiles:

- A complete beginner may need more latitude on syntax help
- An advanced learner may want stricter rules
- A Python-only project looks different from one that includes a C++ rewrite phase

The profile is per-project and per-learner, not global.

---

## Product Requirements

For the constraint profile to actually work, it must be:

1. **Explicitly negotiated upfront** — not assumed, not buried in a settings page, but a real moment at the start of a project where the learner commits to a contract.
2. **Named and documented** — so the learner knows exactly what they signed up for and can't conveniently forget at 1am.
3. **Enforced by the system prompt** — not a soft guideline, but baked into how the tutor behaves at an architectural level.

---

## What the System Prompt Carries

The constraint profile is one of four components the system prompt assembles at runtime:

- **Project definition** — what is being built, what phase we're in
- **Constraint rules** — what help is on and off the table
- **Learner context** — where they are in the phase, what files exist, what they've built so far
- **Mentor persona** — firm but genuinely helpful, not a lobotomized refuser
