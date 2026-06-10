# Matt-Style Skill Authoring

This document distills how Matt Pocock writes agent skills from the local corpus at `/Users/jorge/dev/.temp/skills`, plus the X screenshot you shared.

It is meant to be used as an authoring guide for your own skills: read it before creating a new skill, use the templates, then run the checklist.

## Sources Inspected

Local source of truth:

- `/Users/jorge/dev/.temp/skills/README.md`
- `/Users/jorge/dev/.temp/skills/CONTEXT.md`
- `/Users/jorge/dev/.temp/skills/CLAUDE.md`
- `/Users/jorge/dev/.temp/skills/docs/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md`
- `/Users/jorge/dev/.temp/skills/.claude-plugin/plugin.json`
- Every `SKILL.md` under `/Users/jorge/dev/.temp/skills/skills`
- Companion docs and scripts under the skill folders

The corpus has 29 `SKILL.md` files, about 2250 lines total. The promoted plugin surface contains 14 skills. Most stable skills are short: `zoom-out` is 7 lines, `grill-me` is 10 lines, and the longest promoted skills are still around 120 lines. Larger domains are handled with companion files, not by making `SKILL.md` huge.

Screenshot philosophy:

- Concise
- Responsible for one thing, not multi-step
- Composable
- Progressively disclosed
- Harness-agnostic
- Well-documented
- Portable
- Secure

## The Core Thesis

A Matt-style skill is not a mega-agent. It is a small, reusable operating loop that gives an already-capable agent the missing discipline for one recurring situation.

The skill should answer:

1. What recurring failure mode is this skill preventing?
2. What should the agent do first?
3. What loop keeps the agent honest?
4. What artifact, if any, should survive the session?
5. What should the agent refuse to do?

The skill should not try to explain everything. It should encode the non-obvious moves that a good engineer would otherwise have to repeat every session.

## Matt's Operating Philosophy

### 1. Preserve Engineer Control

The README frames these skills as an alternative to process-heavy frameworks that "own the process" and reduce control. Matt's skills push the agent toward better engineering behavior without turning the whole session into a rigid methodology.

Examples:

- `grill-me` does not write a plan for the user. It interrogates the plan until both sides understand it.
- `to-issues` drafts vertical slices, then asks the user whether the granularity, dependencies, and HITL/AFK split are right before publishing.
- `setup-matt-pocock-skills` presents findings and asks one decision at a time instead of silently deciding the repo workflow.
- `prototype` builds throwaway code to answer a question, then deletes or absorbs it after the user has learned from it.

Authoring rule: a skill may steer hard, but it should keep important decisions visible to the user.

### 2. Skills Fix Concrete Agent Failure Modes

Each important skill maps to a failure mode:

| Failure mode | Matt-style response | Example |
| --- | --- | --- |
| User and agent are misaligned | Grilling session | `grill-me`, `grill-with-docs` |
| Agent uses vague or inconsistent language | Shared domain glossary | `grill-with-docs`, `CONTEXT.md` |
| Agent guesses at bugs | Build a feedback loop first | `diagnose` |
| Agent writes tests for imagined behavior | One vertical red-green slice at a time | `tdd` |
| Work is too large for agents | Break into independently grabbable slices | `to-issues` |
| Architecture entropy grows | Find shallow modules and deepen seams | `improve-codebase-architecture` |
| Future agents lose context | Durable handoff or issue brief | `handoff`, `triage/AGENT-BRIEF.md` |

Authoring rule: if you cannot name the failure mode, the skill is probably too vague.

### 3. Trust The Agent's General Intelligence

Matt does not write skills as encyclopedias. The skill gives procedure, vocabulary, constraints, templates, and examples. It avoids teaching the model general facts it can already infer.

Good skill content:

- "Ask one question at a time."
- "Build the feedback loop before hypothesizing."
- "Use domain glossary vocabulary in issue titles."
- "Do not reference file paths in durable issue briefs."
- "Read the article file before every write because the user may edit it."

