# Guidelines

## Tool Use

- **Use `gh` CLI** for GitHub operations: viewing PRs, fetching diffs, checking issues, browsing repo contents, API calls.
- **Use `fd` and `rg`** for filesystem and text search. Prefer `fd` over `find`, and `rg` over `grep`.

## VCS

- **Use `jj`** for version control. Prefer `jj` over `git` where possible.
- **Disable GPG signing** when running jj write commands. Always pass `--config 'signing.behavior="drop"'` to commands like `jj commit`, `jj describe`, `jj new`, `jj bookmark`, etc.
- **Disable GPG signing** for git commits. Always pass `-c commit.gpgsign=false` to git write commands. E.g. `git -c commit.gpgsign=false commit -m "message"`.

## Writing Style

- Never use `+` or `&` as conjunctions in prose, commit messages, or comments. Write "and" instead. E.g. "add debug and tracking", not "add debug + tracking".
- For reports, summaries, guidance, or other prose, use the `govuk-style` skill.
- Stick to plain ASCII in text. No unicode symbols that aren't on a standard keyboard. E.g. write "to" not "→", write "-" not "•", write ">=" not "≥".
- Be concise. Humans skim — cut filler, keep it short. This includes code comments, documentation, commit messages, PR descriptions, and chat responses.
- No emojis. Not in commit messages, comments, or docs.

## Picking the right models for workflows and subagents

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
  - `/skill:model-selection` - Choose model, provider and harness.
  - `/skill:herdr-subagents` - Spawn async subagents in background herdr workspaces. Defaults to Pi.
  - `/skill:herdr-messaging` - Message or reply to existing agents.
  - `/skill:herdr-handoff` - Create a fresh human-facing herdr session when context needs to transfer.
- For Anthropic models (sonnet-5, opus-4.8, fable-5), prefer Claude CLI. Use Pi with `--provider anthropic --model <claude-model>` only when you need Pi tooling or the user asks for Pi or API access.

Using gpt-5.5 inside workflows and subagents:
- Use `herdr-subagents` by default for async grunt work, review, search, testing and investigations.
- For Pi subagents using gpt-5.5, use `pi --provider openai-codex --model gpt-5.5 --thinking xhigh`.
- For closed-loop quality assurance, spawn a fresh reviewer with `herdr-subagents` before finalizing.
