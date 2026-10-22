# Set up SWE

SWE is already installed from the shared skill hub. Refresh skill discovery using the active harness's documented mechanism after changing files. Use /swe for work and /swe-maintain for an
upstream review. Maintenance proposes changes; it does not install them silently.

## Choose models

Use the existing model-selection skill and confirm availability through the active harness.
There is no separate per-role settings file. Independent design and review can
cost more than one direct implementation; size the panel to the task while
preserving actual reviewer independence.

## Give the project a verification procedure

If the project lacks a scripted way to drive the real app, use
[create-verification-skill](../../skills/create-verification-skill/SKILL.md).
It writes `.agents/skills/verify-<app>/` and proves its launch, drive, evidence and
cleanup steps before handing them off. Existing verification procedures should
be maintained rather than duplicated. This is optional setup, not an automatic
change to every project.

For a race or invariant tests cannot adequately explore, consider
[create-formal-verification-skill](../../skills/create-formal-verification-skill/SKILL.md).
The resulting model records its coverage and code-sync revision. It needs
maintenance when covered code changes. Neither form of verification replaces
the other. [Verify and ship](06-verify-and-ship.md) explains the distinction.

## Start a task

Give /swe a goal, relevant constraints and an observable finish condition. It
selects the appropriate playbook. Other helper names shown in this guide are
bundled workflows, not separately installed commands. Invoke them through SWE,
for example `/swe use interrogate to review the current diff`.

Installing SWE does not authorize commits, publication, merges or ongoing
monitoring. Those steps require the scope of the user's actual request.

Next: [Use SWE](02-swe.md).