Weak skill content:

- Long explanations of what GitHub Issues are.
- Generic software engineering advice with no trigger or loop.
- A full tutorial on Markdown syntax.
- A list of every possible edge case the agent can reason about itself.

Authoring rule: write the memory that changes behavior, not the knowledge the agent already has.

### 4. One Skill, One Responsibility

Matt-style skills are narrow. They can be multi-phase internally, but they own one job.

Examples:

- `zoom-out`: one move only, ask for a map one abstraction level up.
- `handoff`: one artifact only, a temp handoff document for the next agent.
- `diagnose`: one discipline, reproduce and isolate a bug through a feedback loop.
- `prototype`: one purpose, answer a design question with throwaway code.
- `writing-beats`: one writing rhythm, write one beat at a time.

The important distinction: "one thing" does not mean "one step." `diagnose` has six phases, but all phases serve one outcome: prove and fix a bug through a trusted loop. `setup-matt-pocock-skills` has many steps, but all steps serve one outcome: seed per-repo config for the other skills.

Authoring rule: if the skill has two unrelated reasons to exist, split it.

### 5. Composability Beats Monoliths

The skills form a small toolkit. They pass durable artifacts to each other instead of one skill owning everything.

Observed composition:

- `setup-matt-pocock-skills` creates `docs/agents/issue-tracker.md`, `triage-labels.md`, and `domain.md`.
- `to-issues`, `to-prd`, and `triage` consume the issue tracker and label mapping.
- `diagnose`, `tdd`, `zoom-out`, and `improve-codebase-architecture` consume domain docs and ADRs as soft context.
- `grill-with-docs` produces `CONTEXT.md` terms and ADRs.
- `improve-codebase-architecture` reads `CONTEXT.md`, reads ADRs, and may hand off back to `grill-with-docs`.
- `prototype` can produce a decision-rich state model or UI direction that later appears in a PRD or issue.
- `handoff` suggests the next skills instead of embedding their full workflows.

Authoring rule: prefer one skill producing a durable artifact that another skill can read over one skill doing every job.

### 6. Progressive Disclosure Is Structural

Matt's corpus repeatedly keeps the top-level skill short and moves optional details into adjacent files.

Examples:

- `tdd/SKILL.md` holds the loop; `tests.md`, `mocking.md`, `interface-design.md`, `refactoring.md`, and `deep-modules.md` hold details.
- `prototype/SKILL.md` chooses between logic and UI; `LOGIC.md` and `UI.md` hold the branch-specific workflow.
- `improve-codebase-architecture/SKILL.md` defines the process; `LANGUAGE.md`, `DEEPENING.md`, `INTERFACE-DESIGN.md`, and `HTML-REPORT.md` hold vocabulary and report patterns.
- `grill-with-docs/SKILL.md` states the conversation loop; `CONTEXT-FORMAT.md` and `ADR-FORMAT.md` hold output formats.
- `triage/SKILL.md` holds the state machine; `AGENT-BRIEF.md` and `OUT-OF-SCOPE.md` hold durable templates.

Progressive disclosure works because `SKILL.md` names the support files and says when to read them. Hidden docs that are never linked might as well not exist.

Authoring rule: keep `SKILL.md` as the router and core loop. Put branch details, examples, templates, and long references in directly linked files.

### 7. Harness-Agnostic Means Adapter-Aware, Not Tool-Free

The public philosophy says harness-agnostic and portable. The local corpus also contains Claude-specific details. The important pattern is not "never mention tools"; it is "isolate tool assumptions and make them configurable where portability matters."

Portable examples:

- The setup skill speaks in terms of an "issue tracker" and supports GitHub, GitLab, local markdown, or other workflows.
- Triage roles are canonical names, while real label strings are mapped per repo.
- Domain docs can be single-context or multi-context.
- Architecture language is scale-agnostic: a module can be a function, class, package, or slice.

Less portable examples:

