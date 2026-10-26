# Provenance

SWE (Software Engineering) adapts
[backnotprop/pstack](https://github.com/backnotprop/pstack) at
`02b59d7f73a693d40ad2090d00789f3e3a772151`, version `0.15.32`.
That repository is a maintained mirror of
[cursor/plugins/pstack](https://github.com/cursor/plugins/tree/main/pstack),
with its own adaptations. [LICENSE](LICENSE) preserves Lauren Tan's 2026 MIT
copyright notice. Upstream attribution is not an active harness dependency.

## Retained substance

- All 24 principle leaves are unchanged.
- All 23 playbooks remain, with their detailed operating rules restored.
- 56 of 58 skill roots remain. The complete helper catalog preserves discovery
  without exposing every helper as a standalone command.
- The plan validator and tests, orchestration store and tests, GitHub PR watcher
  and tests, worktree auditor, decision-log tool and complete statechart tool
  are retained. The guide's eleven Markdown pages are restored.
- The source revision and preservation manifest make omissions and changes
  reviewable. Maintenance never overwrites the fork or advances its pin silently.

## Integration changes

- Renamed the local entry to SWE. Only SWE and its maintenance entry are exposed.
- Core workflows use the active harness's documented capabilities. Models and
  local harness policy come from the existing model-selection skill, not SWE.
- Removed hardcoded agent types, cloud flags, model slugs, permission assumptions
  and guessed transcript directories. Independent review remains independent.
- Restored fresh-agent policy, complete briefs, pilots, queue discipline, bounded
  retries, verification ledgers, merge-frontier rules, review-triage patterns,
  plan templates, ten live lanes and interaction-review gates.
- Plan validation checks a harness-neutral scheduled audit and installed skill
  reads instead of a vendor loop command or an assumed project checkout layout.
- QA selects tools by environment, interaction and evidence capabilities, not
  product names. Native tools can drive live verification without a separate
  control skill. Unit tests complement, rather than replace, real-system QA.
- Review automation uses generic bot identities, configurable account logins and
  run markers. The watcher still blocks on unresolved threads and uses gh.
- Fixed an inherited false-ready verdict: required approval, blocked or behind
  state, and unknown mergeability now block single, stack and queued watchers.
  Draft-verification mode does not bypass those gates. Added regression tests
  without changing the pinned baseline or its preserved upstream tests.
- The worktree auditor takes explicitly scoped history or an activity export.
  Unknown activity, untracked work, unpublished heads and uncertain PR state are
  held. Untracked detection overrides Git's hide setting; any open or draft PR
  blocks cleanup regardless of listing order. A query at its result limit cannot
  establish safety. Squash-merge evidence must match the exact head and base.
  The auditor does not modify refs or delete workspaces. This is intentionally
  stricter than upstream.
- User authorization, local VCS policy and writing preferences override inherited
  defaults. No implicit publishing, destructive reset, or competing replacement
  writer. A changed merge base can require fresh verification even with an
  unchanged patch-id.

## Deliberate exclusions

- The model-setup skill is replaced by shared model-selection.
- The vendor webhook-bot UI, automation pack, plugin manifests, registered-agent
  adapters and foreign-harness installation guide are not installed.
- Decorative images and marketing packaging are not part of the local workflow.
  Generic guide content and the comment-reviewer prompt remain in the bundle.
- No harness-specific prompt aliases or background updater are installed.

## Approved safety ports

The seven-finding audit also compared
[michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude/tree/356c6e0f978df729eb16f227d795f34d221c5aad).
That is a separate fork, not the baseline above. The approved repairs use its
merge-safety protocol, serialized lock takeover and release, checkpoint/link
validation design, and project-playbook anchoring contract. Its MIT notices are
preserved in [LICENSE.pstack-claude](LICENSE.pstack-claude). UPSTREAM.json remains
unchanged; this is a selective port, not a claim that every change in that fork
has been integrated.

- Shipping binds immediate merges to the verified head and checks the destination.
  The new ship-pr helper inspects and cancels both pending merge mechanisms with
  revision checks and readback. Auto-merge and queue admission require existing
  repository-enforced verification; restacking uses captured explicit leases.
- Orchestration serializes takeover and release and publishes a PID-bearing lock
  through a hard link. Unlike the other fork, unsupported hard links fail closed
  rather than falling back to a crash-vulnerable empty lock.
- Cleanup holds ignored files, native Git locks, HEAD-reflog-only commits and
  submodules, in addition to the existing activity and PR checks. It conservatively
  holds all ignored files and all submodule entries, not just selected categories.
- Watcher snapshots compare facts before and after checks and carry both head and
  base identities in READY evidence. Empty or unreported checks remain unavailable
  and never become READY. The audit initially overstated that part of the gap:
  the earlier watcher already failed closed on absent checks. The requested fork's
  timed acceptance of no-check projects is deliberately not ported.
- External review markers remain compatible with their original service format.
  Generic labels do not require rewriting incoming comment bodies.
- Pause and pickup share validated checkpoint publication, artifact hashes and
  cold-start readback. The Git common-directory default and explicit durable-store
  override do not depend on a particular agent harness. Local VCS authority wins.
- Project playbooks validate explicit frontmatter and unique step anchors before
  application. Overrides cannot weaken authorization, review or evidence gates.

The first local port over-pruned neutral content. This restoration supersedes
those cuts. Further simplification requires explicit review, not mechanical
removal of a whole file because one paragraph mentions a vendor.
