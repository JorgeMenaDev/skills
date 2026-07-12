# Reliability Patterns for Skills

Reference skills worth re-reading when designing a non-trivial skill:

- **gstack `office-hours`** — https://github.com/garrytan/gstack/blob/main/office-hours/SKILL.md (decision-tree machinery, deterministic state)
- **gbrain `ingest`** — https://github.com/garrytan/gbrain/blob/master/skills/ingest/SKILL.md (contracts, anti-patterns, output formats)
- **mattpocock/skills `wayfinder`** — https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md (leading words, fog-of-war state model, completion gates)
- **mattpocock/skills `teach`** — https://github.com/mattpocock/skills/blob/main/skills/productivity/teach/SKILL.md (stateful workspace, progressive disclosure, durable learning records)

Proven locally: the `operator` skill's role-routing bug (agent guessed it was the Requester and handed the job back to the user) was fixed by adopting pattern 1.

## 1. Bash preamble computes state; the model only branches

Open the skill with a bash block that inspects the filesystem/config and **echoes named tokens** (`ROLE: operator`, `TEL_PROMPTED: yes`, `SESSION_KIND: spawned`). Every conditional in the markdown keys off an exact echoed token, never off model inference. Use when the skill's behavior depends on state the model would otherwise guess (role, pending work, first-run, host kind).

## 2. The if-else markdown grammar

```
If `VAR` is `no`: <instructions>
Options:
- A) <choice> (recommended)
- B) <choice>
If A: run `<cmd>`
If B: run `<cmd>`        # chain follow-ups as: If B→A: ...
Always run (regardless of choice):
```bash
touch ~/.tool/.marker
```
Skip if `VAR` is `yes`.
```

Touch-file markers make prompts one-time. "Always run" lines are unconditional cleanup.

## 3. STOP gates that name the failure mode

Don't just write "STOP". State the exact failure the gate prevents: *"Writing the recommendation in prose and continuing is the failure mode this gate exists to prevent."* A named failure is far harder to rationalize past than a bare imperative.

## 4. Contract section up top

A short invariant list every operation must satisfy (gbrain's "Iron Law": every entity mention back-links; State sections are rewritten, never appended). Put it before the workflow so it frames everything after.

## 5. Anti-Patterns section

Named failure modes with the *why* ("An unlinked mention is a broken brain"). The why is what generalizes; the list is what gets checked.

## 6. Output Format block

Exact template for the skill's report/deliverable, plus a status protocol: `DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + one line of evidence. Uniform outputs are parseable by the next agent.

## 7. Section index + anti-memory rule

For big skills: keep SKILL.md a decision-tree skeleton; heavy steps live in `sections/*.md` with a "When → Read this section" table. Rule: *"Read the section in full before doing its step; do not work from memory"* + an end-of-run self-check ("if you produced the deliverable without Reading X, stop and Read it now").

## 8. GOOD/BAD exemplar pairs

For tone or judgment instructions, show a softened example to avoid and a forcing example to aim for. Exemplars beat adjectives.

## 9. Escape hatch with graduated yield

If the user pushes back on the workflow: comply partially once (with a one-line reason), comply fully on the second pushback. Never ask a third time.

## 10. Test Before Bulk

Any skill that processes many items: run 3–5 first, read the actual output, fix the approach (not the items), then bulk. Cleaning up 100 bad outputs costs more than sampling 3.

## 11. Frontmatter declares effects

For skills that mutate things, declare it machine-readably: `mutating: true`, `writes_to: [dir/, dir/]`, `triggers: [...]`. Readers (and routers) shouldn't have to read the body to learn the blast radius.