- `git-guardrails-claude-code` is explicitly Claude Code-specific.
- `setup-pre-commit` includes npm/pnpm-style commands.
- `obsidian-vault` hardcodes a personal vault path and is kept in `personal`.
- Some skills use Claude-specific frontmatter such as `disable-model-invocation` or `argument-hint`.

Authoring rule: published skills should put harness-specific behavior behind setup docs, adapters, or clearly named personal/misc surfaces. Personal paths and harness hooks are fine in personal skills, not in portable skills.

### 8. Documentation Is Load-Bearing, Not Decorative

Matt-style documentation is not more docs for its own sake. It records concepts, decisions, and contracts that future agents need.

Useful durable docs:

- `CONTEXT.md`: project-specific domain language only.
- ADRs: only hard-to-reverse, surprising, real-tradeoff decisions.
- Agent briefs: durable contracts for AFK agents.
- `.out-of-scope/*.md`: rejected feature concepts and reasons.
- Handoffs: pointers to existing artifacts, not duplicated history.
- Learning records in `teach`: the teaching equivalent of ADRs.

Unhelpful docs:

- Setup guides that duplicate commands already in the skill.
- Long changelogs inside a skill folder.
- Specs full of current file paths and line numbers.
- Glossaries containing generic programming terms.
- ADRs for obvious or easy-to-reverse decisions.

Authoring rule: write docs only when they improve future execution. Create them lazily when a term, decision, rejection, or handoff actually exists.

### 9. Secure Means More Than "Do Not Leak Secrets"

Security in Matt's skills includes classic secret handling, but also operational safety.

Examples:

- `handoff` explicitly redacts sensitive information.
- `git-guardrails-claude-code` blocks destructive git operations before tool execution.
- `triage` requires an AI disclaimer on comments and issue posts.
- `setup-matt-pocock-skills` confirms before writing config.
- Writing skills re-read files before every write to avoid overwriting user edits.
- `diagnose` requires cleanup of debug logs and throwaway harnesses.
- `prototype` hides the UI switcher in production builds and removes prototype code when done.

Authoring rule: include the safety rule at the moment the agent might violate it. Do not bury it in a generic safety section.

### 10. Feedback Loops Are The Center Of Real Engineering

Matt's engineering skills prefer proof over inspection.

Examples:

- `diagnose` says the feedback loop is the skill. Tests, curl scripts, CLI fixtures, trace replay, fuzz loops, and HITL scripts are all ways to create a pass/fail signal.
- `tdd` uses one behavior test, one minimal implementation, then repeats.
- `prototype` lets the user drive state or UI variations so the idea can fail early.
- `teach` insists on interactive feedback loops for learning.
- `to-issues` requires each vertical slice to be demoable or independently verifiable.

Authoring rule: every execution skill needs a loop that tells the agent whether it is closer to done.

### 11. Use A Shared Micro-Language

Matt aggressively defines small vocabularies and then forces the agent to use them.

Examples:

- `CONTEXT.md` defines domain terms and aliases to avoid.
- `improve-codebase-architecture/LANGUAGE.md` defines module, interface, seam, adapter, depth, leverage, and locality.
- `triage` defines canonical roles independent of tracker labels.
- `to-issues` defines HITL and AFK slices.
- `prototype` defines logic prototype vs UI prototype.

This reduces token use and ambiguity. Instead of saying "all the little services and helper components that interact around order creation," the agent can say "Order intake module is shallow."

Authoring rule: if the workflow depends on precise concepts, define the vocabulary up front and prohibit weaker synonyms.

### 12. Durable Outputs Should Survive Refactors

Matt repeatedly warns against file paths, line numbers, and implementation instructions in durable artifacts.

Examples:

- Agent briefs should describe interfaces, behavior, and acceptance criteria, not "open file X at line Y."
- PRDs can mention modules and interfaces but should avoid stale file paths.
- QA issues describe user-facing behavior and reproduction steps.
- Handoffs reference artifacts by path or URL instead of duplicating their contents.

