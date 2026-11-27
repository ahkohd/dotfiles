---
name: test-audit
description: Gate new tests and audit existing ones in any codebase, keeping tests that protect behaviour and removing ones that re-assert source, duplicate stronger proof or couple to implementation. Use when writing or reviewing a test, pruning a test suite, or asked whether a test is worth keeping.
---

# Test audit

Three modes share one value bar:

- **Authoring**: gate every new or changed test as it is written.
- **Audit**: focused sweeps for tests that re-assert source, duplicate
  stronger proof, couple to implementation, or keep test-only production
  seams alive. Land each batch as its own coherent change and continue in
  follow-ups. Optimise for confidence, not deletion count.
- **Campaign**: prune one subsystem's whole test surface (every test file a
  feature, app area or package owns). Read
  [references/campaign.md](references/campaign.md) before starting one.

## Project rules come first

Before writing or judging a test, read the repository's own rules: root and
scoped `AGENTS.md` or `CLAUDE.md`, contributing guides, and any testing docs.
They win over the defaults in this skill. Where the project has no testing
rules, use [references/test-value.md](references/test-value.md) as the
default standard.

Then find the project's best existing example of the kind of test you are
writing: a journey through the real UI, a table for pure logic, a scenario at
a service boundary, a store against a fake server. Copy its shape, not its
shortcuts; note any shortcut it takes (driving work the system should drive,
real-time sleeps, stand-ins for its own modules) and do not repeat it.

## Authoring gate

Answer four questions. A missing answer means do not add the test yet.

1. What observable behaviour, invariant or independent contract does it
   protect?
2. What credible regression makes it fail?
3. Why does existing coverage not already catch that failure? Each contract
   has one primary test owner at the strongest boundary. Another layer needs
   its own distinct risk, such as a transport or lifecycle failure the owner
   cannot reach. Prefer extending a table case or shared fixture over a
   near-duplicate test, and consolidate duplicated setup in the same change.
4. Does it need a production seam (export, flag, wrapper, injection hook)
   that no production caller needs? If so, move the test to the real
   boundary instead.

Then check the test against every [junk pattern](#junk-patterns). A match
fails the gate unless the [retention bar](#retention-bar) names the contract
it independently guards. A test that would break under a behaviour-preserving
refactor asserts implementation, not behaviour: rewrite it at the owning
boundary before landing it.

After writing it, do the **mutation check**: break the behaviour it guards,
see the test fail for that reason, then restore the code exactly. If the
runner randomises order or seeds, run it under at least two seeds.

A bug regression test must fail on the pre-fix code for the intended reason
and pass after the fix at the owning boundary. A regression test that never
demonstrably failed proves the mock, not the fix. One regression at the owner
boundary covers the bug; do not replay the same scenario at every layer it
crosses.

## Junk patterns

The shared checklist: the authoring gate rejects a new test that matches one,
and audits hunt for existing tests that do.

- assertion-free coverage probes;
- self-comparisons and identity copiers;
- copied fixtures, inventories, manifests or export lists;
- exact source, import or string greps;
- private predicate or call-shape tests duplicated at real boundaries;
- duplicate invocations of the same contract;
- local replays of shared helpers, one per caller;
- tests whose only purpose is keeping test-only exports, globals or wrappers
  alive;
- dead production code whose only callers are tests;
- expected values produced by the helper or renderer under test;
- mocks that implement the asserted behaviour, or one mock standing in for
  different APIs;
- fixtures that supply the result, ordering or callback the code under test
  should produce, or persistence asserted against a store the path never
  writes;
- capability tests that restate a declared flag instead of exercising what
  the flag promises;
- negative controls that pass for an unrelated reason, such as a denial from
  a different guard or a rejection the production path never reaches;
- names or fixtures that promise more than the input exercises.

## Value bar

A test earns its maintenance cost by protecting behaviour, a credible
regression or an independently meaningful contract. In an audit, an existing
test that must change for a behaviour-preserving reorganisation is suspect,
not automatically deletable; the authoring gate still rejects new ones.

Before judging a candidate, read the whole test and its production owner:
entry point, callers, callees, sibling implementations, overlapping tests, CI
routing and history (`git log` on both test and source). When the test claims
behaviour that depends on a library, read that library's source or types.

## Discovery

Keep discovery read-only and report evidence before editing. For a broad
scope, split it into parallel lanes along the repository's real boundaries,
for example each app, each shared package, each language or native layer,
plus one cross-cutting sweep for the junk patterns.

Outside campaign mode, prefer a few high-confidence candidates over a large
speculative inventory.

## Retention bar

Keep a test that independently enforces a contract others rely on: public
API, SDK, protocol, config, migration, storage format, security, platform
behaviour, defaults, exact bytes sent to another system, generated
cross-language code, packaging, release or architecture rules. Also keep:

- call ordering when the order is observable behaviour;
- regressions with a credible failure mode;
- source inspection when it is the cheapest independent guard: it fails when
  the contract changes (the user-facing key, byte or path) and survives an
  identifier-only refactor;
- a test that fails on the baseline: treat it as a possible product bug,
  reproduce it, and fix the owner rather than deleting the test.

Static or slow is not a reason to delete. A test that resembles
implementation may still be the independent contract; prove otherwise before
removing it.

## Candidate evidence

Record every field before editing. A candidate with a missing field is not
ready to delete:

- exact test name and location;
- what failure it can actually detect;
- non-test callers of the production or support code it covers;
- the stronger owner-boundary proof that remains, or why none is needed;
- relevant history and why the test or seam exists;
- production or test-support code its deletion unlocks;
- risk, and the focused command that validates the change.

## Edit shape

Choose one coherent batch at one owner boundary. Delete obsolete test-only
exports, globals, wrappers and dead production paths instead of keeping
aliases. Move retained regressions to their canonical owners. Consolidate
repeated package or dependency assertions into one generic contract.

Prefer a net reduction in production code. Do not add replacement tests that
restate the same implementation, and do not turn uncertain candidates into
cleanup to raise the deletion count.

## Validation

Never edit source or tests while a test runner is running in the same
checkout. Use the commands the project documents for each changed area.

1. Run the smallest owner and sibling tests for the changed paths.
2. Where a removed test grepped source or asserted a plan, run the script or
   dry run that owns the real contract.
3. Run `git diff --check`.
4. Run the project's lint, type check and test commands that cover the
   change.
5. Read `git diff --numstat` and report production and tooling lines
   separately from tests and test support.
6. After the final edits, run a code review if one is available.

## Landing

Commit, push, open a pull request or merge only when authorised. Land one
coherent change at a time. After it lands, update from the default branch and
rerun read-only discovery for the next high-confidence batch.

## Report

- root cause and the low-value categories removed;
- simplifications to production code;
- false positives kept, and why they are still valuable;
- the focused and full checks actually run;
- production lines versus test lines changed;
- pull request and merge state;
- named follow-ups.
