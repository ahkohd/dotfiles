---
name: model-selection
description: Choose the right model, provider and coding harness. Use before selecting models, spawning subagents, delegating reviews, choosing Pi, Claude CLI, Cursor Agent CLI or Codex CLI, or deciding whether to escalate work to a smarter model.
---

# Select models and harnesses

Use this skill before choosing a model or spawning a subagent.

## Model rankings

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
- Mechanics: gpt-5.5 is handled natively by Pi through the OpenAI Codex provider, automatically adopting user-level Pi configuration from `~/.pi/agent/settings.json`. Avoid custom bash wrappers. Use Pi model selection and herdr skills:
  - `/model` - Change the current session model.
  - `/skill:herdr-subagents` - Spawn async subagents in background herdr workspaces. Defaults to Pi.
  - `/skill:herdr-messaging` - Message or reply to existing agents.
  - `/skill:herdr-handoff` - Create a fresh human-facing herdr session when context needs to transfer.
- For Anthropic models (sonnet-5, opus-4.8, fable-5), prefer Claude CLI. Use Pi with `--provider anthropic --model <claude-model>` only when you need Pi tooling or the user asks for Pi or API access.

Using gpt-5.5 inside workflows and subagents:
- Use `herdr-subagents` by default for async grunt work, review, search, testing and investigations.
- For Pi subagents using gpt-5.5, use `pi --provider openai-codex --model gpt-5.5 --thinking xhigh`.
- For closed-loop quality assurance, spawn a fresh reviewer with `herdr-subagents` before finalizing.

## Task defaults

Use the simplest model that should clear the bar:

| task | default model | reason |
|---|---|---|
| clear-spec implementation, migrations, bulk analysis | gpt-5.5 | cheap enough to use freely and strong enough for mechanical work |
| review of code, plans or implementation | fable-5 or opus-4.8 | strong reasoning and taste |
| user-facing UI, copy, API design or UX | fable-5, opus-4.8 or sonnet-5 | taste must be at least 7 |
| rescue work or ambiguous debugging | fable-5 first, then opus-4.8 if needed | intelligence matters more than cost |
| extra independent review | gpt-5.5 | good cheap second opinion |

## Harness model flags

For Anthropic models, prefer Claude CLI unless the user specifically asks to use Pi or API access. Use Pi with `--provider anthropic` only when you need Pi tooling or the user asks for it.

Use stable flags instead of looking them up again. For Cursor Agent CLI, do not hardcode ids: run `agent --list-models`, then pick the closest listed model for the intended tier.

| harness | model family | command |
|---|---|---|
| Pi | gpt-5.5 | `pi --provider openai-codex --model gpt-5.5 --thinking xhigh` |
| Pi | fable-5 | `pi --provider anthropic --model claude-fable-5` |
| Pi | opus-4.8 | `pi --provider anthropic --model claude-opus-4-8` |
| Pi | sonnet-5 | `pi --provider anthropic --model claude-sonnet-5` |
| Claude CLI | fable-5 | `claude --model fable` or `claude --model claude-fable-5` |
| Claude CLI | opus-4.8 | `claude --model opus` or `claude --model claude-opus-4-8` |
| Claude CLI | sonnet-5 | `claude --model sonnet` or `claude --model claude-sonnet-5` |
| Cursor Agent CLI | any | `agent --list-models`, then `agent --model <closest-listed-model>` |
| Codex CLI | gpt-5.5 | `codex --model gpt-5.5` or `codex -m gpt-5.5` |

## Harness permission flags for herdr replies

Use these when a subagent must report back through `herdr-messaging` without stopping for permission prompts.

| harness | add these flags |
|---|---|
| Pi | none |
| Claude CLI | `--dangerously-skip-permissions` |
| Cursor Agent CLI | `--yolo --sandbox disabled` |
| Codex CLI | `--ask-for-approval never --sandbox danger-full-access --cd "$PWD"` |

Only use permission bypass or full local command access for trusted tasks.
