# Cut low-signal tests

Use this prompt to delete the tests that cannot go red for a real failure, make the slow ones cheaper, and stop them growing back. It combines two cuts that worked:

- **T3 Code** ([pingdotgg/t3code#22557](https://github.com/pingdotgg/t3code/pull/22557), Theo, 20 Oct 2026): deleted about 11,000 of 25,928 tests (43%), and summed test-file time fell 59%. Later PRs restored tests the cut should have kept ([#23977](https://github.com/pingdotgg/t3code/pull/23977), [#23980](https://github.com/pingdotgg/t3code/pull/23980), [#23991](https://github.com/pingdotgg/t3code/pull/23991), [#24011](https://github.com/pingdotgg/t3code/pull/24011)). The suite then grew back at about 335 tests a day until [#26166](https://github.com/pingdotgg/t3code/pull/26166) added rules and a review check (`docs/internals/testing.md`).
- **Andy** (Andesphere/andyChat#3210, 12 Nov 2026): cut test cases 40%, assertion calls 33% and test time 29%. 548 of 557 mutation checks on protected guards still go red.

Replace the placeholders before sending:

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

**7. Stop the regrowth.** Put these rules in AGENTS.md and in the testing doc, worded the same in both places:

- **Test what can break:** the kept list above, plus the logic a bug fix changed.
- **Extend before you add:** add a row or an assert to the existing case or table first. A new case covers a distinct way to fail. Never open a new file per issue.
- **One layer:** test a behaviour once, at the lowest public boundary that fails on main. Don't repeat it in wrappers, at each call site, or in web and mobile copies of the same logic.
- **No mirrors:** nothing from the delete list, but keep structural scans.
- **Failing test first:** for a logic, data, state or protocol bug, watch the test go red on the current code before you fix it. A purely visual bug gets before and after screenshots, not a test.
- **Control time:** use a fake clock, an injected `now` or an explicit completion signal. Never sleep, and never assert how long something took.
- **Clean up after every test:** files run in random order. A test builds its own state and puts back what it changes.

Where the repo has a review bot, add a check that reviews only added or grown tests against these rules and never asks for more coverage. Where lint can enforce a rule (no per-test timeouts, no wall-clock reads, no polling loops in tests), add the lint rule.

**8. Report.** One PR, or one per package for a large repo. Include:

- a before and after table: cases, assertion calls, test lines, test files, suite wall time and summed file time;
- the rubric, how many passes ran, and how many cuts were agreed or restored;
- the mutation-check table;
- the files made cheaper, with before and after seconds;
- anything already broken on main, listed separately.

Do everything you can without me first. Ask me only before you cut a test in `<PROTECTED>` that the mutation check says nothing else covers.
