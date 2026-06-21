---
name: task-runner
description: Spawn your own background Pi agent and get its result through pi-mesh. Use when the user asks to have another model do work, run something in the background, or delegate a task.
---

# Task Runner

Default: spawn a fresh worker with `pi --mesh-on`. A relay uses `pi-mesh request`, sends the result back, then kills the worker. Do not use random existing agents.

## Local task

1. Run `mesh_on` if this session is not registered.
2. Run `agent_list` and copy the current alias or id.
3. Run:

```bash
~/.pi/agent/skills/task-runner/spawn.sh <model> <cwd> <task> --reply-to <current-agent>
```

The script starts a zmx worker, waits briefly for readiness, sends the task with `pi-mesh request`, relays the final answer back, then kills the worker.

Optional naming:

```bash
--name "task title" --job-id task-title-1234
```

`--name` is the pi mesh title. `--job-id` is the zmx session name.

Report only:
- job id
- agent alias
- model
- task summary
- "result will arrive as a pi-mesh message"

Do not poll unless debugging.

## Remote task over SSH

Use when the user wants a fresh worker on another machine.

Ask for:
- SSH address, e.g. `user@host`
- remote cwd
- remote model, if unknown

Run:

```bash
~/.pi/agent/skills/task-runner/spawn.sh <model> <remote-cwd> <task> --reply-to <current-agent> --ssh <user@host>
```

If mesh discovery fails, pass local service addr:

```bash
--peer <host:port>
```

The script SSHes in, starts remote `zmx`, connects remote pi-mesh to the local peer, starts `pi --mesh-on`, waits briefly for readiness, then sends the task with `pi-mesh request` and relays the final answer back.

## Existing remote agent

If the user explicitly names an existing remote agent, use `agent_send` or `agent_request`. No SSH needed.

## Model missing

Local:

```bash
pi --list-models
```

Remote:

```bash
ssh <user@host> 'pi --list-models'
```

Ask which model to use.

## Optional reuse

Only use for follow-up tasks in the same thread. Reuse uses `agent_send` so the worker stays alive; TTL handles cleanup:

```bash
~/.pi/agent/skills/task-runner/spawn.sh <model> <cwd> <task> --reply-to <current-agent> --reuse --idle-ttl 600
```

Reuse is limited to workers you started and tracked in `/tmp/task-runner-jobs.json`.
`--idle-ttl` is reuse-only. Default: 600s. `0` disables auto-exit.
Works with `--ssh` too.

## Existing agents

Allowed:
- a fresh task-runner worker
- an owned task-runner worker when `--reuse` is explicit
- an agent the user explicitly names

Not allowed:
- random existing mesh agents just because they are online

## Debug only

```bash
~/.pi/agent/skills/task-runner/status.sh [job-id]
~/.pi/agent/skills/task-runner/kill.sh <job-id>
~/.pi/agent/skills/task-runner/cleanup.sh
```

Use status only when the result does not arrive or the user asks to inspect the worker.

## Message shape

```text
Context: <repo/path/state>
Task: <exact ask>
Constraints: <read-only, no edits, tests, output format>
Return: <concise result>
```

## Safety

Ask first before sending secrets/private data to another machine, running destructive tasks, or choosing between several costly models.
