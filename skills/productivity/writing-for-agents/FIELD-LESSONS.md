# Field lessons

Practical rules for writing skills, `AGENTS.md` / `CLAUDE.md` files and the prompts around them. Source: Theo, "I Fixed Claude Without Touching Any Code" (https://www.youtube.com/watch?v=e1snsuY4lTI), checked against our own runs. `SKILL.md` explains why these work; this file says what to write.

## Descriptions are triggers

- A description sits in context every turn, fired or not. Write one short clause of identity, then "Use when …" with the words Jorge actually types. The body carries the contents; a description complete enough to act on makes the skill redundant.
- A bare keyword is a valid trigger: "…or the user says HTML with no other context" lets one word at the end of a prompt fire the skill.
- Sharp triggers make small skills safe. Two jobs Jorge asks for separately (file a PR, watch a PR) get two skills; a prompt naming both pulls both.
- GOOD/BAD, from this repo:
  - BAD: "Reclaim disk … with scripts/storage-hygiene.sh, covering leaked processes and swap, worktrees, dependency and build caches, agent histories, Xcode and simulators. Use when free space is low …"
  - GOOD: "Free disk and memory on Jorge's Macs with scripts/storage-hygiene.sh. Use when a Mac is slow or swapping, disk space is low, …" The contents list went; the missing trigger (a slow Mac) came in.

## Every line traces to a failure

- Add a line after you watched an agent fail without it. A line written for a hypothetical failure is sediment from day one.
- Mine the history: have agents audit past threads and rank failure modes by frequency per model and harness (wrong process killed, draft PRs, repo-wide checks, overbuild, stopping early, no verification, unasked edits). Fix the most frequent first.
- When a thread goes wrong, ask the agent why it chose that path and what pointed it there; the answer is often a stale steering line. When a simple task ran long, have it sort its tool calls into helpful and wasted.
- When the agent keeps reaching for the wrong tool, name the right one in the skill ("fetch it with curl").
- Prove an instruction change on a real case before you rely on it: run it on a case whose answer you already know, and grade it from what the agent opened and did (the transcript, the diff), not from its own report. A retro written from memory said four reviews had passed; the transcripts showed one never ran.

## Show GOOD and BAD

- Output you keep correcting (titles, descriptions, messages) gets one real BAD example and your rewrite. A pair sets taste faster than adjectives.
- PR, ticket and issue descriptions open with the problem in the user's words, then the fix in a sentence or two. An inventory of changed files and functions is the BAD example.

## Steering files are written for the agent

- `AGENTS.md` says how to change things here; the README says what the project is. Keep only the project context that steers decisions.
- **Glossary**: one line per word you and the agent share (you, user, provider, client …). The main win is the agent talking back in your words.
- **Never-compromise list**: what the product stands for (performance, open source, every surface). A change that hurts one is wrong even when asked casually.
- State that the file holds good defaults and the person prompting overrides them.
- Tone transfers: the model answers in the voice the file is written in.
- **Blast radius**: name the processes, data and servers the agent must leave alone, and how it starts and stops its own (keep the PID).

## Checklists that catch a defect class

- **Hit every surface**: list the entry points, clients, adapters, contracts and docs a feature must reach. Before calling work done, the agent walks the list and decides per entry. The common defect is a change that works on the tested path and is missing elsewhere.
- **Reverse states**: a change that adds a state (snooze, settle, enable) ships its undo in the same change.
- **Scope guard**: review feedback fixes real shortcomings and keeps the change inside the original goal.

## Stop points

Give every prompt and every risky step a named stop point ("make the changes; commit and push when I say"). Eager models run past an open-ended goal; a stop point is the cheapest fix.

## Aim

Tuning is for communication: output Jorge can read on his phone (plain PR prose, uploaded screenshots and videos, HTML write-ups). That is what lets prompts shrink to "diagnose and fix, file and babysit". Build these files from your own failures; borrowed files carry someone else's problems.
