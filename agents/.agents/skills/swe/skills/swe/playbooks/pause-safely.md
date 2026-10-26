### Pause safely

**You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause.

1. Stop at a safe boundary. Finish the current atomic step or back out of it. Start nothing new, and cancel any nested subagents.
2. Take no irreversible action to pause. No PR and no push unless you already had one out.
3. Make the work durable within the user's VCS policy. Commit only when authorized; otherwise preserve the uncommitted work in the existing workspace and save a recoverable patch and required untracked files in the approved durable store. Record broken state explicitly. Never release a worker before copying and verifying work that exists only there.
4. Publish a checkpoint through [Resume storage](../references/resume-storage.md). Capture intent, progress, verified results, current state, next steps, key files and gotchas. Link the existing show-me-your-work trail rather than duplicating it. Use the shared project locator or an explicitly recorded durable store, never a temporary resume file.
5. Preserve every artifact requested for use after resume, including questions and acceptance checklists. Keep exact wording, order and completeness when requested. Publish with `resume.mjs`, then read using only the project and store locator in a separate command. Open and check the note and all requested artifacts before declaring the checkpoint ready. Missing or changed content is a blocker, not a successful pause.

**Reply:** where you are in the loop, what's on disk versus still in your head (paths, no diff dumps), the commits you made and whether the tree is clean, and the first action on resume. This is a pause, not a final report.
