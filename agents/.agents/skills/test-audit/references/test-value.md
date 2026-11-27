# Default test standard

Use this when the project has no testing rules of its own. Project rules win
wherever they differ.

## Test at the boundary

Test what users or callers can observe, through the system's real entry
points: UI and stores for an app; routes, webhooks, queues and the clock for
a service. Assert on outputs at the same boundary: responses, rendered state,
messages sent, files written, requests made to other systems.

- One lifecycle test per user journey. Add a step to an existing journey, or
  a row to a table, before adding a new test.
- Test below the boundary only when both hold: the unit is a standalone
  contract (its inputs alone define its output, as in a parser, scheduler or
  ranking function), and its complexity makes boundary coverage impractical.
  Write those as tables with no fakes.
- Never assert internal state, private fields, render counts, internal call
  order, query or transaction counts, SQL text, caching or batching.
- A behaviour-preserving refactor must leave tests unchanged. If it would
  not, the test is coupled: fix the test.

## Fakes and mocks

- Fake only the process edges: third-party HTTP APIs and SDKs, email,
  object storage, the network. Use shared fakes, not one per test.
- Do not mock the project's own modules, functions or database. Use the real
  code and a real (local or containerised) database where practical.
- Assert that every required fake route or listener actually fired, so a
  pattern that matches nothing cannot pass silently.

## Production code

Do not reshape production code only to make it testable; test from a higher
boundary instead. Add a seam only when production code uses it too, such as
`start()` returning a disposer.

## Checks on every test

- **Mutation check**: break the guarded behaviour, watch the test fail for
  that reason, restore the code exactly.
- **Past fixes**: before deleting or rewriting a test, read `git log` for it
  and its source, and keep coverage for any past user-visible bug fix.
- **Bug tests** must fail before the fix.

## Time and determinism

- Never sleep or wait on wall-clock time, and never shorten timeouts to make
  a test faster. Advance a fake clock, await the event, and flush pending
  work before asserting that something did not happen.
- Never assert elapsed time or peak memory, and never compare against the
  real current time when the code reads a clock: use the test clock.

## Isolation

Tests must pass alone, in any order and concurrently.

- Clean up everything a test creates: rows, keys, scheduled jobs, timers,
  listeners, environment variables, sockets, files and modified singletons.
  Prefer harness teardown.
- Never use fixed IDs, emails or keys; use returned IDs or test-unique
  prefixes.
- Never depend on an earlier test. Fix the cause of a flaky test instead of
  adding retries, longer timeouts or waits.

## Snapshots and fixtures

- Never hand-edit generated snapshots; regenerate them with their test.
- Golden fixtures are frozen: change one only in the same commit as an
  intentional behaviour change, and say why in the commit message.
- Prefer no test to a trivial one. Do not test constants, flag tables,
  argument spies or logging, except log lines something else counts on.
