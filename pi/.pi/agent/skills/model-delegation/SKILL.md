---
name: model-delegation
description: Pick the right model and delegate work through Pi task-runner, pi-mesh, and handoff. Use when choosing models for workflows, subagents, reviews, rescue work, bulk mechanical work, or model escalation.
---

# Picking the right models for workflows and subagents

Rankings, higher = better. Cost reflects what I actually pay (OpenAI has really generous limits), not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model    | cost | intelligence | taste |
|---       |---   |---           |---    |
| gpt-5.5  | 9    | 8            | 5     |
| sonnet-5 | 5    | 5            | 7     |
| opus-4.8 | 4    | 7            | 8     |
| fable-5  | 2    | 9            | 9     |

How to apply:
- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output does not meet the bar, rerun or redo the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations): gpt-5.5 - it is effectively free.
- When using gpt-5.5, set Pi thinking level to xhigh.
- Anything user-facing (UI, copy, API design) needs taste >= 7.
- Reviews of plans/implementations: fable-5 or opus-4.8, optionally gpt-5.5 as an extra independent perspective.
- Never use Haiku.
- Mechanics: gpt-5.5 is handled natively by Pi through the OpenAI Codex provider, automatically adopting user-level Pi configuration from `~/.pi/agent/settings.json`. Avoid writing new custom bash scripts; instead, use Pi's built-in model selection, skills, and pi-mesh infrastructure:
  - `/model` - Change the current session model.
  - `/skill:task-runner` - Load the background Pi agent workflow.
  - `~/.pi/agent/skills/task-runner/spawn.sh <model> <cwd> <task> --reply-to <current-agent>` - Spawn a local or remote Pi subagent through zmx and pi-mesh.
  - `mesh_on`, `agent_list`, `agent_request`, `agent_send` - Register this session, find agents, and send or request replies over pi-mesh.
  - `/skill:handoff` - Move work into another Pi session when context needs to transfer.
- Claude models (sonnet-5, opus-4.8, fable-5) run via Pi's `/model` selector in the main session or the `task-runner` `<model>` argument for subagents and workflows.

Using gpt-5.5 inside workflows and subagents:
- Subagents and automated workflows should call Pi's native skills and pi-mesh tools to delegate tasks directly, omitting the need for raw terminal wrappers.
- For closed-loop quality assurance, keep a Pi review gate in the workflow: use `task-runner` to ask a fresh reviewer before finalizing. This ensures another model challenges outputs before finalizing, preventing broken code or weak design assumptions from reaching the main session unvetted.
