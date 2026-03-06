---
name: task-runner
description: Run a pi agent in the background while you stay available. Use when the user asks to have another model do work, run something in the background, or delegate a task.
---

# Task Runner

Delegate work to a background pi agent. It runs in tmux with full TUI — the user can watch live, and you can check on it anytime. You stay available while it works.

## Spawn

```bash
~/.pi/agent/skills/task-runner/spawn.sh <model> <cwd> <task> [options]
```

Options:
- `--tools <list>` — comma-separated tools (default: read,bash,edit,write)
- `--system-prompt <file>` — system prompt file (default: pi's built-in)
- `--extensions <path>...` — extension paths (default: exa-search, exit)

Returns the job ID. Report to the user:
- Job ID
- Model
- Task summary
- How to check: "ask me to check on it anytime"
- How to watch live: `tmux attach -t <job-id>` (detach with Ctrl+B, D)

The user must specify the model. If not provided, run `pi --list-models` to see available models and ask which one to use.

## Check status

Single job (captures current screen):
```bash
~/.pi/agent/skills/task-runner/status.sh <job-id>
```

All jobs:
```bash
~/.pi/agent/skills/task-runner/status.sh
```

## Kill

```bash
~/.pi/agent/skills/task-runner/kill.sh <job-id>
```

## Cleanup finished jobs

```bash
~/.pi/agent/skills/task-runner/cleanup.sh
```

## State

Jobs tracked in `/tmp/task-runner-jobs.json`.

## Notes

- The agent is told to call `done.sh` when finished, which auto-exits after 5s
- If the tmux session is gone, check the exit file for crash vs clean exit
- Always review agent output for correctness before acting on it
