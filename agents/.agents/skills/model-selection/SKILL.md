---
name: model-selection
description: Choose the model, reasoning level and BB provider for a role (lead, worker, reviewer), and decide when to delegate, review or escalate. Use before spawning a thread or subagent, or when a worker keeps failing.
---

# Select models

| role | model | spawn with |
|---|---|---|
| Lead | Opus 5.5 or Fable 5.2 | The owner starts it |
| Worker | Gemini 4 Neon | `--provider acp-antigravity --model gemini-4-neon --reasoning-level high` |
| Worker, fallback | Sol 6.1 | `--provider codex --model gpt-6.1-sol --reasoning-level high --service-tier fast` |
| Bulk worker | Grok 4.7 | `--provider acp-cursor --model grok-4.7 --reasoning-level high --permission-mode full` |
| QA | Opus 5.5 | `--provider claude-code --model claude-opus-5-5 --reasoning-level high` |
| Reviewer | Fable 5.2 | `--provider claude-code --model claude-fable-5-2 --reasoning-level medium` |
| Reviewer, second proposal | Gemini 4 Carbon | `--provider acp-antigravity --model gemini-4-carbon --reasoning-level high` |
| Reviewer, third proposal | Astra 6.2 | `--provider codex --model gpt-6.2-astra --reasoning-level high` |

- Quota, scarcest first: Fable, Opus, Astra, Sol, Gemini, Grok. Volume goes to Neon, Grok and Sol.
- Use no other model. Never spawn Opus or Fable to build, Fable above medium, or any model at max, unless the owner asks.
- Spawn a model only on a machine where `bb provider models <provider> --machine <machine>` lists it; it reaches boxes through bb-box tools. If no machine lists it, tell the owner; do not substitute.

## Lead

Opus is strongest when the work can be checked: a test, a benchmark, a spec. Fable is strongest when it cannot: experiments, unclear direction, new design.

You lead the thread you are in. Do not respawn it on the other model.

- Opus lead with no check for the next step: ask Fable for the direction, then carry on.
- Fable lead: set the direction, then brief out each piece as soon as it has a check.

## Delegate

Do it yourself if the brief would take longer than the change, or it is under about 50 lines in files you have read. Otherwise delegate, with a check the worker can run and the design already decided.

Give the bulk worker well-defined tasks with nothing left to decide.

## QA

Spawn Opus for agentic end-to-end testing on a bb-box box of the target OS (see the `bb-box` skill).

## Review

The lead reads every worker diff and runs its check. Add reviewers when a change touches a public API, stored data, auth, concurrency or a migration, is over about 300 lines, or is disputed.

Spawn all reviewers fresh, whoever wrote the work or leads the thread. Give them the change, not the thread's history.

## Escalate

1. Grok fails twice: give it to Neon. Neon fails twice: the lead does it.
2. Opus lead stuck on a checkable task: spawn Opus at xhigh on that task alone.
3. Still stuck, or a review is disputed: raise Astra to xhigh on that question.

Report any escalation and why.
