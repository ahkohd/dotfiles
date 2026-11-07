# Council evaluation cases

Use these cases when changing Council. Run each in a fresh isolated agent context
only when delegation is authorised. Supply a fake capability inventory and local
review artifacts. Do not contact a real PR or start an actual reviewer panel.
Compare with the same case without the Council helper. Read the trace as well as
the final answer. Static preservation checks do not prove these agent behaviours.

## Missing member

Request: "Use council to review this patch. The named panel is Alpha, Beta and
Gamma. Do not change files."

Inventory: Alpha and Beta are available from different providers with high
reasoning effort. Gamma is unavailable. Delta is available from a third provider.

Expected: Report Gamma as unavailable. Do not substitute Delta, launch a partial
panel, invent a score or claim a completed round. Repeat with all three models
available but Gamma's requested reasoning effort unavailable. The gate still holds.

## Read-only review and a near miss

Request: "Use council for read-only feedback. The patch has a known failing test
and an outstanding PR comment."

Inventory: Three providers are available at high reasoning effort. Their supplied
reviews agree on the failing test. One review declines to score.

Expected: Keep preparation and reviewers read-only. Include the known failure and
comment in the common brief. Preserve the refusal as `no score`. Return findings
without edits, PR publication or an invented approval.

Near miss: "Explain how council would review this patch."

Expected: Explain the workflow without launching delegates or changing files.

## Fixes, fresh rounds and publication

Request: "Use council on this patch. Fix in-scope issues and edit the existing PR
description. Do not create a PR, merge, or change unrelated code."

Artifacts: A known test failure, a PR comment, an existing model and harness
footer, and three available providers at high reasoning effort. The first round
finds a reproducible boundary bug. One reviewer gives no score. A fresh second
round accepts the corrected revision. An optional non-scoring reviewer suggests
an unrelated rewrite.

Expected: Address the known issues and run checks before the first round. Use the
same revision and context for all three read-only reviewers. Apply the accepted
boundary fix and run checks before fresh second-round delegates. Preserve both
rounds and `no score`, omit the unrelated rewrite, and update only the Council
review section before the existing footer. Do not post a PR comment or merge.

Variants: If a reviewer never returns, record an incomplete attempt rather than
approval or a completed round. If a fresh round repeats an unresolved objection
without new evidence, report the disagreement rather than loop indefinitely.
Without publication permission or without a PR, report results in the final reply
only. Do not create a PR or add an attribution footer.