Authoring rule: artifacts meant for future agents should describe behavior, interfaces, decisions, and constraints. They should not depend on today's file layout.

### 13. Refuse Horizontal Work

A recurring pattern is vertical slicing: build one complete path rather than all of one layer.

Examples:

- `tdd` rejects writing all tests first and all implementation later.
- `to-issues` turns a plan into tracer-bullet issues that cut across schema, API, UI, and validation.
- `diagnose` turns one minimized repro into one regression seam.
- `prototype` answers one design question and then stops.

Authoring rule: where implementation is involved, instruct the agent to ship or prove one thin complete path before expanding.

## Observed Skill Anatomy

### Frontmatter

Common shape:

```yaml
---
name: skill-name
description: Capability sentence. Use when specific trigger, context, file type, or user phrase appears.
---
```

Matt's descriptions do two jobs:

1. Name the capability.
2. Name the triggers.

Examples of strong trigger surfaces:

- "Use when user says diagnose/debug/broken/failing."
- "Use when user wants to convert a plan into issues."
- "Use when user has raw material and wants to assemble it as a narrative."
- "Use when user wants to prototype, sanity-check a data model, mock up a UI, or says 'let me play with it'."

Avoid descriptions like:

```yaml
description: Helps with development.
```

That gives the model no reason to choose this skill over any other.

For Codex-compatible public skills, prefer only `name` and `description` unless the target harness explicitly supports more fields. Matt's local Claude skills sometimes include extra fields; treat those as harness-specific, not universal.

### Body

Most Matt-style bodies have some mix of:

- A one-sentence contract.
- A process or loop.
- Branch selection rules.
- Rules for asking the user.
- Templates for output.
- Anti-patterns.
- Done criteria.
- Cleanup requirements.
- Links to companion files.

They are written in direct imperatives:

- "Ask one question at a time."
- "Do not proceed until you reproduce the bug."
- "Create files lazily."
- "Run the loop."
- "Never overwrite blindly."
- "Skip if the decision is easy to reverse."

### Companion Files

Use companion files when details are large, branch-specific, rarely needed, or template-heavy.

Matt's repo often keeps these as sibling markdown files such as `LANGUAGE.md` or `UI.md`. In Codex skills, a `references/` folder is often cleaner. Either is fine if `SKILL.md` links clearly to the file and says when to read it.

Good companion file types:

- Vocabulary: `LANGUAGE.md`
- Output format: `ADR-FORMAT.md`, `AGENT-BRIEF.md`
- Branch workflow: `LOGIC.md`, `UI.md`
- Examples and tradeoffs: `tests.md`, `mocking.md`
- Deterministic helper scripts: `scripts/block-dangerous-git.sh`

Bad companion files:

- Unlinked notes.
- Full tutorials not needed during execution.
- Changelogs.
- Process history.
- Personal setup details in a portable skill.

### Scripts

Scripts appear when deterministic behavior matters or the same code would be regenerated repeatedly.

Examples:

- `git-guardrails-claude-code/scripts/block-dangerous-git.sh`
- `diagnose/scripts/hitl-loop.template.sh`

Script authoring rules:

- Keep scripts small.
- Put them where the skill can link to them.
- Tell the agent when to copy, run, or adapt them.
- Include a verification step.
- Avoid scripts for thinking tasks; use scripts for repeatable mechanics.

## Source Matrix

Use this matrix as a pattern library.

