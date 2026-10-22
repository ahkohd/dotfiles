# Runtime contract

SWE describes roles and evidence, not a provider's tool schema. This contract
applies to every helper, guide and playbook in the bundle.

## Resolve the environment

- Follow the current project and user instructions for harness, VCS, signing,
  safety and publication policy. A skill never grants additional permissions.
- Read the available model-selection skill before choosing models or effort.
  In the shared layout it is `~/.agents/skills/model-selection/SKILL.md`.
  Keep rankings there, not in SWE. Confirm actual model availability.
- Use the active harness's documented delegation and environment mechanisms,
  consistent with local policy. Inspect its help or skill rather than guessing
  tool names, parameters, model IDs, cloud placement or permission effects.
- Give each delegate a complete brief, this workflow's absolute path and an
  instruction to read it. Include dependencies and standing orders. Separate
  writers by workspace or output path and confirm the intended base revision.
- Independent review requires another agent, preferably a different model.
  Sequential personas in one conversation are self-review. Disclose unavailable
  independence rather than silently simulating it.
- Use real status and artifacts for liveness. Stop a writer or revoke its ownership
  before replacing it. Preserve local state before cleanup or reassignment.
- Resolve a durable store through the active environment. If none is supplied,
  choose an approved local directory and record its absolute path. Do not assume
  remote workers can read it; relay briefs and evidence through supported channels.

## QA and tool selection

For user-facing or cross-component changes, real end-to-end verification is the
acceptance gate. Unit tests do not replace this gate; they guard focused contracts
and regressions. Keep performance checks and formal verification where the risk
calls for them. A passing model or mock is not proof that the integrated app works.

Select available tools by capability: provision the target environment, drive the
real interface, observe resulting state and capture evidence. Read their current
documentation. Native tool calls can supply these capabilities; no named tool or
separate control skill is mandatory. Follow the project's verification recipe
when one exists, adapting its driver to the actual environment without weakening
its assertions.

For reusable QA, use [create-verification-skill](../../create-verification-skill/SKILL.md)
to build a project-local launch, health-check, drive, evidence and cleanup recipe.
Use [maintain-verification-skill](../../maintain-verification-skill/SKILL.md) to keep
its feature map honest, and [swarm](../../swarm/SKILL.md) for independent coverage.
Cover the changed journey and relevant failure modes: retries, interruptions,
restarts, persistence and concurrency, not just the happy path. Record the exact
revision, environment, actions, expected and observed results, and artifact paths.
Check observable side effects as well as the visible result. Use scoped test data
and preserve evidence before releasing environments. Missing access or an unrun
scenario is a coverage gap, never a pass.

## Evidence and follow-ups

Read only the current project's relevant thread history through the documented
history API, an explicit transcript path or a user-supplied export. Never guess
another harness's transcript layout or sweep unrelated projects. When full tool
history is unavailable, say which claims cannot be checked.

Use the available surface-driving tools and project verification procedures.
Missing runtime access is a verification gap, not a pass. Keep independent model
review separate from tests and live execution.

Use a supported wake or job mechanism for concrete pending work. Record the exit
predicate, scope and resume context. Maintain one owner for each watcher; avoid
duplicate polling and clear scheduled work at completion or cancellation. If the
harness cannot wake later, report that limitation instead of promising monitoring.

## Authorization and local conventions

Implementation does not imply permission to commit, push, open PRs, merge, deploy
or delete data. Instructions to do those things in a playbook apply only within
the user's explicit grant. Preserve unrelated working changes; never reset a
workspace to make delegation easier. Out-of-scope findings become follow-ups,
not automatic extra changes. Broad autonomy still respects named human gates.

Use the repository's VCS conventions. Git examples in the inherited workflows
express history operations; use the configured VCS equivalent where appropriate.
The bundled Git worktree auditor and GitHub watcher are explicit tool adapters,
not requirements to change the project's VCS or the user's agent harness.

Follow local writing preferences when they conflict with inherited editorial
rules. Keep the substantive checks and evidence requirements regardless of style.

## Skill discovery

Only SWE and its maintenance entry are exposed. Helpers are loaded by path from
[the catalog](../../swe-help/references/catalog.md). Slash names in inherited
examples denote helper requests through SWE, not separately installed commands.
Generated project skills must name a resolvable helper file, not a hidden slash
command. Resolve shared and project skill locations from the local setup.
