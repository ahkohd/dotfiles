# Merge and restack safety

This protocol requires the user's landing or topology-change authority. It never grants permission to merge, push, retarget, cancel someone else's merge request, or change repository protection.

## Record and cancel pending requests

Before reviewing a landing or changing a chain, record every affected PR bottom-to-top, its repository, head SHA, base branch and SHA, and its intended final destination. Leave unrelated PRs alone. Save the independent verdict and stable patch-id of the base-to-head diff with that record.

Use the installed `scripts/ship-pr.py` helper by its absolute path:

```sh
python3 <scripts>/ship-pr.py inspect --repo <owner/repo> --pr <number> > <record.json>
python3 <scripts>/ship-pr.py cancel-pending --record <record.json>
```

Inspection reads both auto-merge and queue membership. Cancellation rereads the saved revision, disables auto-merge if present, rereads queue membership, dequeues if needed, and reads back. Only exit 0 with `kind: cancelled` permits the planned topology change. `changed`, `not-open`, `still-pending`, or `unavailable` means stop and reconcile. Never replace the approved record just to bypass a mismatch. Unknown or unsupported fields do not mean an absent request. There are no automatic mutation retries.

Cancel ungated pending merges before a lengthy review. Before any push, rebase or base edit, inspect and cancel each affected descendant too. Cancellation is an observation, not a lock against another actor rearming. Coordinate one topology writer and stop if state changes.

## Guard the landing

Use `gh pr merge <pr> --repo <owner/repo> --squash --match-head-commit <verified-head>`. Confirm the approved base immediately before and after the request. GitHub's head condition does not guard the base. If the installed service lacks a server-enforced head condition, stop at merge-ready.

Auto-merge and queue admission are allowed only when existing repository rules enforce the independent verification and required CI on the eventual revision and merge context. A prose verdict on an earlier head is insufficient. A plain merge can admit a PR to a required queue and takes the same gate. Never use `--admin`, weaken protection, or silently substitute ungated auto-merge. Without the guarantees, wait for an immediate guarded merge or stop at the unmet queue gate.

Confirm `MERGED`, the approved head, the intended base, and a non-null merge commit through inspection. Fetch the destination and verify that the merge commit is its ancestor with `git merge-base --is-ancestor <merge-commit> <destination-tip>`. Check resulting content before advancing. A queued request or successful command alone is not a landing.

## Preserve concurrent and child work

Before rewriting, capture the remote SHA using `git ls-remote --exit-code origin refs/heads/<child>` and require exactly that ref. Save the old parent tip on which the child was built. Verify it is the child's ancestor and that `old-parent..child` contains only child work. After confirming the parent's squash merge in the destination, replay only that range in the child's clean worktree:

```sh
git rebase --onto <destination-tip> <old-parent-tip> <child>
git push --force-with-lease=refs/heads/<child>:<captured-remote-head> origin HEAD:refs/heads/<child>
```

An implicit lease can be weakened by background fetches. A refused explicit lease requires reconciliation, not refreshing the lease and retrying. Do not infer the old parent boundary from its new squash commit. Retarget only after pending cancellation is verified. Rerun checks and mergeability after each rewrite or retarget, and rerun independent verification when the base, dependencies, behaviour or applicability changed. Patch-id alone is insufficient.

At each scheduled wake compare the observed head, base SHA and destination with the approved record. Cancel pending requests whose evidence no longer applies, within the user's authority. Preserve watcher blockers; do not rearm unchanged blockers.
