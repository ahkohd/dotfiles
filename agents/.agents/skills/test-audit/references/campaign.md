# Test-pruning campaign

Campaign mode prunes one subsystem's whole test surface in one change: a
backend feature, a frontend feature area, or one shared package. The value
bar, retention bar, candidate evidence and validation in
[SKILL.md](../SKILL.md) apply to every lane. This file adds the order of work
and what a full campaign teaches. Each step ends on its completion criterion;
do not start the next step early.

## 1. Baseline

Pin a commit on the default branch. Record the subsystem's test and support
line counts and every test file's pass or fail state there. Keep baseline
failures in their own list: treat them as possible product bugs, not stale
tests.

Done when every in-scope test file has a recorded baseline result.

## 2. Lanes and inventory

Split the surface into **lanes** along production owner boundaries, not file
names. For a messaging integration, lanes might be accounts, commands,
context, dispatch, inbound, outbound, persistence, transport, shared code,
harness, and live or QA scenarios. Include the subsystem's cases at shared
core boundaries and its QA and live-proof harness tests.

Done when every test file and QA scenario the subsystem owns belongs to
exactly one lane.

## 3. Read-only ledger per lane

Give each lane to its own read-only agent where agents are available. It
reads every assigned test in full, including parameter tables, plus the
production owners, their entry points, callers, history and CI routing. Each
test declaration goes into a written **ledger** with one mark. A
parametrised test (`it.each`, `pytest.mark.parametrize`, table-driven Go
tests) is one declaration unless its rows need different marks; then mark
each row.

- `R`: retain, naming the contract and the bug it catches. A retained test
  that only moves to a better-named file stays `R`, with the move noted.
- `F`: retain the contract but fix the assertion, such as a vacuous negative
  that passes when only one of several items is missing.
- `C`: consolidate, naming the owner that absorbs the assertion first: a
  sibling table case, a stronger boundary suite, or the shared owner in
  another package.
- `D`: delete, naming the proof that remains, or why no contract exists.

Judge a test by its assertions, not its name. A test named for clearing a
window can assert that the window was _not_ cleared.

Done when every declaration in the lane has a mark and an evidence line.

## 4. Layer plan per lane

Treat the ledger as input, not the edit list. A second read-only pass,
starting from the ledger, looks for redundant **layers**, such as several
suites replaying the same shared helper through one mock beside stronger
suites that use the real stream or an HTTP fixture. Name the **keeper**
suite for each contract. Prefer the real transport boundary with a fake
network over a mocked collaborator. Correct any ledger errors this pass
finds.

Done when each lane plan names its retired files, its keeper per contract,
the assertions to carry into keepers, and the test-only production seams it
unlocks.

## 5. Cutover

Edit lane by lane. Route changes to shared harnesses and support files
through one owner, one at a time. With each lane, remove the test-only
production seams it unlocks: injection parameters, getters, reset exports and
indirection layers. Register moved suites in CI routing and any test
inventories. Put durable test-ownership rules in the subsystem's agent
instructions (`AGENTS.md` or `CLAUDE.md`), drawn from mistakes this campaign
actually found.

Done when every lane plan is applied and each lane's keepers pass.

## 6. Preservation review

Before claiming completion, have independent reviewers compare deleted
coverage against the keepers, one reviewer per boundary group. They look for
contracts that lost their only proof, and for new assertions that cannot
fail, such as a rejection row the production code never reaches.

For each restored contract, make one deliberate **mutation** of the
production owner and confirm the keeper fails. Then restore the source byte
for byte.

Done when every reported gap is restored or rejected with source evidence,
and every restored contract has a caught mutation.

## 7. Product defects

A baseline failure that survives into a keeper is a bug report. Fix it at
its owner as a separate commit, and prove it through the real user flow with
a **control** run that reverts the fix and shows the old behaviour. Record
unrelated product problems you find as follow-ups instead of fixing them in
the campaign.

Done when each repaired defect has a failing control and a passing candidate
on the same harness.

## 8. Reconcile and hand off

Campaigns outlive many commits on the default branch. Merge it in rather
than rebasing a long campaign branch.

- When the default branch changed a test file the campaign deleted, keep the
  deletion, port the new contract into the keeper, and confirm every new
  regression test still has a home.
- When it changed a production or shared-support file the campaign deleted,
  check that file's non-test callers again before keeping the deletion. A new
  production caller or contract returns the file to audit.

Rerun the whole subsystem suite and repeat any live proof on the merged head.

Expect review tools to see a truncated file list on a diff this large.
Record maintainers' decisions on compatibility flags in the pull request
evidence rather than editing gates.

Hand off with the report in [SKILL.md](../SKILL.md), plus:

- baseline and final test and support line counts, with production counted
  separately;
- lanes, retired layers and keepers;
- preservation gaps found and the mutations that proved them;
- product defects with control and candidate proof.
