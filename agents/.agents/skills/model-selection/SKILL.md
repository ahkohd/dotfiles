---
name: model-selection
description: Choose a model and coding harness using the user's cost, intelligence, and taste rankings. Use when selecting or escalating a model for implementation, review, or user-facing work.
---

# Select models and harnesses

Use the current model rankings below. Higher scores are better on every axis. Cost reflects what the user actually pays, not list price. Intelligence is how hard a problem the model can handle unsupervised. Taste covers UI, UX, code quality, API design, and copy.

| model | cost | intelligence | taste |
|---|---:|---:|---:|
| gpt-6-luna | 9 | 5 | 5 |
| gpt-6-sol | 7 | 7 | 6 |
| gpt-6-astra | 2 | 8 | 7 |
| opus-5.5 | 5 | 9 | 8 |
| fable-5.1 | 2 | 8 | 9 |

## Choose for the task

- These are defaults, not limits. If a cheaper model misses the bar, redo or rerun the work with a smarter model without asking. Judge the result, not the price tag.
- Cost breaks ties. For work that ships, weigh intelligence before taste, then cost.
- Use a model with taste >= 7 for user-facing UI, copy, API design, or UX.
- Prefer fable-5.1 for reviews of plans and implementations. Add gpt-6-astra when another independent perspective would help.
- Use medium thinking for fable-5.1 and gpt-6-astra; raise it to xhigh when the task needs more reasoning. Use xhigh for the other models.
- Do not use Haiku.

## Select the harness

Use the current harness's native model controls and check that the requested model is available before choosing its identifier. Model aliases can change.

- In BB, use its model controls for requested workflows or agents.
- In Pi, gpt-* models use the OpenAI Codex provider and the user-level configuration in ~/.pi/agent/settings.json. Use /model in a running Pi session. Avoid custom shell wrappers.
- For Anthropic models, prefer Claude CLI unless the user asks for Pi or API access.
- For Cursor Agent CLI, run agent --list-models before choosing an identifier.
- For Codex CLI, use codex --model <model> when the model is supported.
