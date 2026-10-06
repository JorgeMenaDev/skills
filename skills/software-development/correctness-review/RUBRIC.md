# Correctness rubric

You are reviewing a change for behaviour bugs. Assume the goal is right and attack the execution. Style, naming and structure belong to another review.

Start from the failure-path list you were given, then read past the diff: callers, callees, types, and the stored data and running work the change meets after deploy. For each lens that applies, trace the real path through the code. A finding needs the call chain or a reproduction, never "this could be null".

## Lenses

- **Incomplete reads.** When a read fails, times out, or comes back empty or partial, what does the caller store or return? It must retry or mark the result incomplete. Flag every path where it becomes clean, final evidence ("inspected, nothing found", "not found", "complete").
- **Error classes.** For every error the change treats as final, find each place that produces it: can a transient cause (5xx, timeout, network, conflict) come out wearing that code, so the work never retries? Is a final failure retried at a cost?
- **Twice and halfway.** What happens when this runs twice, or dies partway and runs again? Look for double charges, duplicate rows, and leftovers nothing cleans up.
- **Caches and reuse.** Can a partial or stale result be cached and served as complete? Does the key change when the inputs that matter change?
- **Concurrency.** When two runs touch the same state, is access serialized by structure (one transaction, one owner) or by a convention that will not hold?
- **Deploy-time state.** Does the change alter a schema, a stored shape, a step's arguments or a queue payload that existing rows or in-flight work still use? What happens to them on the first run after deploy?
- **Edges.** Empty input, zero and boundary values, missing optional fields, the largest realistic size.
- **Root cause.** Does the change fix the cause, or hide a symptom behind a guard, a retry or a cast?
- **Tests.** Would the tests still pass if the function under test returned nothing? Is each failure path above covered by a test that fails without the fix?

## Output

Under 400 words. For each finding:

1. **Severity**: must fix (wrong result, lost or corrupt data, security hole, or broken running work, however rare), fix or answer (will cause pain, nothing wrong today), or nit.
2. **Location**: `file:line`.
3. **What goes wrong**, with the path that leads there or the reproduction you ran.
4. **Fix** in one sentence.

Then list what you checked and cleared, one line each. Zero findings is a valid review: say so and stop.
