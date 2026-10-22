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
```

## PR readiness

Passing CI does not clear merge gates. Required approval, GitHub's blocked or
behind state, and unknown mergeability produce explicit blockers (exit 6), not
READY. Query again after GitHub computes mergeability or the named gate clears.
These gates apply to single PRs, stacks and queued stacks. `--allow-draft` waives
only the draft gate for verification; it never waives approval or mergeability.
The status table reports the same gates. This intentionally tightens upstream's
readiness policy; `readiness.test.ts` covers the inherited false-ready cases.

## Automated review accounts

The watcher recognizes standard GitHub `[bot]` accounts and the generic
`reviewbot` fixture account. Set `SWE_REVIEW_BOT_LOGINS` to comma-separated exact
account logins for installations whose review account has no bot suffix. It
counts distinct `RUN_ID` or `REVIEW_AUTOMATION_ID` values, falling back to one
pass when no run marker exists. All unresolved threads still block readiness;
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
worktree. A candidate is advice, never deletion permission.