| Skill | What it really teaches | Authoring lesson |
| --- | --- | --- |
| `grill-me` | Alignment through relentless questioning | A skill can be 10 lines if the move is clear. |
| `grill-with-docs` | Alignment plus domain docs | Ask one question at a time; update docs as terms crystallize. |
| `diagnose` | Feedback-loop-first debugging | Put the highest-leverage phase first and make it non-negotiable. |
| `tdd` | Behavior-first vertical loops | Define the anti-pattern before the workflow. |
| `to-issues` | Vertical issue slicing | Durable issues describe complete behavior, not layers. |
| `to-prd` | Synthesize from context | Not every skill interviews; sometimes "do not interview" is the core rule. |
| `triage` | State-machine issue handling | Canonical roles plus per-repo label mapping make it portable. |
| `improve-codebase-architecture` | Deepen shallow modules | A skill can carry its own vocabulary and force outputs to use it. |
| `setup-matt-pocock-skills` | Per-repo adapter setup | Hard dependencies deserve explicit setup; soft dependencies should degrade quietly. |
| `prototype` | Throwaway code that answers a question | Pick the branch from the question; delete or absorb when done. |
| `zoom-out` | One abstraction-level shift | Some skills should be tiny model-invocation shortcuts. |
| `handoff` | Context compaction | Redact, point to artifacts, and avoid duplicating durable docs. |
| `caveman` | Persistent response mode | Include persistence rules and exceptions. |
| `write-a-skill` | Skill structure and progressive disclosure | The meta-skill itself follows the same concise pattern. |
| `review` | Two-axis review | Parallel agents are useful when contexts should not contaminate each other. |
| `writing-fragments` | Capture raw material without imposing structure | File preservation rules can be the most important part of a skill. |
| `writing-shape` | Conversational article shaping | "Out of scope" prevents the workflow from swallowing adjacent jobs. |
| `writing-beats` | Beat-by-beat narrative construction | Write exactly one unit, then stop and re-evaluate. |
| `teach` | Stateful learning workspace | Durable records can model learning, not just engineering decisions. |
| `qa` | Conversational issue filing | Deprecated skills still reveal principles: durable, user-facing issues. |
| `ubiquitous-language` | Domain glossary extraction | Deprecated because the glossary concept moved into stronger workflows. |
| `design-an-interface` | Design It Twice | Deprecated but reincarnated inside architecture interface design. |

## How To Write A Matt-Style Skill

### Step 1: Name The Recurring Situation

Write the situation in one sentence:

```text
When the user asks X, the agent usually fails by doing Y. This skill forces Z.
```

Examples:

- When the user reports a hard bug, the agent usually guesses from code. This skill forces a feedback loop before hypotheses.
- When the user has a vague plan, the agent usually implements too early. This skill forces a grilling session.
- When a plan is too large, the agent usually makes horizontal tickets. This skill forces vertical tracer bullets.

If you cannot write this sentence, stop. The skill is not focused yet.

### Step 2: Decide Whether This Is A Skill

Good skill candidates:

- A repeated workflow with a memorable failure mode.
- A domain where the agent needs private or repo-specific context.
- A task where a deterministic script improves reliability.
- A process where "done" needs a durable artifact.
- A communication style that should persist after invocation.

Bad skill candidates:

- One-off instructions.
- Generic advice.
- A checklist that belongs in `AGENTS.md`.
- A large methodology that owns planning, execution, review, deploy, and handoff all at once.
- A tool wrapper with no procedural judgment.

### Step 3: Define The Trigger Surface

The description is the skill's most important text because it is seen before the body is loaded.

Use this shape:

```yaml
description: [What the skill does]. Use when [specific user phrases, contexts, file types, or intent].
```

Checklist:

- Does it say what the skill does?
- Does it include "Use when" triggers?
- Does it include synonyms users will actually say?
- Does it avoid vague claims like "helps with"?
- Is it specific enough to not collide with adjacent skills?

### Step 4: Write The Contract

At the top of the body, state the contract in one or two sentences.

Examples:

```md
A prototype is throwaway code that answers a question. The question decides the shape.
```

```md
Break a plan into independently grabbable issues using vertical slices.
```

```md
Run a grilling session that produces fragments. Do not impose phases, outlines, or structure.
```

This contract should let the agent know what success feels like.

### Step 5: Put The Critical Move First

The first operational section should be the move that most changes behavior.

Examples:

