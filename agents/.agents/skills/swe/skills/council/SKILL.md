---
name: council
description: "Use for an explicit council request through SWE. Three independent model providers review the same work, followed by authorised fixes and fresh review rounds."
disable-model-invocation: true
---

# Council

Use `/swe council` for a review with tracked rounds. Council is a bundled helper,
not a separately installed command. A quoted mention of council or a request to
explain it does not start reviewers. When changing this helper, use the
[evaluation cases](references/evaluation.md).

Read the [runtime contract](../swe/references/runtime.md) for delegation,
model-selection, evidence and authority. Keep harness commands and personal
lineups outside this helper. Council does not change
[Interrogate](../interrogate/SKILL.md), which returns a read-only verdict without
automatically applying fixes.

## 1. Prepare the work

Record the user's objective, scope, current revision and permission to change
files or publish. A review-only request stays read-only, including preparation.
Council itself does not authorise edits, commits, publication or merges.

Within the granted scope, address known issues and outstanding PR comments before
review. Use [review triage](../swe/references/review-triage.md) to distinguish real
issues from requests to decline or clarify. Run relevant checks and include their
results. Report blocked checks and fixes rather than hiding them from the panel.
If the user wants to discard an implementation and explore replacements, skip
repairs to the discarded code and give the panel the replacement brief instead.

## 2. Resolve the panel

Use three independent reviewers from three distinct model providers at high
reasoning effort. Distinct harness adapters or aliases for one provider do not
count as provider diversity. Resolve available models through model-selection
and the active harness. Do not hardcode a model or assume that an advertised
model is accessible. Unless the user names members, choose the latest flagship
model from each provider. Use model-selection to resolve those choices, not to
silently replace a flagship with a cheaper model.

Explicit user membership takes precedence over the default panel. Honour any
explicit non-scoring role, but do not add one by default. Keep personal lineups
in local policy rather than this helper.

If a required member, provider or reasoning setting is unavailable, report the
blocker and stop before launching a substitute panel. Do not silently substitute
members or downgrade effort. If independent delegation is unavailable, say so.
Sequential self-review is not a council.

## 3. Start an independent round

Launch the resolved panel in parallel through the active harness. Keep all
delegates read-only. Give each the same request, objective, scope, revision,
relevant files, constraints and check results. Do not share another delegate's
response before the independent reviews finish.

For code review, reuse Interrogate's [reviewer prompt](../interrogate/references/reviewer-prompt.md),
[rubric](../interrogate/references/rubric.md) and
[code-quality lens](../interrogate/references/code-quality-review.md).
Add these required outputs even when there are no findings:

- A score out of 10, or an explicit refusal to score.
- Whether this revision satisfies the stated objective.
- Any blocking objections, with evidence and the smallest relevant remedy.

For ideas or non-code feedback, use the shared brief without forcing a code rubric
or numerical score. Record the actual model, provider and effort used by each
delegate. A failed or partial response is not approval.

## 4. Judge findings and fix within scope

Collect the responses and use Interrogate's
[lead judgment](../interrogate/references/lead-judgment.md) to classify each
finding as Act on, Consider, Noted or Dismissed. Keep evidence, disagreements and
the reason for each disposition. Agreement or a high score does not replace
verification. Do not implement every suggestion to improve a score.

Apply accepted fixes only when authorised. Run the affected checks before
another review. Keep unrelated improvements out of scope. If the request is
read-only, return the findings and recommended fixes without changing files.

## 5. Request fresh reviews and record rounds

After fixes, use fresh delegates for a new round. Give every member the same
updated revision, complete brief, check results and prior finding dispositions.
Do not patch one reviewer's old score or reuse an earlier approval for new code.

Keep a round record with the revision or content identity, shared brief, check
results, each delegate's actual model and provider, score, findings, disposition
and completion status. Preserve earlier rounds when adding a new one.

Count each full panel review pass as one round. Record incomplete attempts
separately. For a completed code review without a score, write `no score`.
Never invent a score. A missing reviewer has not reviewed the work.

Continue while authorised fixes make progress. Finish successfully only when all
required reviewers accept the current revision and relevant checks pass. A
non-scoring optional reviewer does not change that gate. If a fresh round repeats
an unresolved objection without new actionable evidence, or the agreed budget
runs out, stop and report the disagreement or limit. Do not claim consensus or
expand the scope to obtain approval. This verdict does not authorise a merge.

## 6. Report the result

Summarise useful findings, disagreements, accepted changes, remaining blockers
and recommended next steps. Name the reviewed revision and verification gaps.
For code reviews, include a `Council review` section with the number of completed
rounds and a table of actual delegates and their scores for each round. Mark
non-scoring roles explicitly and report incomplete attempts separately.

When PR-description edits are authorised, update that section in the open PR
description. Preserve unrelated content and place it before an existing model
and harness footer. If there is no footer, append the section without inventing
one. Do not post a PR comment for these results. If no PR exists or publication
is not authorised, put the results in the final reply only, using the active
harness's presentation conventions. Do not create a PR just to record a council.
