# Cut low-signal tests

Use this prompt to delete the tests that cannot go red for a real failure, make the slow ones cheaper, and stop them growing back. It combines two cuts that worked:

- **T3 Code** ([pingdotgg/t3code#22557](https://github.com/pingdotgg/t3code/pull/22557), Theo, 20 Oct 2026): deleted about 11,000 of 25,928 tests (43%), and summed test-file time fell 59%. Later PRs restored tests the cut should have kept ([#23977](https://github.com/pingdotgg/t3code/pull/23977), [#23980](https://github.com/pingdotgg/t3code/pull/23980), [#23991](https://github.com/pingdotgg/t3code/pull/23991), [#24011](https://github.com/pingdotgg/t3code/pull/24011)). The suite then grew back at about 335 tests a day until [#26166](https://github.com/pingdotgg/t3code/pull/26166) added rules and a review check (`docs/internals/testing.md`).
- **Andy** (Andesphere/andyChat#3210, 12 Nov 2026): cut test cases 40%, assertion calls 33% and test time 29%. 548 of 557 mutation checks on protected guards still go red.

Send everything from `## Prompt` to the end of this file: the prompt uses the testing rules doc and the review check below it. Replace the placeholders first:

- `<REPO>`: path to the repo.
- `<TARGET>`: the cut you expect, for example "about 40% of test cases". It is an estimate. Never cut a test only to reach it.
- `<PROTECTED>`: the areas where a bug costs most, for example "auth, roles, tenant isolation, billing, money, webhooks, idempotency, time zones, persistence, secrets".

## Prompt

Cut the low-signal tests in `<REPO>`. Expected size: `<TARGET>`. A test stays only when it is the cheapest one that goes red when something that can break does break. The goal is a suite that is smaller, faster and still catches every real regression. A smaller number alone is not the goal.

**1. Baseline first.** Before you change anything, record these on the same machine:

- test cases, assertion calls, test lines and test files (static counts, with the regexes you used);
- wall time of the full suite and the summed time of every file run alone;
- which tests fail or flake on main today, so the cut is not blamed for them.

A cut that only merges table rows into fewer cases does not count. Asserts and test time must fall as well.

**2. Rubric.** Delete:

- copy, translation, markup, CSS and constant mirrors, and props rendered to static markup;
- snapshots of how the source is spelled (a regex that a file contains a line, or that an import is written a certain way);
- checks the type system, compiler or a validator already makes;
- mock-call mirrors (an assert that a mock got exactly what the code passed it) and callback wiring;
- tautologies, and asserts on fixture data the test itself just wrote;
- duplicate asserts, duplicate table rows that hit the same branch, and a `toBeDefined` just before a stronger assert;
- trivial logic, basic DOM behaviour and smoke runs;
- tests that wait on real time, and wall-clock performance asserts;
- tombstones for deleted features, and one file per issue number.

Keep:

- orchestration, state machines and event sourcing;
- provider and protocol translation, external-format parsing, and webhook signatures;
- auth and permission guards, persistence and migrations;
- retries, idempotency, deterministic race fixes and time zones;
- the logic a past bug fix changed;
- structural scans: a source or file-tree scan that keeps an inventory complete or a safety rule universal, such as "every route has its guard" or "every error code has copy in every language".

**3. Never cut these by vote.** In `<PROTECTED>`, a test can go only by folding it into a kept case, and only after a mutation check. Every module that ships and had a test still has one afterwards. Watch for the two over-cuts T3 had to restore:

- A test that uses a fake or deterministic clock is not a test that waits on real time. T3's review restored 22 auth-expiry tests the cut had labelled "timing".
- A module's only direct test goes even when it looks small. T3 restored the only tests of a render scheduler, of secret redaction in clipboard logs, of DST scheduling and of permission revocation.

**4. How to cut.**

- Split the files across parallel agents, each with this rubric.
- Run two independent passes. A cut ships only when both agree. A third vote settles disagreements, or the test stays.
- Apply the cuts with the language's AST, matched by test title, not by hand. Then remove the imports, helpers and fixtures that only deleted tests used. Run knip or similar for exports that only those tests used, delete what nothing calls, and update docs and scripts that name deleted files.
- Make the heavy files cheaper while you are in them: smaller fixtures that still cross the same boundary, an injected clock in place of real waits, and one test world per `describe` instead of one per test.
- Give every assert inside a loop its row's name (`expect(actual, row.name)`), so a failure says which row.
- Update the shard weights or timings so the CI shards stay balanced.

**5. Prove nothing real was lost.** For each guard in `<PROTECTED>`, and a sample elsewhere:

1. Break the guard in production source.
2. Run the kept tests that touch it, and expect red.
3. Restore the source, and check that `git diff` on it is empty.

Put the table in the PR: guard, mutation, red or green, and the kept case that went red. For each green result, run the same mutation on main. Green on both means a gap that existed before the cut: file it, don't hide it. Green only after the cut means you lost a test: restore it.

**6. Flakes.** No retries. A test that needs a retry has a bug in the test or in the product. Find it. If the bug is in the product, file it with a reproduction and keep the test failing loudly.

**7. Stop the regrowth.** T3's suite grew back by about 335 tests a day after its cut, until it wrote the rules down and added a review check. Do both:

- Write the testing rules doc below into the repo's testing doc (for example `docs/testing.md`). Adapt the examples to this repo's stack, and keep every rule.
- Put the "What to test" and "Waiting and time" rules in AGENTS.md too, worded the same, with a line saying to change both together.
- If the repo has a review bot, add the review check below.
- Where lint can enforce a rule (no per-test timeouts or retries, no wall-clock reads, no polling loops, no skip without an issue), add the lint rule and name it in the doc.

**8. Report.** One PR, or one per package for a large repo. Include:

- a before and after table: cases, assertion calls, test lines, test files, suite wall time and summed file time;
- the rubric, how many passes ran, and how many cuts were agreed or restored;
- the mutation-check table;
- the files made cheaper, with before and after seconds;
- anything already broken on main, listed separately.

Do everything you can without me first. Ask me only before you cut a test in `<PROTECTED>` that the mutation check says nothing else covers.

## Testing rules doc

This merges T3 Code's `docs/internals/testing.md` (#26166) and Andy's "Test signal" block in AGENTS.md (#3210).

```markdown
# Testing

Rules for writing tests, and for asking for them in review. AGENTS.md carries the same rules; change both together.

Keep a test only when it is the cheapest one that goes red when something that can break does break.

## What to test

- **Test what can break:** auth and permission guards, roles, tenant isolation, billing and money, provider payloads and protocol translation, webhook signatures, external-format parsing, persistence and migrations, orchestration and event sourcing, retries and idempotency, race fixes, time zones, and the logic a bug fix changed.
- **Leave out:** what types, the compiler or a validator already guarantee, trivial logic, copy and translation text, markup, CSS and constants, props rendered to static markup, smoke runs, callback wiring, mock-call mirrors (an assert that a mock got what the code passed it), snapshots of how source is spelled, and tombstones for deleted features.
- **Keep structural scans:** a source or file-tree scan that keeps an inventory complete or a safety rule universal (every route has its guard, every error code has copy in every language) is not a mirror.
- **Extend before you add:** when an existing case or table covers the behaviour, add a row or an assert there. Write a new case only for a distinct way to fail. Never open a new file per issue. A loop over rows passes each row's name to the assert (`expect(actual, row.name)`), so a failure names the row.
- **One layer:** test a behaviour once, at the lowest public boundary that fails on main (a server function, a route, a CLI or MCP operation). Do not repeat it in a wrapper, at each call site, or in web and mobile copies of the same logic.
- **Browser tests only for the browser:** layout and scrolling, focus and pointer input, real workers, or a component wired to its hooks. Logic a component calls gets a unit test beside it. A browser test file spends seconds loading before its first test runs; a unit test takes milliseconds.
- **Bug fixes:** a logic, data, state or protocol bug gets a failing test first (the fewest that fail on main for that reason, in an existing case where one fits), then the fix. A purely visual bug (spacing, colour, alignment, layout shift) gets before and after screenshots and no test. A server-only fix with no visible surface ships the test plus a short runtime transcript.
- Backend behaviour changes ship with focused tests for that behaviour.

## Waiting and time

A test that needs a timeout to pass is wrong.

- Use a fake clock, an injected `now`, or an explicit completion signal: await the event, promise or queue item that marks the milestone, or drain the background worker. Never sleep, and never poll in a loop.
- Never assert how long something took (`Date.now()` or `performance.now()` deltas). Assert on events and counts.
- Prove concurrency by holding the first call open, not by timing.
- No per-test timeout argument and no retry. The project timeout is the ceiling. A flaky test has a bug in the test or in the product: fix it, don't retry it.
- A skipped test needs a tracking issue on the line above: `// quarantine: #1234 <why>`.

## Independence

Files run in random order, and nothing is retried. A test builds its own state (its own database or backend and seeds, never what an earlier test left), puts back what it changes (env, globals such as `fetch`, shared fixtures, the system time), and drains the background work it started. Shared mock state is reset at the top of each test, not in module-level variables.

## Review

- Ask for a missing test only when it would catch a real regression. Do not ask for one assert per constant, label or `switch` case.
- Flag a new test that breaks these rules, and name the fix: fold it into the existing case or table, delete it, keep one layer, or move a browser test whose asserts would pass without rendering into a unit test.
```

## Review check

T3 runs this as a Macroscope check on a cheap model (GPT-6.1 Terra, low reasoning) over test files only. Its eval found that a short prompt that points at the testing doc did as well as an inline checklist, and stronger models were not needed. Adapt the paths and the bot's config format.

```markdown
# Test signal review

Review only the tests this pull request adds or grows. Tests it moves, renames, or deletes are not findings. The rules are in `docs/testing.md` under `## What to test`; read that section first and hold new tests to it.

Post each finding as a brief inline comment on the new test with one fix. Ask only for fewer or smaller tests, never for more coverage.

When there are no findings, make the entire final response exactly `All clear` on one line with nothing else.
```
