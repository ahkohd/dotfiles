---
name: model-selection
description: Choose a model and coding harness using the user's cost, intelligence, and taste rankings. Use when selecting or escalating a model for implementation, review, or user-facing work.
---

# Select models and harnesses

Use the current model rankings below. Higher scores are better on every axis. Cost reflects what the user actually pays, not list price. Intelligence is how hard a problem the model can handle unsupervised. Taste covers UI, UX, code quality, API design, and copy.

| model | cost | intelligence | taste | reasoning |
|---|---:|---:|---:|---|
| opus-5.5 | 5 | 9 | 9 | xhigh |
| fable-5.1 | 1 | 8 | 9 | medium |
| gpt-6-astra | 1 | 8 | 7 | medium |
| grok-4.7 | 8 | 7 | 6 | xhigh |
| gpt-6.1-sol | 7 | 7 | 6 | xhigh |

## Role defaults

| role | model and responsibility |
|---|---|
| Lead, planning and integration | Opus directs the work and owns integration and final judgment. |
| Implementation, fixes and refactoring | Grok is the default worker. Sol is the slower alternative worker. |
| Performance | Opus directs the investigation, chooses experiments and judges results. Grok implements changes and runs benchmarks. |
| Swarm workers | Grok by default, with Sol as an alternative. |
| Exploration and investigation | Opus directs and interprets findings. Grok gathers evidence. |
| Judgment, prose and explanations | Opus. |
| UI, UX and API design | Opus leads the design. Grok implements it. |
| Architecture and arena candidates | Opus and Grok produce independent proposals. |
| Plan, code and architecture reviews | Fable and Astra are independent reviewers. Use both for substantial or contested changes. |
| Hardest tasks or repeated worker failures | Escalate to Opus. |

- Role names use the model identifiers and settings above.
- These defaults do not require delegation for every small task.
- Raise review reasoning to xhigh when deeper analysis is needed.

## Select the harness

Use BB for all agentic work. Use its model controls and check that the model is available before choosing its identifier. Model aliases can change.
