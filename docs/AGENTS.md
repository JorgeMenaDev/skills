# Engineering guidance

These are defaults for working in this repository. Follow the user's explicit instructions when they override these defaults.

## Before changing anything

- Read the repository's instructions and the documentation for the area you will change.
- Check the current code and Git state. Treat old reports as context, then verify their claims.
- Questions such as "should we" or "how hard would it be" ask for analysis. Answer without editing, offer a change, and wait for an instruction to implement it.
- State assumptions that affect the result. If interpretations lead to different outcomes, explain the tradeoff and ask for the missing decision.
- For work with several steps, give a brief plan with a check for each step.

## Simplicity first

- Build the smallest solution that meets the request.
- Add features, configuration, and abstractions only when the current task needs them.
- Prefer a direct implementation to an abstraction used once.
- Handle failures that can occur in the system. Avoid branches for impossible states.
- If a simpler approach solves the same problem, explain it before implementing the more complex option.

## Surgical changes

- Every changed line should trace to the user's request.
- Match the surrounding style. Leave unrelated code, comments, and formatting alone.
- Remove imports, variables, functions, and documents that your change makes obsolete.
- Mention pre-existing dead code separately. Delete it only when it is in scope.
- Keep comments accurate. Use them to explain purpose, constraints, or non-obvious behavior.
- Preserve other contributors' changes. Commit only files owned by the task.

## Verification

Define success as an observable result before implementing. For example:

- Validation: invalid inputs fail with the expected error.
- Bug fix: reproduce the failure, apply the fix, and check that the same case passes.
- Refactor: relevant checks pass before and after, with behavior preserved.

Run the checks appropriate to the change. Use focused tests for behavior, error handling, and meaningful regressions. For a documentation edit or another low-impact change, a direct check may be enough.

Check the affected entry points and callers. Report what passed, what failed, and what you could not verify. A changed file alone does not prove that the task is complete.

## TypeScript

- Prefer inferred types when the compiler already knows the shape.
- Model valid states so that invalid combinations fail at compile time.
- Avoid `any`. Use `unknown` and narrow it when an external value has no known type.
- Keep types tied to their source so that schema or interface changes expose affected callers.
- Prefer narrowing to assertions. Avoid one-line functions that only cast a value.

## Git and shared environments

- Follow the repository's branch, sync, commit, and review workflow.
- Inspect local changes before syncing. Preserve other contributors' work.
- Keep tracked files portable across machines. Avoid personal absolute paths and reliance on undocumented local state.
- Use an isolated workspace when concurrent edits would conflict. Remove workspaces and stop processes you created when the work is complete.
- Before committing, inspect the diff and staged paths. Include only the intended changes.
- When committing and pushing are in scope, verify the remote contains the commit before reporting it as pushed.

## Permissions and blast radius

- Keep secrets in the repository's approved secret store. Exclude them from documentation, issues, logs, and tool output.
- Obtain approval for the specific credential before replacing or revoking it.
- Production, live databases, and shared build or preview environments require explicit authorization. Name the environment and action before touching them.
- Check whether destructive or irreversible actions are already authorized. Ask when authorization is missing.
- Track the processes you start and stop only those you own. Serialize work that shares a device or exclusive resource.

## Delegation

- Delegate bounded work when it helps the task. Give each worker the repository path, relevant context, scope, and completion criteria.
- Discover available providers and models from the current tool catalog. Honor the user's chosen model.
- Give each worker that edits code an isolated workspace when edits could conflict.
- Keep review briefs read-only and within the original task's scope.
- Verify the worker's result before integrating it. The coordinating agent owns the final outcome.

## Improve the system when it earns it

The current task comes first. If you encounter a repeated mistake, broken script, or misleading instruction, fix it in the same change when the fix is small, safe, and relevant.

Prefer a structural fix, then types, then a check whose error names the remedy. Add a rule when the decision requires judgment. Raise a larger improvement once, with evidence of the time it saves or the failure it prevents.

## Communication and pull requests

- Lead with the outcome and current state. Use plain words and one consistent name per thing.
- State who acts. Give the user concrete steps when their action is needed.
- Explain constraints before asking the user to take a step with a cost or irreversible result.
- Describe what changed, why, how you checked it, and any remaining limitation.
- Follow the repository's title convention for pull requests.
- Open a pull request description with the problem and resulting behavior. Include relevant validation and a before-and-after example when it helps a reviewer.
- Record unfinished work in the project's existing tracker so another session can continue it.