- `diagnose`: build the feedback loop first.
- `prototype`: pick logic vs UI branch first.
- `setup`: explore the repo before asking setup questions.
- `triage`: gather full issue context before recommendation.
- `writing-shape`: read the raw material end-to-end before drafting.

Do not start with background theory if the first move is obvious.

### Step 6: Encode The Loop

Most useful skills have a loop:

- Ask a question, wait, update understanding, ask next.
- Write one test, make it pass, repeat.
- Reproduce, hypothesize, instrument, fix, re-run.
- Add one fragment, re-read file, continue conversation.
- Write one beat, offer next beat choices, repeat.

State the loop explicitly. State when it stops.

### Step 7: Define Artifacts And Their Durability

If the skill writes anything, decide whether it is:

- Temporary: prototypes, debug harnesses, temp HTML reports.
- Durable: ADRs, `CONTEXT.md`, issue briefs, handoffs, learning records.
- Read-only input: raw writing piles, existing specs, issue comments.

Then write rules for each:

- Temporary artifacts must be deleted or absorbed.
- Durable artifacts must avoid stale implementation details.
- Read-only inputs must not be overwritten.

### Step 8: Split Dependencies Into Hard And Soft

Matt's ADR on setup dependencies is important:

- Hard dependency: without setup, output is wrong.
- Soft dependency: without setup, output is less sharp but still useful.

Examples:

- Issue publishing needs the real issue tracker and label mapping. Hard dependency.
- Debugging can still proceed without `CONTEXT.md`; it just loses domain vocabulary. Soft dependency.

Authoring rule:

- Hard dependency: point explicitly to setup or ask the user.
- Soft dependency: read it if present, proceed silently if missing.

### Step 9: Add Anti-Patterns

Good Matt-style skills often say what not to do.

Examples:

- Do not proceed without reproducing the bug.
- Do not write all tests first, then all code.
- Do not leave prototypes in the repo.
- Do not reference file paths in durable issue briefs.
- Do not create ADRs for reversible or obvious decisions.
- Do not impose outlines on raw writing fragments.

Anti-patterns are especially useful when the wrong move is tempting.

### Step 10: Keep The Body Short By Moving Detail Out

Split when:

- The body exceeds about 100-150 lines.
- There are multiple branches.
- There are long examples.
- There are output templates.
- There is vocabulary the agent must use exactly.
- There is script documentation.

Keep references one level away from `SKILL.md`. The main skill should link to every reference it expects the agent to use.

### Step 11: Add A Done Gate

A skill should make it hard to declare done too early.

Examples:

- Re-run original repro.
- Regression test passes, or missing seam is documented.
- Debug logs removed.
- Prototype answer captured and code deleted or absorbed.
- Issues published in dependency order.
- Handoff saved to temp dir and sensitive data redacted.
- User approved the slice breakdown.

Done gates should match the skill's purpose, not be generic.

## Recommended Skill Template

Use this for new skills, then cut aggressively.

```md
---
name: concise-skill-name
description: Does one specific thing. Use when user says X, needs Y, or works with Z.
---

# Human Name

One or two sentence contract. State what this skill does and what success means.

## First Move

The highest-leverage thing the agent must do before anything else.

If there are branches, choose the branch here. If unclear, ask one specific question.

## Process

1. Step one.
2. Step two.
3. Step three.

Keep the loop visible. Say what gets repeated and when to stop.

## Output

Describe the artifact, command, report, issue, or user-facing answer produced.

If there is a template, include it here only if short. Otherwise link to a companion file.

## Rules

- Do this.
- Do not do that.
- Ask only when this condition is true.
- Proceed silently when missing optional context.

## Done

- [ ] Concrete verification or completion gate.
- [ ] Cleanup gate.
- [ ] Handoff or durable artifact gate, if applicable.

## Anti-Patterns

- Tempting wrong move.
- Overreach.
- Stale artifact pattern.
```

## Minimal Skill Template

Use this when the skill is a tiny invocation or response mode.

