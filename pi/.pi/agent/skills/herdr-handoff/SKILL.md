---
name: herdr-handoff
description: Create a fresh human-facing agent session in herdr so the user can continue work there. Use when the user says handoff, compact for another session, continue in another session, or asks to start a fresh agent with the current context. Writes a handoff doc, starts a visible split in the current tab without stealing focus by default, and sends the new agent the doc.
argument-hint: "What should the next session focus on?"
---

# Hand off work to a fresh herdr session

Use this skill to create a new agent session for the user to continue in.

Do not use this for background grunt work. Use `herdr-subagents` for async workers.

Use `model-selection` before choosing a model or harness.

## What handoff does

A handoff:

- writes a concise handoff document to the OS temp dir
- starts a fresh agent as a visible split in the current tab without stealing focus by default
- sends the handoff document path to the new agent
- leaves the new pane open and returns a focus command for the user

You own the setup. The user owns the new session after handoff.

## Inputs

Treat the user's text as the next-session focus.

Also handle these options if the user gives them:

- `--cwd <path>` - working directory for the new session. Default: current directory
- `--ssh <user@host>` - create the handoff session on a remote machine
- `--model <model>` - model for the new session
- `--harness <pi|claude|agent|codex|command>` - agent harness. Default: `pi`
- `--title <short-title>` - title for the pane and handoff file
- `--focus` - focus the new session after setup
- `--tab` - create a new visible tab instead of a split
- `--no-agent` - write the handoff document only

Ask only for missing values that block the chosen mode.

## Write the handoff document

Write the handoff document to the OS temp dir, not the repo.

Use a short title, 2 to 5 words. Convert it to a lowercase slug with `a-z`, `0-9` and `-`.

Path format:

```
/tmp/herdr-handoff-<slug>-<YYYYMMDD-HHMMSS>.md
```

Required sections:

```markdown
# Handoff - <project> - <date>

## Focus
<what the next session should do>

## Current state
<short status, branch or change id if useful, checks run>

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

- be concise
- use paths and links instead of copying large content
- do not include secrets, tokens, passwords or private keys
- include suggested skills for the next agent

## Start a visible handoff split

Default to a visible split in the current tab. Do not steal focus.

1. Get the current workspace id.

```
herdr pane current
```

2. Start the agent as a split.

```
herdr agent start <name> --cwd "$cwd" --workspace <workspace-id> --split right --no-focus -- <harness-command>
```

Use `--focus` only after setup if the user explicitly asked for `--focus`.

If the user asked for a new tab, create a visible tab first:

```
herdr tab create --workspace <workspace-id> --cwd "$cwd" --label "handoff <title>" --no-focus
herdr agent start <name> --cwd "$cwd" --tab <tab-id> --no-focus -- <harness-command>
```

## Harness commands

Use `model-selection` for model choice. Common commands:

```
pi
pi --provider openai-codex --model gpt-5.6-sol --thinking xhigh
claude --model <model> --dangerously-skip-permissions
agent --model <model> --yolo --sandbox disabled
codex --model <model> --ask-for-approval never --sandbox danger-full-access --cd "$cwd"
```

Use permission bypass only for trusted handoffs.

## Send the handoff to the new agent

Wait until the pane can accept its first message:

```
herdr agent wait <name> --status idle --timeout 30000 || true
```

For Cursor Agent, add a short boot wait after idle. Its status can turn idle before the composer accepts input.

```
sleep 5
```

Read the pane once before sending Enter. Use `--source visible` because it works for alt-screen TUIs and normal panes:

```
herdr agent get <name>
herdr agent read <pane-id> --source visible --lines 20
```

Send a one-line message with the handoff path:

```
herdr pane send-text <pane-id> "Read <handoff-file>. This is your context for the next session. Reply ready when loaded."
for i in 1 2 3; do
  herdr pane send-keys <pane-id> enter
  sleep 0.4
done
```

If the user asked for `--focus`, focus the session after the handoff message has been sent:

```
herdr agent focus <name>
```

Do not close the pane or tab. It is now the user's session.

## Return this to the user

Return:

```text
handoff: <handoff-file>
tab: <tab-id>
pane: <pane-id>
focus: herdr agent focus <name>
```

## Remote handoff

For a remote handoff, write the handoff document locally first. Ask before sending private repo details to another machine.

Copy or write the handoff document to the remote machine. Local temp paths do not exist remotely.

```
scp <handoff-file> <user>@<host>:/tmp/<handoff-basename>
```

Use `/tmp/<handoff-basename>` as `<remote-handoff-file>`.

Get the remote workspace id from the remote herdr session:

```
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr pane current'
```

Use the returned `workspace_id`. If there is no current remote pane, create a remote workspace first and use its `workspace_id`.

Then run the same split command over SSH:

```
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr agent start <name> --cwd "<cwd>" --workspace <workspace-id> --split right --no-focus -- <harness-command>'
```

Wait for the remote agent and read it before sending:

```
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr agent wait <name> --status idle --timeout 30000 || true; herdr agent get <name>'
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr agent read <pane-id> --source visible --lines 20'
```

For Cursor Agent, add `sleep 5` after idle before sending.

Send a one-line message that points at the remote handoff file:

```
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr pane send-text <pane-id> "Read <remote-handoff-file>. This is your context for the next session. Reply ready when loaded."; for i in 1 2 3; do herdr pane send-keys <pane-id> enter; sleep 0.4; done'
```

If the user asked for `--focus`, focus the remote session after the handoff message has been sent:

```
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr agent focus <name>'
```

If the remote agent must report ready back to your local pane, include an SSH reply-to command in the handoff document. Ask for the local SSH address if you do not know it. If the remote host cannot SSH back, do not request a herdr reply. Read the remote pane instead.

## Safety rules

- never include secrets in the handoff document
- ask before sending private or sensitive context to another machine or third-party model
- do not close the handoff pane or tab
- do not use this for background workers
