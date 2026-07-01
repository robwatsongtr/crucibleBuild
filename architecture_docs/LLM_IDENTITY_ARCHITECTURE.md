# LLM Identity Architecture — How CrucibleBuild Works

## The Core Insight

A well-structured system prompt gives an LLM a working identity — not in a philosophical sense, but in a practical, programmatic one. The identity isn't vibes from a few adjectives. It's a structured set of constraints, a curriculum sequence, specific behavioral rules, tool use boundaries, and an escalation ladder. The model has to satisfy all of those simultaneously on every turn.

The interesting thing is that the identity is enforced not by the model's values but by the architecture. The phase system means the model literally cannot discuss topics outside the current phase without violating its instructions. The tool rules constrain what it can observe. The checkpoints define what "done" means objectively. The model's judgment fills in the gaps, but the structure does most of the work.

---

## How LLM Products Actually Work

Every LLM product is essentially this pattern:

1. A system prompt that defines identity, constraints, and available tools
2. A set of tool definitions that give the model structured ways to interact with the outside world
3. A loop that processes tool calls and feeds results back

The model's weights are fixed — everything that makes it behave differently from raw Claude is in the system prompt and tools. Customer support bots, coding assistants, research agents — all of them are system prompt plus tools plus loop.

---

## How Behavior is "Enforced"

It doesn't enforce in a hard technical sense — it's all soft. The model reads the system prompt and predicts tokens consistent with it, the same way it predicts tokens consistent with anything in its context. There's no runtime check that catches the model if it decides to violate the rules.

The enforcement is probabilistic. A well-written system prompt makes compliant behavior the high-probability path. The model has been trained via RLHF to follow instructions, so a clear, specific instruction strongly biases the output toward compliance — but it's not a guarantee.

What makes it hold:

- **Specificity** — vague instructions drift; specific ones don't. "Do not write code" holds better than "be a mentor"
- **Repetition and consistency** — the charter, the persona, and the rules all say the same thing from different angles
- **Structural pressure** — the phase system means most responses are constrained to a narrow topic anyway
- **The tool loop** — `advance_phase` only fires when the model calls it; the model can't fake that

The Haiku vs Sonnet difference illustrates the boundary of this. Sonnet infers intent from weaker signals. Haiku needs explicit MUST language. Both are just probability distributions being shaped by the prompt — Sonnet's distribution is shaped more reliably by implicit intent, Haiku's requires explicit pressure.

---

## A Finite State Machine Bolted onto a Language Model

The phase system is a textbook finite state machine. At any moment the learner is in exactly one state (`python-tokens`, `python-lexer`, etc.). Transitions are defined (`advance_phase`). The trigger condition is defined (all checkpoints met). The transition is deterministic (written to `config.json`).

The language model sits on top of that structure and handles everything the FSM can't — natural language understanding, Socratic questioning, reading code, giving feedback, graduated escalation. All the fuzzy judgment work a state machine can't encode.

The two halves divide responsibility cleanly:

| FSM | LLM |
|---|---|
| What state the learner is in | What to do within that state |
| Objective, persistent, unambiguous | Subjective, contextual, requires judgment |
| Deterministic transitions | Probabilistic behavior |

Neither could do the job alone. A pure FSM can't mentor — it has no language, no judgment, no ability to read code. A pure LLM with no state structure would drift — it'd forget where the learner is, get ahead of the curriculum, advance phases on vibes. Together they're more robust than either separately.

The system prompt is essentially the FSM's transition table translated into natural language — here are the states, here are the valid conditions, here is what behavior is valid in each state.

---

## The Static System Prompt

The static system prompt is assembled from five pieces, all fixed per session and cache-stable:

- **Persona** — who the mentor is, tone, constraints
- **Rules** — what's on/off the table
- **Project summary** — what's being built
- **Phase catalog** — all phases with goals, checkpoints, concepts
- **Mentor charter** — behavioral rules, escalation ladder, tool use rules, phase advancement

The dynamic part — current phase detail and file tree — is appended each turn and changes as the learner progresses.
