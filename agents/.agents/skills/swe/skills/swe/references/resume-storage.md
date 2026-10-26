# Resume storage

Pause and pickup share a validated checkpoint locator, not a guessed transcript or temporary file. Run the installed `scripts/resume.mjs` by its absolute path. For a Git project the default store is `swe/resume` under its Git common directory, shared across its worktrees and excluded from commits. For another VCS or a disposable checkout, supply an approved durable `--store <absolute-directory>` on every invocation. Record that locator in the task's persistent environment metadata so a new session can find it without this conversation. If no durable locator is available, report that blocker rather than claiming a resumable checkpoint.

A repository-local store survives a process restart, not deletion or loss of the host. Move the complete checkpoint to the active environment's durable storage before releasing a worker. Verify the transferred files and preserve their locator. The tool binds checkpoints to the current project identity; after moving to a new project path, validate the source files and publish a new checkpoint rather than editing the pointer by hand.

## Publish

1. Run `node <scripts>/resume.mjs begin --project <directory>` with `--store` when required. Write `resume.md` inside the returned unique directory. Record intent, verified progress, current work, next steps, limitations and ownership.
2. Preserve every artifact the user requested for use after resume, including questions, checklists and procedures. Check exact wording, order and completeness when requested. Prefer files in the returned directory when a worktree may disappear. Link every artifact from the note.
3. Run `node <scripts>/resume.mjs publish --project <directory> --note <resume.md> --artifact <file> ...`, with the same store. Every local inline Markdown link must be registered as an artifact. Use bare or angle-bracket destinations, no link titles, and percent-encode literal percent signs. Reference-style links are not validated. Links in code spans and fences are ignored. Files must be in the store or current project. Publication checks hashes, locations and links before atomically replacing `latest.json`.
4. Start a separate command with only the project and, when needed, the durable store locator: `node <scripts>/resume.mjs read --project <directory>`. Open the returned note and artifacts and check the requested content before declaring the checkpoint ready. Ten requested questions means all ten are reachable and complete, not merely that a file exists.

Create a new directory for each checkpoint and do not edit published files. Unique directories separate writers. The last complete publication replaces the shared latest pointer; keep explicit checkpoint paths for parallel tasks. This is not a scheduler or ownership lock. Publishing never commits, pushes, or pauses an ongoing task.

## Resume

Read the checkpoint before searching history. Exit 0 and `kind: checkpoint` means the note and artifacts passed integrity and link checks. Exit 2 and `kind: missing` permits the normal transcript or branch fallback. Exit 1 and `kind: unavailable` means the checkpoint is incomplete, changed or unreadable; report and diagnose the gap instead of silently falling back. Existing project artifacts are checked again, so changed content is not mistaken for the saved material.
