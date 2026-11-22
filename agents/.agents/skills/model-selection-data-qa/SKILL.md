---
name: model-selection-data-qa
description: Choose the model, reasoning level and provider for a data QA role (QA lead, QA worker, decision model, reviewer), and decide when a verdict is trusted, escalated or sent to the owner. Use before spawning a QA thread or starting a judge run, or when QA workers keep disagreeing.
---

# Select models for data QA

| role | model | run with |
|---|---|---|
| QA lead | Opus 5.5 | `--provider claude-code --model claude-opus-5-5 --reasoning-level medium` |
| QA worker | Gemini 4 Neon | `--provider acp-antigravity --model gemini-4-neon --reasoning-level medium` |
| Decision model | d3-ultra | self-hosted |
| Decision model, fallback | Jev | TypeSafe API |
| Reviewer of rules and laws | Fable 5.2 | `--provider claude-code --model claude-fable-5-2 --reasoning-level high` |
| Reviewer, second opinion | Gemini 4 Carbon | `--provider acp-antigravity --model gemini-4-carbon --reasoning-level high` |

- The owner decides. Models propose labels, fixes and rules; only the owner rules, and only the owner says a dataset is done.
- Volume goes to the workers and the decision model. The lead decides hard items and checks the workers. Reviewers see rules, laws and run cards, never bulk labels.
- Use no other model for data QA unless the owner asks. Spawn a model only on a machine where `bb provider models <provider> --machine <machine>` lists it.

## Lead

The lead picks the items, briefs the workers, reads every verdict and accepts, fixes or escalates each one. It does not label in bulk. It reviews every worker flag that changes a label and samples the "ok" verdicts.

Run the lead at medium. Raise it to high for one disputed item, then go back.

## Workers

One unit of data per worker (a page, a screen, a file), every item in it, and anything missing from it. Each verdict carries sure or not sure.

- QA the newest version of a dataset. Skip items already judged in an earlier version, by stable id, and let carry-forward close what the new version fixed.
- Tell workers which faults the current version already fixes, so they do not flag them again.
- Order the work by risk, for example by a trained model's disagreement with the labels.
- Raise concurrency only where the tooling can be tested at that scale.

## Decision model

A decision model answers one closed question about one item with a probability. It checks every item, as an enforcement layer beside the laws. It does not label.

- Calibrate each question on labelled cards before you trust it: accuracy and coverage at the confidence threshold, and wins on confident disagreements against the other model. Use the model that wins each question; record the rest, do not count it.
- Do not trust a question alone when it is under 0.95 when confident, or has fewer than 30 confident cards.
- A self-hosted decision model never shares a GPU with training.
- Run a fixed canary set at start and after every pause or move.
- Cache judgements on item id, input hash, question hash and model revision.
- A flag rate is not an error rate. When confident judge error is close to the label error you seek, estimate label error from blind review of seeded samples.
- On synthetic data the labels are exact by construction, so flags there are judge errors or generator faults. Log generator faults by class for the next build.

## When a verdict is trusted

- Worker sure, decision model agrees when confident: the lead may accept it automatically.
- Worker sure, decision model disagrees or is not confident: the lead decides.
- Worker or lead not sure: it goes to the owner's inbox. Agents never wait on the owner; they carry on with other items.

Each inbox item explains itself: the item, a crop or excerpt before and after, the rule it rests on, and buttons named by their effect. The owner's answers become precedents that workers read.

## Rules and laws

A question no rule answers is not a QA verdict. The lead writes it up, Fable gives an opinion, Carbon gives a second when Fable is unsure or the change is large, and the owner rules. Laws come before any bulk relabel.

## Escalate

1. A worker fails a unit twice: the lead does it.
2. Worker and lead disagree on the same item twice: the owner's inbox.
3. Workers keep flagging one class: check whether a newer version fixed it, then whether a rule is missing.
4. Decision model and workers disagree on a whole class: recalibrate that question before trusting either.

Report any escalation and why.

Evidence for these choices: references/evidence.md.
