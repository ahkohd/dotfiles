---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up, optionally spawning a local or remote zmx-backed worker through task-runner. Use when the user says handoff, compact for another agent, continue in another session, or asks to start a handoff agent.
argument-hint: "What will the next session be used for?"
---

# Handoff

Write a handoff doc to the OS temp dir, not the workspace. Optionally start or message another agent so work can continue there.

## Inputs

Treat user args as the next-session focus. Also parse if present:

- `--agent <alias-or-id>`: send to an existing mesh agent.
- `--ssh <user@host>`: spawn a remote handoff agent through task-runner.
- `--cwd <path>`: cwd for spawned agent. Default: current cwd locally, remote home or user-provided remote cwd for SSH.
- `--model <provider/model>`: model for spawned agent. Default: this session's current model.
- `--title <short-title>`: title for doc, pi session, and zmx session. Default: derive from focus/current task.
- `--no-agent`: write doc only.

Ask only for missing values that block the chosen mode. Do not ask for model unless the current model is unavailable.

## Title and slug

Derive a short title from the focus/current task, 2-5 words. Convert it to a slug with lowercase `a-z0-9-`, max 40 chars. Use it for:

- handoff filename: `pi-handoff-<slug>-<timestamp>.md`
- spawned pi title: `handoff <title>`
- spawned zmx session/job id: `handoff-<slug>-<HHMMSS>`

## Step 1: write local handoff doc

Use the OS temp dir:

```bash
TITLE="<derived title>" python3 - <<'PY'
import os, re, tempfile, time
slug = re.sub(r'[^a-z0-9]+', '-', os.environ['TITLE'].lower()).strip('-')[:40] or 'session'
stamp = time.strftime('%Y%m%d-%H%M%S')
print(os.path.join(tempfile.gettempdir(), f"pi-handoff-{slug}-{stamp}.md"))
PY
```

Write the doc there. Do not create it in the repo.

Required sections:

```markdown
# Handoff - <project> - <date>

## Focus
<what the next session should do; use args if provided>

## Current state
<short status, current branch/change if useful, tests/checks run>

## Key context
<only context needed to continue; link artifacts instead of duplicating>

## Changed files and artifacts
- `<path>` - why it matters

## Decisions and user corrections
- "<verbatim user correction>" - what it corrected

## Next steps
1. ...

## Suggested skills
- `<skill>` - why
```

Rules:

- Be concise. Pointers over duplication.
- Do not duplicate PRDs, plans, ADRs, issues, commits, or diffs. Reference paths or URLs.
- Redact secrets, tokens, passwords, private keys, and sensitive personal data.
- Include suggested skills that the next agent should load.

## Step 2: mesh

Run `mesh_on` if this session is not registered. Use `agent_list` if you need the current alias/id.

## Step 3: target modes

### Doc only

Stop after writing the doc. Return only the path and suggested resume command:

```text
handoff: <local-path>
```

### Existing mesh agent

If `--agent` is present, send the handoff content inline with `agent_send` or `agent_request`. Ask that agent to write it to its OS temp dir and reply with the path.

Return:

```text
handoff: <local-path>
agent: <alias-or-id>
remote handoff: <path or pending>
zmx session: n/a existing agent
```

### Spawn local handoff agent

Use task-runner in reusable mode so the worker stays alive:

```bash
~/.pi/agent/skills/task-runner/spawn.sh <model> <cwd> "<local handoff task>" --reply-to <current-agent> --reuse --idle-ttl 0 --name "handoff <title>" --job-id handoff-<slug>-<HHMMSS>
```

The local handoff task must give the worker the local handoff path, not inline content. Tell the worker:

- read `<local-path>` from temp
- reply with `remote handoff: <same path>`
- stay available for follow-up work

Return:

```text
handoff: <local-path>
agent: <agent-alias>
zmx session: <job-id>
attach: zmx attach <job-id>
pi title: handoff <title>
```

### Spawn remote handoff agent over SSH

Use task-runner with `--ssh` and `--reuse --idle-ttl 0`.

Before spawning, compute a remote temp path when SSH is available:

```bash
ssh <user@host> 'python3 - <<"PY"
import os, tempfile, time
project = os.path.basename(os.getcwd()) or "session"
stamp = time.strftime('%Y%m%d-%H%M%S')
print(os.path.join(tempfile.gettempdir(), f"pi-handoff-{project}-{stamp}.md"))
PY'
```

If that is awkward, tell the remote agent to choose its OS temp dir and reply with the path.

Spawn:

```bash
~/.pi/agent/skills/task-runner/spawn.sh <model> <remote-cwd> "<remote handoff task>" --reply-to <current-agent> --ssh <user@host> --reuse --idle-ttl 0 --name "handoff <title>" --job-id handoff-<slug>-<HHMMSS>
```

The remote handoff task must include the handoff content inline and tell the worker to write it to the remote temp path.

Return:

```text
handoff: <local-path>
remote handoff: <remote-path or pending from agent>
agent: <agent-alias>
zmx session: <job-id>
attach: zmx attach <job-id>
ssh attach: ssh -t <user@host> 'export PATH="$HOME/.local/bin:$HOME/.npm-packages/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"; zmx attach <job-id>'
pi title: handoff <title>
```

## Handoff task templates

Local spawned agent:

```text
You are receiving a handoff for a new working session.

Read the handoff markdown at <local-path>. Then reply with:
remote handoff: <local-path>
ready: yes

Load these suggested skills before continuing: <skills>.
Stay available for follow-up work over pi-mesh.
```

Remote spawned agent or existing agent:

```text
You are receiving a handoff for a new working session.

Write the handoff markdown below to your OS temp dir as <filename>. Then reply with:
remote handoff: <path>
ready: yes

Load these suggested skills before continuing: <skills>.
Stay available for follow-up work over pi-mesh.

---HANDOFF---
<document content>
---END HANDOFF---
```

## Safety

Ask first before sending private repo details, secrets, or sensitive data to another machine or third-party model. Never include secrets in the handoff.
