# SWE workflow tools

These tools do not spawn agents or require a particular agent harness.

- `node check-plan.mjs <plan.md>` validates the restored plan contract: evidence
  boxes, ten live lanes, performance baseline, review gate and scheduled audit.
- `bun orch/orch.ts --help` exposes the durable unit, inbox, frontier and
  verification store. Set the store path explicitly as documented by help.
- `watch-pr/watch-pr --help` explains GitHub status, stack and queue modes.
  `--status-only` makes one query instead of polling. The watcher does not merge.
- `worktree-audit.sh -b <ref> [--activity <file>] [--transcripts <dir>] [--json] <repo>`
  audits Git worktrees without changing them. It reads local refs; refresh them
  separately before making deletion decisions. It does not infer a harness's
  session directories. Use the project's VCS tools separately for other workspace types.

The first orchestration or watcher invocation installs the locked Bun dependencies
in this directory. Tests and typechecking can run with:

```sh
bun install --frozen-lockfile --ignore-scripts
bun test orch watch-pr check-plan.test.ts
bun run typecheck
python3 test-worktree-audit.py
python3 test-ship-pr.py
node --test workflow-safety.test.mjs
```

## PR readiness

Passing CI does not clear merge gates. Required approval, GitHub's blocked or
behind state, and unknown mergeability produce explicit blockers (exit 6), not
READY. Query again after GitHub computes mergeability or the named gate clears.
Snapshots reread PR facts after collecting checks and threads. A changed head,
base SHA, destination or gate invalidates that observation. READY includes the
observed head and base identity, but it is evidence, not merge authority or an
atomic service lock. Empty or unreported checks remain unavailable and cannot
become READY; bounded polling ends in TIMEOUT or a status-query blocker. Projects
with no checks need explicit policy outside this watcher, not a synthetic pass.
These gates apply to single PRs, stacks and queued stacks. `--allow-draft` waives
only the draft gate for verification; it never waives approval or mergeability.
The status table reports the same gates. This intentionally tightens upstream's
readiness policy; `readiness.test.ts` covers the inherited false-ready cases.

## Automated review accounts

The watcher recognizes standard GitHub `[bot]` accounts and the generic
`reviewbot` fixture account. Set `SWE_REVIEW_BOT_LOGINS` to comma-separated exact
account logins for installations whose review account has no bot suffix. It
counts distinct `RUN_ID`, `REVIEW_AUTOMATION_ID` or legacy service automation
markers, falling back to one pass when no run marker exists. Existing service
account formats remain compatible even when the local labels are generic. All unresolved threads still block readiness;
bot recognition does not authorize dismissal. No agent provider is required.

## Explicit activity input

Export only the relevant workspace activity from the active harness or supply a
verified record. Do not invent inactive or unpinned states. The format is:

```json
{
  "observedAt": "2026-10-22T12:00:00Z",
  "worktrees": {
    "/absolute/worktree/path": {
      "active": false,
      "pinned": false,
      "lastActivity": "2026-10-01T12:00:00Z"
    }
  }
}
```

Activity observations expire after five minutes. Missing, stale, active or pinned
records never produce a safe candidate. Explicit transcript directories can
identify recent use but cannot prove inactivity. Dirty, untracked, unpublished
and open-PR work is held, even when Git is configured to hide untracked files.
Any open or draft PR for the branch blocks cleanup, regardless of listing order.
An unavailable PR query or a listing at its limit requires PR-state verification.
A squash-merged PR counts only when its head and base match the inspected
worktree. A candidate is advice, never deletion permission. Native Git locks, ignored files,
HEAD-reflog-only commits and submodule entries are preservation holds. All ignored
files and submodules are held conservatively; this tool does not decide which
are disposable caches.

## Landing, checkpoints and project overrides

- `python3 ship-pr.py inspect --repo <owner/repo> --pr <number>` reads a landing
  revision and both pending mechanisms. `cancel-pending --record <file>` performs
  only authorized cancellation, with revision checks, bounded calls and readback.
  It never merges. Follow [Merge and restack safety](../references/merge-safety.md).
- `node resume.mjs begin|publish|read --project <directory>` shares a validated
  checkpoint locator. Use `--store <durable-directory>` outside Git or when the
  checkout will disappear. Follow [Resume storage](../references/resume-storage.md).
- `node check-playbooks.mjs <project-root>` validates `.agents/playbooks` against
  the installed bundled steps. Unknown, missing and ambiguous anchors fail closed.

The orchestration store requires filesystem hard links and atomic directory
renames. It fails closed when those operations are unsupported. Forced takeover
requires revoking the old writer's ownership first; it is not safe parallel access.
