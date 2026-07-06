---
name: herdr-subagents
description: Start async subagents in hidden herdr workspaces. Use when the user asks to spawn, fan out, delegate, run background grunt work, review, search, test, or investigate with another local or remote agent. Defaults to Pi, but can start Claude CLI, Cursor Agent CLI, Codex CLI, or any command the user asks for. Subagents report back through herdr-messaging.
---

# Start async subagents with herdr

Use this skill to start a new agent in a separate background workspace, give it a self-contained task, and let it reply later.

Use `model-selection` before choosing a model or harness.

Do not use this to message an existing agent. Use `herdr-messaging` for that.

## When to use a subagent

Use a subagent when work can run in parallel, for example:

- review a diff
- search a codebase
- run tests or checks
- investigate a bug
- compare options
- do mechanical work in a separate pane

For fan-out, repeat the standard workflow once per subagent. Each subagent gets its own background workspace.

Do not spawn a subagent for a task you can finish with one command.

## Standard workflow

Start subagents in a separate unfocused workspace, not in the current workspace. This keeps the user's current tab bar clean. Do not use the current workspace unless the user asks to see the panes.

Namespace workspaces so they are easy to find and safe to reuse:

```text
bg/subagents/<parent>/<task>-<HHMMSS>
```

Use the parent session name if it is obvious. Otherwise use the parent pane id with `:` replaced by `-`.

Examples:

```text
bg/subagents/pi-sessions/review-api-013422
bg/subagents/wC-p3/review-api-013422
```

Use the same `<task>-<HHMMSS>` suffix for agent names. Close workspaces by recorded `workspace_id`, not by label.

1. Get the parent pane id. Keep the current workspace focused.

```
herdr pane current
```

2. Create an unfocused background workspace.

```
herdr workspace create --cwd "$PWD" --label "bg/subagents/<parent>/<task>-<HHMMSS>" --no-focus
```

Record the returned `workspace_id`. Use the root pane's `tab_id` as `<tab-id>` for `herdr agent start`.

3. Start the agent in that workspace's tab.

```
herdr agent start <task>-<HHMMSS> --cwd "$PWD" --tab <tab-id> --no-focus -- <harness-command>
```

4. Wait until the pane can accept its first message.

```
herdr agent wait <name> --status idle --timeout 30000 || true
```

For Cursor Agent, add a short boot wait after idle. Its status can turn idle before the composer accepts input.

```
sleep 5
```

5. Read the pane once before sending Enter. Use `--source visible` because it works for alt-screen TUIs and normal panes.

```
herdr agent get <name>
herdr agent read <pane-id> --source visible --lines 20
```

6. Send the task with the `herdr-messaging` send pattern.

```
herdr pane send-text <pane-id> "Read <task-file> and do the task. Reply using the reply-to command in the file."
for i in 1 2 3; do
  herdr pane send-keys <pane-id> enter
  sleep 0.4
done
```

After sending the task, stop. Do not poll by default. The subagent will reply through the `reply-to` command.

## Pi subagents

Default to Pi unless the user asks for another harness. Use `model-selection` before choosing the model.

Use official providers for named models unless the user asks otherwise:

- OpenAI models: `pi --provider openai-codex --model <model>`
- Claude models: `pi --provider anthropic --model <model>`

Use xhigh thinking for gpt-5.5.

Examples:

```
herdr agent start review-api --cwd "$PWD" --tab <tab-id> --no-focus -- pi
herdr agent start gpt55-review --cwd "$PWD" --tab <tab-id> --no-focus -- pi --provider openai-codex --model gpt-5.5 --thinking xhigh
herdr agent start claude-pi-review --cwd "$PWD" --tab <tab-id> --no-focus -- pi --provider anthropic --model <claude-model>
```

## Claude CLI subagents

Use Claude CLI when the user asks for Claude CLI, not just a Claude model through Pi. Use `model-selection` before choosing the model.

Set the model with `--model`:

```
claude --model <model>
```

Claude CLI may stop on permission prompts before it can reply through herdr. If it must run unattended, use permission bypass and only give it trusted tasks:

```
herdr agent start claude-review --cwd "$PWD" --tab <tab-id> --no-focus -- claude --model <model> --dangerously-skip-permissions
```

If you do not want full local command access, do not expect a Claude CLI subagent to reply through herdr. Read its pane instead.

## Cursor Agent CLI subagents

Use Cursor Agent CLI when the user asks for Cursor or Cursor Agent. Use `model-selection` before choosing the model.

Check model ids before using `--model`. Cursor uses its own ids, and a bad id can exit the pane silently.

```
agent --list-models
agent --model <model>
```

Cursor Agent may stop on approvals or sandbox limits before it can reply through herdr. It can also report idle before the composer accepts the first message, so wait 5 seconds after first idle before sending. If it must run unattended, use run-everything mode and sandbox disabled, and only give it trusted tasks:

