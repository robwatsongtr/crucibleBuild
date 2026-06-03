The specific set of rules negotiated at the start of a project that define what the tutor will and won't do..
It's the contract.

In your case it was:

Architecture and file structure: yes
Pointing toward concepts and patterns: yes
Answering specific questions: yes
Feedback on code you wrote: yes
Imports and syntax lookups: yes
Writing code for you: no
Giving solutions: no

That set of rules is the constraint profile. 

Different learners at different skill levels might want a different profile — a complete beginner might need more latitude on syntax help, someone more advanced might want stricter rules. A profile for a Python-only project looks different from one that includes a C++ rewrite phase.
The reason it matters as a concept in the product is that it needs to be:

Explicitly negotiated upfront — not assumed, not a settings page buried somewhere, 
but a real moment at the start of a project where the learner commits to a contract.

Named and documented — so the learner knows exactly what they signed up for and can't conveniently forget at 1am.
Enforced by the system prompt — not a soft guideline but baked into how the tutor behaves at an architectural level. 

It's essentially the answer to "what kind of help is on the table here." 
The word profile just means it's a defined, named configuration of those rules rather than an ad hoc thing the learner 
has to re-establish every session.

The system prompt would carry:

The project definition — what is being built, what phase we're in
The constraint rules — what help is on and off the table
The learner's current context — where they are in the phase, what files exist, what they've built so far
The mentor persona — firm but genuinely helpful, not a lobotomized refuser

