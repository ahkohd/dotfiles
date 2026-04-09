# Guidelines

## Tool Use

- **Use `gh` CLI** for GitHub operations: viewing PRs, fetching diffs, checking issues, browsing repo contents, API calls.

## VCS

- **Use `jj`** for version control. Prefer `jj` over `git` where possible.
- **Disable GPG signing** when running jj write commands. Always pass `--config 'signing.behavior="drop"'` to commands like `jj commit`, `jj describe`, `jj new`, `jj bookmark`, etc.
- **Disable GPG signing** for git commits. Always pass `-c commit.gpgsign=false` to git write commands. E.g. `git -c commit.gpgsign=false commit -m "message"`.

## Writing Style

- Never use `+` or `&` as conjunctions in prose, commit messages, or comments. Write "and" instead. E.g. "add debug and tracking", not "add debug + tracking".
- Stick to plain ASCII in text. No unicode symbols that aren't on a standard keyboard. E.g. write "to" not "→", write "-" not "•", write ">=" not "≥".
- Be concise. Humans skim — cut filler, keep it short. This includes code comments, documentation, commit messages, PR descriptions, and chat responses.