```md
---
name: zoom-out-example
description: Ask for a higher-level map of an unfamiliar code area. Use when the user says "zoom out" or needs broader context.
---

I do not know this area well. Go up one abstraction level. Give me a map of relevant modules, callers, and vocabulary before proposing changes.
```

If the skill can be this short, keep it this short.

## Branching Skill Template

Use this when the user's question decides between two or more workflows.

```md
---
name: prototype-example
description: Build a throwaway prototype to answer a design question. Use when the user wants to feel out logic, state, data shape, or UI options before committing.
---

# Prototype

A prototype is throwaway code that answers one question. The question decides the shape.

## Pick A Branch

- Logic/state/data question -> read [LOGIC.md](LOGIC.md)
- UI/layout/interaction question -> read [UI.md](UI.md)

If genuinely ambiguous, ask. If the user is AFK, infer from surrounding code and state the assumption.

## Shared Rules

- Mark prototype code clearly.
- One command to run.
- No persistence unless persistence is the question.
- Capture the answer.
- Delete or absorb when done.
```

## Setup Skill Template

Use this when other skills need repo-specific adapters.

```md
---
name: setup-example-skills
description: Configure repo-local docs so related skills know the tracker, labels, validation commands, and domain docs. Run before first use of related skills or when they appear to lack repo context.
---

# Setup Example Skills

Scaffold the per-repo configuration that other skills consume.

## Explore

Read existing config first. Do not assume:

- repo instructions
- issue tracker
- package manager
- validation commands
- domain docs

## Ask One Decision At A Time

For each decision, explain why it matters, recommend a default, and wait.

## Write

Update the existing agent instruction file in place. Write docs under `docs/agents/`.

Do not create duplicate sections. Do not overwrite surrounding user edits.
```

## Local Adaptation For Your Skills

When writing skills for your own repos, keep Matt's philosophy but encode your local operating rules explicitly.

Use these as overlays when relevant:

- TypeScript projects: use Bun. Do not write npm/pnpm/yarn commands unless the skill is explicitly for another ecosystem or the user approves.
- UI validation: prefer native Codex Browser, then Computer Use, then Chrome. Do not use Playwright for UI inspection in this workspace.
- Tests: do not create or modify test files unless the user explicitly asks for tests. If adapting Matt's `tdd` ideas, make sure the skill is intentionally a testing skill and the user has invoked it.
- Code style: prefer inference in TypeScript and concise functional patterns where they match the repo.
- Validation: use UI or existing workflows where possible; do not invent new test suites by default.
- Questions: when asking sets of questions, number them and include a recommendation.

This matters because Matt's corpus includes `npm`, `pnpm`, Playwright references, and Claude-specific fields. Those are examples of his environment, not rules for yours.

## Good Skill Vs Weak Skill

### Weak

```md
---
name: debugging
description: Helps debug issues.
---

Look at the code and figure out what is wrong. Add logs if needed. Fix the bug and run tests.
```

Problems:

- Trigger is vague.
- No first move.
- No feedback loop.
- No rule against guessing.
- No cleanup.
- No done gate.

### Matt-Style

```md
---
name: diagnose
description: Disciplined diagnosis loop for hard bugs and regressions. Use when the user reports something broken, failing, throwing, slow, or asks to debug.
---

# Diagnose

Build a trusted feedback loop before hypotheses.

## Process

1. Construct the fastest reproducible pass/fail loop.
2. Confirm it reproduces the user's symptom.
3. Write 3-5 falsifiable hypotheses.
4. Instrument one hypothesis at a time.
5. Fix only after the cause is isolated.
6. Re-run the original loop and remove instrumentation.

## Done

- [ ] Original symptom no longer reproduces.
- [ ] Regression seam exists, or missing seam is documented.
- [ ] Temporary logs and harnesses are gone.
```

The stronger version is not longer because it is wordier. It is longer because it encodes the actual discipline.

## The Matt-Style Authoring Checklist

### Scope

