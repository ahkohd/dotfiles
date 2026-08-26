# Guidelines

## Companion attention

Use the `companion-attention` skill at `/Users/var/.codex/skills/companion-attention/SKILL.md` to send a useful completion notification or request a decision on the companion display. The `companion` CLI is installed locally. Give requests a unique agent/session owner, clear obsolete requests, and only treat an explicit matching response as a decision. Do not notify repeatedly about unchanged progress.

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

Rankings, higher = better. Cost reflects what I actually pay, not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model    | cost | intelligence | taste |
|---       |---   |---           |---    |
| gpt-5.6-sol | 9    | 6            | 5     |
| gpt-6-astra | 3    | 8            | 7     |
| fable-5.1  | 2    | 9            | 9     |

How to apply:
- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output does not meet the bar, rerun or redo the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations): gpt-5.6-sol.
- When using gpt-5.6-sol & gpt-6-astra, set Pi thinking level to xhigh.
- When using fable-5.1, set Claude CLI thinking level to medium.
- Anything user-facing (UI, copy, API design) needs taste >= 7.
- Reviews of plans/implementations: fable-5.1, optionally gpt-6-astra as an extra independent perspective.
- Mechanics: gpt-* is handled natively by Pi through the OpenAI Codex provider, automatically adopting user-level Pi configuration from `~/.pi/agent/settings.json`. Avoid custom bash wrappers. Use Pi model selection and herdr skills:
  - `/model` - Change the current session model.
  - `/skill:model-selection` - Choose model, provider and harness.
  - `/skill:herdr-subagents` - Spawn async subagents in background herdr workspaces. Defaults to Pi.
  - `/skill:herdr-messaging` - Message or reply to existing agents.
  - `/skill:herdr-handoff` - Create a fresh human-facing herdr session when context needs to transfer.
- For Anthropic models (sonnet-5, opus-5, fable-5.1), prefer Claude CLI.

Subagents:
- Use `herdr-subagents` by default for async grunt work, review, search, testing and investigations.
- For closed-loop quality assurance, spawn a fresh reviewer with `herdr-subagents` before finalizing.
