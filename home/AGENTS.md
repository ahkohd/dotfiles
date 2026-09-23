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
- Stick to plain ASCII in text. Use words or ASCII equivalents instead of Unicode arrows, bullets or comparison symbols.
- Be concise. Humans skim: cut filler and keep it short. This includes code comments, documentation, commit messages, PR descriptions and chat responses.
- No emojis. Not in commit messages, comments, or docs.

## Picking the right models for workflows and subagents

Use the model-selection skill at /Users/var/.agents/skills/model-selection/SKILL.md when choosing a model, provider, or harness. Its rankings and thinking guidance are the source of truth.
