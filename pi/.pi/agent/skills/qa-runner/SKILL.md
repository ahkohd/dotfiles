---
name: qa-runner
description: Spawn a read-only QA agent in the background. Use when asked to run QA, run gates, or QA test something.
---

# QA Runner

Spawns a background QA agent using the task-runner skill with read-only constraints.

**Prerequisite**: Read `~/.pi/agent/skills/task-runner/SKILL.md` first if you haven't already.

## Spawn

```bash
~/.pi/agent/skills/task-runner/spawn.sh <model> <cwd> <task> \
  --tools read,bash \
  --system-prompt ~/.pi/agent/skills/qa-runner/system-prompt.md
```

The QA agent:
- Has only `read` and `bash` tools — cannot edit repo files
- Writes reports to temp files (e.g. `/tmp/qa-report-*.md`)
- Auto-exits via `done.sh` when complete

## After completion

Find and read the temp report file. Review findings for correctness before reporting.

## Management

Use task-runner commands for status, kill, cleanup:
- `~/.pi/agent/skills/task-runner/status.sh [job-id]`
- `~/.pi/agent/skills/task-runner/kill.sh <job-id>`
- `~/.pi/agent/skills/task-runner/cleanup.sh`