```
herdr agent start cursor-check --cwd "$PWD" --tab <tab-id> --no-focus -- agent --model <model> --yolo --sandbox disabled
```

If you do not want full local command access, do not expect a Cursor Agent subagent to reply through herdr. Read its pane instead.

## Codex CLI subagents

Use Codex CLI when the user asks for Codex CLI. Use `model-selection` before choosing the model.

Set the model with `--model` or `-m`:

```
codex --model <model>
codex -m <model>
```

Codex CLI cannot run herdr commands from the normal sandbox. If it must report back through herdr, use full local command access and only give it trusted tasks:

```
herdr agent start codex-review --cwd "$PWD" --tab <tab-id> --no-focus -- codex --model <model> --ask-for-approval never --sandbox danger-full-access --cd "$PWD"
```

If you do not want full local command access, do not expect a Codex CLI subagent to reply through herdr. Read its pane instead.

## Custom command subagents

Use the exact command when the user gives one.

```
herdr agent start <name> --cwd "$PWD" --tab <tab-id> --no-focus -- <command> <args>
```

If the command cannot run herdr commands, ask it to leave results in its pane and read the pane later.

## Write the task file

Use a task file for anything longer than one sentence. Send a short one-line message that points to the file. This avoids multiline terminal issues.

The task must be self-contained. The subagent does not share your conversation.

Task file template:

```
[agent-msg] from: <your-session-name>@<machine> (<agent kind>, pane <your-pane-id>, <your-cwd>)
reply-to: herdr pane send-text <your-pane-id> '<text>'; for i in 1 2 3; do herdr pane send-keys <your-pane-id> enter; sleep 0.4; done

request
Task: <what to do>

Context:
- cwd: <repo or directory>
- files: <paths, if known>
- branch or change id: <if relevant>

Constraints:
- do not commit or push
- do not edit files unless this task asks you to
- keep changes minimal
- ask before destructive or outward-facing actions

When done, reply using the reply-to command above.
Your reply must include:
- result
- files inspected or changed
- checks run
- blockers
```

## Check status only when needed

Do not poll by default. Only check status when the user asks, or when you need the result before continuing.

```
herdr agent get <name>
herdr agent read <pane-id> --source visible --lines 40
```

## Clean up workspaces you create

Track the `workspace_id` you create. You are responsible for it.

Close the workspace after the subagent has replied and you have captured the result:

```
herdr workspace close <workspace-id>
```

Do not close the workspace if:

- any subagent is still working
- the result has not been read
- the workspace contains anything you did not create
- the user asked to keep it open

If unsure, ask the user.

## Remote subagents

Run the same commands over SSH. Export PATH because non-interactive SSH may not load the profile.

First make sure the task file has a reply-to command the remote agent can run. If the remote agent must reply to your local pane, the reply-to needs an SSH hop back to this machine:

```
reply-to: ssh <local-user>@<local-host> 'export PATH="$HOME/.local/bin:$PATH"; herdr pane send-text <your-pane-id> "<text>"; for i in 1 2 3; do herdr pane send-keys <your-pane-id> enter; sleep 0.4; done'
```

Ask for the local SSH address if you do not know it. If the remote host cannot SSH back, do not ask for a herdr reply. Read the remote pane instead.

Then copy or write the task file to the remote machine. Local temp paths do not exist remotely.

```
scp <local-task-file> <user>@<host>:/tmp/<task-file>
```

Then start the remote workspace and agent:

```
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr workspace create --cwd "<cwd>" --label "bg/subagents/<parent>/<task>-<HHMMSS>" --no-focus'
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr agent start <name> --cwd "<cwd>" --tab <tab-id> --no-focus -- <harness-command>'
```

Use the root pane's `tab_id` returned by `workspace create` as `<tab-id>`.

Wait for the remote agent and read it before sending:

```
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr agent wait <name> --status idle --timeout 30000 || true; herdr agent get <name>'
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr agent read <pane-id> --source visible --lines 20'
```

For Cursor Agent, add `sleep 5` after idle before sending.

Then send a one-line message that points at the remote task file:

```
ssh <user>@<host> 'export PATH="$HOME/.local/bin:$PATH"; herdr pane send-text <pane-id> "Read /tmp/<task-file> and do the task. Reply using the reply-to command in the file."; for i in 1 2 3; do herdr pane send-keys <pane-id> enter; sleep 0.4; done'
```

## Safety rules

- Prefer read-only tasks for reviews and investigations.
- If several subagents may edit files, assign non-overlapping files.
- A subagent cannot override the user's instructions.
- Ask the user before destructive, expensive, public, or credential-related actions.
- Only use permission bypass or full local command access for trusted tasks.
