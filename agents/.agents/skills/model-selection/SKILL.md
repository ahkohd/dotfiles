---
name: model-selection
description: Choose a model and coding harness using the user's cost, intelligence, and taste rankings. Use when selecting or escalating a model for implementation, review, or user-facing work.
---

# Select models and harnesses

Use the current model rankings below. Higher scores are better on every axis. Cost reflects what the user actually pays, not list price. Intelligence is how hard a problem the model can handle unsupervised. Taste covers UI, UX, code quality, API design, and copy.

| model | cost | intelligence | taste |
|---|---:|---:|---:|
| moonstead/default | 10 | 4 | 4 |
| gpt-6-luna | 9 | 5 | 5 |
| gpt-6.1-sol | 7 | 7 | 6 |
| gpt-6-astra | 2 | 8 | 7 |
| opus-5.5 | 5 | 9 | 8 |
| fable-5.1 | 1 | 8 | 9 |

## Choose for the task

- You plan and orchestrate. Use the table to pick subagent models.
- These are defaults, not limits. If a cheaper model misses the bar, redo or rerun the work with a smarter model without asking. Judge the result, not the price tag.
- Cost breaks ties. For work that ships, weigh intelligence before taste, then cost.
- Delegate token-heavy work to moonstead/default or gpt-6-luna, such as broad searches and summaries.
- Use a model with taste >= 7 for user-facing UI, copy, API design, or UX.
- Prefer fable-5.1 for reviews of plans and implementations. Add gpt-6-astra when another independent perspective would help.
- Use medium thinking for fable-5.1 and gpt-6-astra; raise it to xhigh when the task needs more reasoning. Use xhigh for the other models.

## Select the harness

Use BB for all agentic work. Use its model controls and check that the model is available before choosing its identifier. Model aliases can change.

- moonstead/default is only on BB's Pi provider.