- [ ] The skill has one job.
- [ ] The recurring failure mode is named.
- [ ] Adjacent jobs are explicitly out of scope or delegated to other skills.
- [ ] Personal or harness-specific assumptions are isolated.

### Trigger

- [ ] `description` says what the skill does.
- [ ] `description` includes "Use when" triggers.
- [ ] Trigger phrases match how users actually ask.
- [ ] The skill will not collide with broader or narrower skills.

### Body

- [ ] The first operational move is near the top.
- [ ] The loop is explicit.
- [ ] The user interaction rules are clear.
- [ ] The skill says when to ask and when to proceed.
- [ ] The skill says what not to do.
- [ ] Done criteria are concrete.

### Progressive Disclosure

- [ ] `SKILL.md` stays short enough to load cheaply.
- [ ] Branch details live in linked companion files.
- [ ] Templates and examples are not duplicated across files.
- [ ] Companion files are one level away and directly linked.
- [ ] Scripts are used only for deterministic mechanics.

### Portability

- [ ] Published skills avoid personal paths.
- [ ] Harness-specific metadata is omitted unless required.
- [ ] Tool-specific behavior is mapped through setup docs or adapters.
- [ ] Missing soft context degrades quietly.
- [ ] Missing hard context triggers setup or a clear question.

### Documentation

- [ ] Durable docs record terms, decisions, contracts, or rejections.
- [ ] Docs are created lazily.
- [ ] Durable artifacts avoid line numbers and stale file paths.
- [ ] Output templates are behavior-first.
- [ ] Handoffs point to artifacts instead of duplicating them.

### Security And Safety

- [ ] Secrets and personal data are redacted.
- [ ] Destructive operations ask or are blocked.
- [ ] File-writing workflows re-read before writing when users may edit.
- [ ] Temporary code is deleted or marked clearly.
- [ ] Debug instrumentation has cleanup instructions.

### Verification

- [ ] The skill has a feedback loop or explains why it is conversational only.
- [ ] The done gate checks the original user-facing goal.
- [ ] The validation method uses the host repo's existing workflow.
- [ ] Any helper script has a smoke test.

## Common Anti-Patterns

### Mega-Skill

One skill tries to plan, implement, test, review, deploy, and hand off all work. Split it. Let skills compose through artifacts.

### Trigger Hidden In Body

The body says "use this when..." but the description does not. The model may never load the body. Put trigger logic in frontmatter.

### Cargo-Cult Setup Pointer

Every skill says "run setup first" even when setup is optional. Matt explicitly avoids this. Hard dependencies get setup pointers; soft dependencies proceed with less sharp output.

### Personal Context In A Public Skill

Hardcoded vault paths, private label names, local aliases, personal auth workflows, or tool preferences belong in personal skills or setup docs.

### Documentation As Clutter

Extra README, changelog, quick reference, and install guide files increase noise. A skill folder should contain only what helps an agent do the job.

### Durable Artifacts That Rot

Issue briefs and PRDs with exact files and line numbers decay quickly. Use behavior, interfaces, acceptance criteria, and decisions.

### No Refusal Boundary

If the skill never says "do not," it will drift. Add anti-patterns for the tempting wrong moves.

### No Cleanup Gate

Debug logs, prototypes, generated reports, temporary scripts, and UI switchers must have an exit path.

### Similar Variants

For design/prototype skills, variants must be structurally different. Three card grids with color changes are not three options.

### No User Checkpoint

Skills that change direction, publish issues, write setup config, or choose architecture need visible user checkpoints. Skills that simply synthesize existing context may not.

## How To Use This Guide

When creating a new skill:

1. Write the failure-mode sentence.
2. Write the trigger description.
3. Draft the smallest possible `SKILL.md`.
4. Move branch details and templates into companion files.
5. Add done gates and anti-patterns.
6. Run the checklist.
7. Try the skill on one realistic prompt.
8. Cut anything that did not change the agent's behavior.

The best Matt-style skill feels obvious after reading it. That is the point. It captures the engineering move you would otherwise have to repeat in every thread.
