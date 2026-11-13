---
name: model-selection
description: Choose the model, reasoning level and BB provider for a role (lead, worker, reviewer), and decide when to delegate, review or escalate. Use before spawning a thread or subagent, or when a worker keeps failing.
---

# Select models

| role | model | spawn with |
|---|---|---|
| Lead | Opus 5.5 or Fable 5.2 | The owner starts it |
| Worker | Astra | `--provider codex --model gpt-6-astra --reasoning-level medium` |
| Bulk worker | Grok 4.7 | `--provider acp-cursor --model grok-4.7 --reasoning-level xhigh --permission-mode full` |
| QA | Opus 5.5 | `--provider claude-code --model claude-opus-5-5 --reasoning-level high` |
| Reviewer | Fable 5.2 | `--provider claude-code --model claude-fable-5-2 --reasoning-level medium` |
| Reviewer, second proposal | Astra | `--provider codex --model gpt-6-astra --reasoning-level high` |

- Quota, scarcest first: Fable, Opus, Astra, Grok. Volume goes to Astra and Grok.
- Use no other model. Never spawn Opus or Fable to build, Fable above medium, or any model at max, unless the owner asks.
- Check identifiers with `bb provider models <provider> --machine <machine>`. If a model is missing, tell the owner; do not substitute.

## Lead

Opus is strongest when the work can be checked: a test, a benchmark, a spec. Fable is strongest when it cannot: experiments, unclear direction, new design.

You lead the thread you are in. Do not respawn it on the other model.

- Opus lead with no check for the next step: ask Fable for the direction, then carry on.
- Fable lead: set the direction, then brief out each piece as soon as it has a check.

## Delegate

Do it yourself if the brief would take longer than the change, or it is under about 50 lines in files you have read. Otherwise delegate, with a check the worker can run and the design already decided.

## QA

Spawn Opus for agentic end-to-end testing on a bb-box box of the target OS (see the `bb-box` skill).

## Review

The lead reads every worker diff and runs its check. Add reviewers when a change touches a public API, stored data, auth, concurrency or a migration, is over about 300 lines, or is disputed. No model reviews its own work:

| who wrote it | Opus leads | Fable leads |
|---|---|---|
| Astra | Fable | The lead |
| Grok or the lead | Fable and Astra | Astra |

## Escalate

1. Grok fails twice: give it to Astra. Astra fails twice: the lead does it.
2. Opus lead stuck on a checkable task: spawn Opus at xhigh on that task alone.
3. Still stuck, or a review is disputed: raise Astra to xhigh on that question.

Report any escalation and why.
