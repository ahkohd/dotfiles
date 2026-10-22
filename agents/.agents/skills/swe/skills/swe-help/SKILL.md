---
name: swe-help
description: Explain SWE setup, route tasks to bundled helpers and playbooks, and troubleshoot a run without starting the work.
disable-model-invocation: true
---

# SWE help

Answer the question without starting implementation. Read the file you route to
before quoting it. A request for help is not a request to run an expensive workflow.
Lead with the answer, one relevant example, and the local reference.

## Setup and scope

Only /swe and /swe-maintain are installed commands. All other slash names in
inherited examples are shorthand for bundled helpers, read by path through SWE.
Use `/swe use <helper> to <task>`, not an unregistered command.

Read [the workflow](../swe/SKILL.md) for local rules. the active harness operates delegates;
model-selection owns models, cost, effort and escalation. No model-settings file
or plugin installer is needed. If the task is unclear, ask whether the user needs
setup, task routing, troubleshooting or customization. Do not ask again when
context already answers that question.

Check the state that changes the answer:

- Missing project verification skill: offer create-verification-skill, which
  proves the app-driving procedure before handing it off.
- Races or invariants beyond tests: offer create-formal-verification-skill.
- Formal verification behind the code's recorded sync revision: use
  maintain-formal-verification-skill before trusting it.
- Cost concerns: reduce unnecessary fan-out and choose models through the shared
  policy. Keep independent review independent; do not replace it with personas.

See [setup](../../docs/guide/01-setup.md) and
[prompting](references/prompting.md). Start each task with its goal and a checkable
finish condition. SWE selects a playbook and records its steps and any skips.

## Complete helper index

[Catalog](references/catalog.md) lists every bundled helper, including principles.
Read a helper before recommending it. The catalog is an index, not a request to
load everything into context.

Important distinctions:

- how explains current behavior; why investigates reasons; teach explains either plainly.
- architect grounds the design, produces competing shapes through arena and
  implements unless asked for a checkpoint.
- arena compares attempts at one brief, selects a base and grafts improvements;
  swarm partitions coverage or runs a declared race.
- interrogate reviews the diff; blast-radius investigates effects outside it.
- recall reconstructs recent project context; ketchup summarizes this chat;
  session-pickup resumes one specific trail.
- figure-it-out designs one bespoke run; autonomous-run drives one predicate;
  orchestrate coordinates a program outliving a single agent.
- tdd adds failing-test-first discipline; benchmark-checklist validates numbers.
- statechart reads formal verification results; the formal verification helpers
  create and maintain the model-to-code correspondence.
- in-your-own-words checks intent; sharpen improves a prompt without executing it.
- typescript-best-practices covers TypeScript; no-comments reviews comments;
  technical-writing and unslop address writing; bro simplifies the last reply.
- show-me-your-work records decisions; ketchup-video makes a visual catch-up;
  correct, reflect and automate-me capture different kinds of learning.

## Playbooks and principles

See the complete playbook list in [SWE](../swe/SKILL.md). A status question uses
babysit check mode; driving readiness, answering comments and shipping are
separate requests. Planning produces a plan, not permission to execute it.
Principles are read in full when applied, not merely cited by title.

## Troubleshooting

- Workflow no longer applied: start the new task with /swe and state its scope.
- A question treated as implementation: say it is a new read-only question.
- Unavailable model: confirm the active harness availability and follow model-selection.
- Helpers missing from command completion: they are bundled, not standalone commands.
- Parallel writers collide: isolate workspaces and assign one owner per shared state.
- Overnight work never finishes: supply a testable predicate, not just a duration.
- Success claimed from compilation: demand evidence from the real user-facing surface.
- Repeated mistakes: correct or reflect can propose structural fixes; approve skill
  edits before applying them. Do not modify installer-owned copies.

## Customize

Use automate-me to draft personal conventions from scoped history; reflect to
propose lessons from a completed task; the authoring and eval playbooks to build
and test changes. Upstream maintenance uses /swe-maintain and requires approval.

See [recipes](references/recipes.md), [pitfalls](../../docs/guide/10-recipes-and-pitfalls.md)
and [customization](../../docs/guide/09-make-it-yours.md).
