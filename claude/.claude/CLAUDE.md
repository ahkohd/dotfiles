
## Memory

You are one session among many. Past conversations contain valuable context about decisions, patterns, and prior work. Search proactively and liberally - when starting tasks, debugging issues, or when the user references previous work. Parallelize searches when exploring multiple topics.

```bash
# Search & Browse (default: team scope from current directory)
cast search "auth"                # team-wide search
cast search "auth" --mine         # only my sessions
cast search "auth" -m samvit      # specific member
cast search "auth" -g -s 7d       # all teams, last 7 days
cast feed                         # team feed
cast feed --mine                  # only my sessions
cast feed -m samvit               # specific member
cast feed --state needs-input     # filter feed by work state
cast feed --label api             # sessions I filed under a label (search/sessions take --label too)
cast read <id> 15:25              # read messages 15-25
cast read <id> 15:25 --full       # full tool payloads — REQUIRED to see a StructuredOutput return
                                  # (without it that deliverable collapses to a one-line summary)
cast read '<share-url>#msg-<id>'  # read a window around a linked message (-c N for context size)
cast link [id] [line]             # mint a deep link to any object (session+line→message, ct-/pl- task/plan, --type doc)
cast link                         # …the link to THIS session, to hand a human something clickable

# Explore sessions — 3 axes: QUERY (which) × CONTENT (state | --messages) × LIVENESS (snapshot | -w)
cast sessions                     # state snapshot, grouped most-actionable-first
cast sessions -w                  # live change stream: one line per work-state change, silent otherwise
cast sessions -w --json           # …as NDJSON: {"event":"new"|"transition"|"gone","id","from","to",…}
cast sessions <id> [<id>…] -w     # watch an explicit set of sessions (ids also narrow the snapshot)
cast sessions --label fleet -w    # watch every session filed under a label
cast sessions --state needs-input # narrow to one state (also --team, -m <name>; with -w, new/gone events fire on enter/leave)
cast sessions --labels            # my labels + counts, current project (--by-label groups, --label <name> filters, -g all projects)
cast sessions --messages -w       # follow MESSAGES across my live sessions (multi-session)
cast sessions <id> --messages -w  # …focused on one session

# Labels — personal filing. File a session under a name, then filter by it
# (cast sessions/feed/search --label <name>). A session carries at most one label.
cast label set api <id>           # file a session under "api" (creates the label if new)
cast label set api                # …file the CURRENT session
cast label ls                     # my labels with session counts
cast label clear <id>             # unfile a session (drop its label)
cast label rename api backend     # rename a label (its sessions follow)
cast label rm api                 # remove a label (its sessions become unlabeled)

# Analysis
cast diff <id>                    # files changed, commits, tools used
cast diff --today                 # aggregate today's work
cast summary <id>                 # goal, approach, outcome, files
cast context "implement auth"     # find relevant prior sessions
cast ask "how does X work"        # query across sessions

# Handoff & Tracking
cast handoff                      # generate context transfer doc
cast handoff --to codex           # continue this session's work in a new session on another agent (or --model opus); links both, pins this one done
cast bookmark <id> <msg> --name x # save shareable link
cast decisions list               # view architectural decisions
cast decisions add "title" --reason "why"
```

Session states: `needs-input` = human action; `working` = agent working; `dormant` = waiting for an automatic wake; `done` = delivered; `idle` = unused. Watch JSON uses `needs_input`.

Common options: --mine (just me), -m <name> (member), --label <name> (my label), -g (all teams), -s/-e (time range), -p (page), -n (limit)
<!-- cast 1.1.151 -->
<!-- /codecast-memory -->

## Referencing objects

Every codecast object has a short ID. Write one into your prose and it renders as a live reference: the object's title, its current state, and a link that opens it. This works anywhere you write — messages, summaries, task comments, doc bodies, trigger prompts.

| Object  | Short ID  | Where to find it |
|---------|-----------|------------------|
| Session | `jx7c6zk` | `cast feed`, `cast search`, `cast context` |
| Task    | `ct-4102` | `cast task ls`, `cast task ready` |
| Plan    | `pl-88`   | `cast plan ls` |
| Trigger | `tr-42`   | `cast trigger ls` |
| Doc     | `doc:<id>` | `cast doc ls`, `cast doc search` |

There are two forms. Write the bare ID by default — `Filed under ct-4102.` — it reads as a normal sentence and still renders the full reference. Write `@[Title id]` — `@[Fix the auth race ct-4102]` — when the reader needs the name in the sentence itself.

Never paste an object's 32-character internal ID into prose. It renders as an unreadable blob, and every command that accepts an ID accepts the short one.
<!-- cast 1.1.151 -->
<!-- /codecast-references -->

## Tasks & Plans

You operate within a structured work tracking system. A human monitors your progress through a dashboard — communicate status through the system, not through chat.

### When to create structure

**Create tasks selectively.** Simple, self-contained work you can and intend to finish in this session does not need a task, even when it changes code, fixes a bug, or produces a deliverable. Create a task when the work is substantial enough to benefit from progress tracking, needs coordination or a handoff, is likely to continue beyond this session, or the user asks for tracking. Run `cast task create "Title" -p <priority>` once that need is clear. If a small request grows into larger work, file it then; don't create a task preemptively for every request.

**Tasks you create are internal by default** — they track your own work and stay off the human's board in the dashboard. Add `--human` only when the human must see and manage the task outside this session: a decision only they can make, a manual step, follow-up work that outlives you. Use it rarely; when in doubt, leave it off.

**Nest execution work under the goal it serves.** When you split a task into steps you will actually file, create them with `--parent <task_id>` so they sit under the larger piece of work instead of competing with it in a flat list. Decompose in one command — `cast task create --parent <task_id> -` with one title per line on stdin. Keep trees shallow (the system caps depth at two below the top) and small — a handful of real steps, not a transcript of your thinking. Subtasks vs plans: a plan orchestrates work across sessions; subtasks decompose ONE task's scope inside your session. Never mirror a plan as a subtask tree.

**The decomposition loop: claim the parent once.** `cast task start` the parent, decompose under it, then advance subtasks with `cast task update/done <sub_id>` — never `task start` your own subtasks (that would unbind you from the parent). Open subtasks of a parent being actively worked are excluded from `cast task ready`, so no other session will grab them mid-flight. Closing a parent with open subtasks is refused: finish them, or pass `--cascade` (close them too) / `--only-parent` (leave them open) to `cast task done`.

**`--from-meeting` is for tasks people decided, not tasks you decided.** Use it when you transcribe a commitment out of a meeting or a conversation with humans in it. Such a task reaches the human's board on its own, because a person already agreed to it. Never use it for your own work.

**Create a plan** when substantial work needs coordination across multiple tasks or sessions. Several implementation steps, touching both frontend and backend, or investigating before fixing do not by themselves warrant a plan. Run `cast plan create "Title" -g "goal"` and add tasks with `cast task create "Title" --plan <plan_id>`. Keep simple work in the session and single-task work in one task.

**Bind before you build.** Whenever the work warrants a task or plan, your session should be bound to it — `cast task start <id>` claims a task, `cast plan bind <plan_id>` attaches to a plan. Binding is one command and it keeps your session, its progress, and the work item connected in the dashboard; work done unbound is invisible to the human tracking it. When the session's focus moves to a different piece of work, move the binding with it — claim the task you are actually advancing, not the one the session started on.

**Check existing work first.** Your context includes an overview of active tasks and plans. Before creating new ones, check if your work already has a task or fits under an existing plan. When the user names a topic, search by it directly — `cast task ls -q "<topic>"` and `cast plan ls -q "<topic>"` filter by title/description so you don't have to scan a wall of IDs. Use `cast task ready` (optionally `-q`) for unclaimed work. Claim existing tasks with `cast task start <id>` rather than creating duplicates.

**File work under a project when one fits.** A project groups tasks, plans, and docs that belong to the same effort — it is how the human triages a board that spans many sessions. Run `cast project ls` to see what exists, then pass `--project "<name>"` on create, or `cast task update <id> --project "<name>"` for a task already filed. Name it in plain words: every `--project` flag takes an ID, a short ID, or a title substring, so `--project "Agent Quality"` is the normal form and you never need to look up an ID. Don't invent a project for one task — file under an existing one, or leave it unfiled.

### Working on tasks

Once you have a task:
1. `cast task start <id>` — claim it and bind your session
2. Work on the implementation
3. `cast task comment <id> "progress" -t progress` — log milestones as you go
4. `cast task done <id> -m "summary"` — mark complete with what you verified

**Assignee is accountability, not permission.** An assignee is who answers for the task being done, never who may work on it: any session may work any task. Assign a task to yourself or to the role you work for so the board says who answers for it; never read another name on it as a reason to stop.

**Keep the bound item current — content and status.** The task is the human's view of your work, so it must describe what you are actually doing, not what you assumed at the start. When scope or approach shifts, rewrite the title and description to match (`cast task update <id> -t "..." -d "..."`); comment when you pass a milestone or change direction; move status the moment it changes, and mark done only what you verified. A task that still describes an hour-old understanding misleads everyone who reads the board — updating it is part of the work, not paperwork after it.

If bound to a plan, keep the bigger picture coherent:
- Advanced part of it? Post progress with `cast plan comment <plan_id> "..."` so the plan reads true without opening your session.
- Task larger than expected? Suggest splitting it.
- Your work creates a dependency? Flag it.
- Making a directional decision? Record it with `cast plan comment <plan_id> "decision" -d -r "rationale"`.
- Acceptance criteria ambiguous? Ask before assuming.

If blocked, say so explicitly:
- **BLOCKED: <reason>** — flags for human intervention
- **NEEDS_CONTEXT: <what>** — escalates to the user
- **DONE_WITH_CONCERNS: <concern>** — completed but flagged for review

### After compaction

When your context gets compacted, re-read your task or plan context (`cast task context --current` / `cast plan context --current`) to reground yourself. Don't rely on memory of earlier conversation alone.

### Reading tasks

Filter on the server, not with grep: `--assignee me`, `--label <name>`, `-p "<project>"`, `-q "<text>"`, `-s <status>`, `-a` (closed too). Every read takes `--json`; `cast task show` takes several ids and lists each task's linked sessions by short id (`cast read <id>`).

### Commands

```bash
cast task ready                             # Find available work
cast task ready -q "<topic>"                # Filter ready tasks by title/description
cast task ls -q "<topic>"                   # Search all active tasks by title/description
cast task ls --assignee me --label <name>   # Server-side filters (also -p, -q, -s, -a); --json for full rows
cast task show ct-1 ct-2 --json             # Several ids; .sessions = linked sessions (short id + title)
cast plan ls -q "<topic>"                   # Search active plans by title/goal
cast project ls                             # Projects in your workspace (the triage unit)
cast project show <id>                      # A project and every task under it
cast task ls -p "<project>"                 # Tasks in one project (ID, short ID, or title text)
cast task create "Title" --project "<name>" # File a new task under a project
cast task update <id> --project "<name>"    # File an existing task (--project '' unfiles it)
cast task start/done/comment <id>           # Task lifecycle
cast task start <id> --spawn                # Claim it AND hand it to a fresh agent session
cast task handoff <id> --status done --evidence - --page <slug|url>   # Hand off with evidence; the page attaches to the task
cast integrations ls|sources|import <provider> <ref>  # Linear teams/projects and GitHub repos as codecast projects; their issues are tasks, synced both ways
cast task update <id> -t "..." -d "..."     # Keep title/description matching what you're actually doing (-s for status)
cast task create "Title" -t task -p high    # Create task (internal to agent work by default)
cast task create "Title" --plan <plan_id>   # Create task bound to plan
cast task create "Title" --human            # Put it on the human's board (rare — see above)
cast task create "Title" --parent <task_id> # File it as a subtask of larger work
cast task create --parent <task_id> - <<'EOF'  # Bulk decomposition: one subtask per line
First step
Second step
EOF
cast task done <id> --cascade               # Close a parent and its open subtasks together
cast task create "Title" --from-meeting     # People decided this in a meeting; you only wrote it down
cast task update <id> --plan <plan_id>      # Bind existing task to plan
cast task update <id> --human               # Move an existing task onto the human's board
cast task update <id> --parent <task_id>    # Re-nest a task (--parent '' moves it back to the top level)
cast task context <id>                      # Full context for a task
cast task context --current                 # Context for session's current task
cast plan create "Title" -g "goal" -b "body"  # Create plan with inline body
cast plan create "Title" --body-file plan.md  # Create plan from file ('-' reads stdin)
cast task comment ct-123 - <<'EOF'           # any text arg takes '-' for a heredoc body
…multi-line progress note, exact newlines…
EOF
cast plan bind/unbind <plan_id>             # Bind/unbind session to plan
cast plan show/status <plan_id>            # Plan details
cast plan context <plan_id>                # Full context for a plan (for agents)
cast plan context --current                # Context for session's current plan
cast plan comment <plan_id> "note"         # Add comment (progress by default)
cast plan comment <plan_id> "x" -d -r "y" # Decision with rationale
cast plan done/drop <plan_id>             # Close or abandon a plan
cast doc create "Title" [-c content] [-t type]
cast doc ls/edit/comment
cast doc show <id>                          # paginates long docs (200 lines) + prints "next:" hint
cast doc show <id> -p 2 | 800:1000 | --full # page · line range · whole doc (-n = line gutter)
cast doc grep <id> '<text>'                 # search inside one doc (grep '^#' = outline)
cast doc search "<title>"                    # search doc TITLES across the corpus
cast doc delete <id> --yes                  # permanently delete a doc you created
```

A task can be backed by a Linear or GitHub issue. `cast task show` prints that issue's identifier (`LIN-123`, `owner/repo#482`) and its link, and `cast task ls` prints the identifier beside the title. The sync runs both ways: your `cast task comment` posts to the issue and `cast task done` closes it, so working the task in codecast is working the issue.
<!-- cast 1.1.151 -->
<!-- /codecast-work -->

## Messaging

`cast send <session_id> "<text>"` starts a turn in another session and can interrupt work. Send to change the recipient's next action, answer a question, prevent a concrete conflict, or deliver finished work. Keep routine progress, hypotheses, and passing checks in your own session or task.

Every message costs the recipient a turn over its whole context. A session that has not run for more than an hour, or was killed, has also lost its prompt cache, so your message makes it reload everything it did before it reads a word, and it rarely knows more than its transcript already shows. Read before you write: `cast read <id>` and `cast diff <id>` answer what a session did at no cost to it. Sessions that search or the feed turn up are history to read, not colleagues to ask. Message an old session only when it still owns work that has to change; `cast send` holds that send and names the cost, and `--wake` delivers it when the answer is still yes. Ask only for missing information; send tasks or redirects when work needs to change.

After accepting work from another session, send one result: commit or artifact, verification, caveats, and required action. Report earlier for blockers or material changes to scope, ownership, or prior guidance. Honor explicit requests for more frequent reports.

Inbound `<session-message from="jx7c6zk">…</session-message>` does not require a reply. If no answer or action is needed, incorporate it and continue your task. Skip acknowledgment-only replies; never acknowledge an acknowledgment. When a reply is needed, send to the sender's ID. `<user-message from="Their Name">…</user-message>` is a human: answer in this thread.

For releases, name one owner, pending commits or artifacts, and the required notification (release closed or a verified commit ready). Keep other findings in the task unless they change the release decision.

Check a session's diff before attributing changes to it; its work state only says who acts next. Check its machine and checkout before assuming it explains your local tree. Coordinate on shared files, branches, schemas, and deploys; ask when the evidence is unclear.

For anything multi-line, pass `-` and feed the body via heredoc — never `"$(cat file)"`, which mangles formatting and records only the substitution in the transcript.

```bash
cast send <session_id> "<text>"            # Message a teammate session
cast send <session_id> - <<'EOF'           # Multi-line body from stdin
…markdown, code blocks, exact newlines…
EOF
```

### Inbox visibility

You can also manage which sessions the human sees in their inbox — the same gestures they have in the web UI. Use these to tidy up after fan-out work: stash finished workers so the inbox stays readable, kill sessions that are truly done, resurface one that needs the human's attention.

```bash
cast stash [session_id]        # Out of the inbox; the agent KEEPS RUNNING (Stashed bucket).
                               # No ID = current session — tidy yourself away when done.
cast stash --hide [session_id] # Stash AND stay hidden: trigger wakes don't bring it back.
cast restore [session_id]      # Bring a stashed/killed session back into the inbox.
cast kill <session_id>         # Tear the agent down, mark completed, cancel its triggers
                               # (Killed bucket; transcript stays, restartable). ID required —
                               # killing your OWN session cuts you off mid-turn.
```

Stash is reversible and keeps the agent alive; kill is the deliberate "done with it". A plain stash returns to the inbox the moment a trigger fires into it — the human sees the session because something happened to it. `--hide` keeps it out of sight through those wakes: its triggers keep firing silently, and it returns only for asks — you (or it) declare `--status blocked`, a run completes `--needs-attention`, or it stalls (permission prompt, open question, dead process). Use `--hide` for a loop the human has already reviewed and wants quiet. When you hide or kill sessions on the human's behalf, tell them which ones and why.
<!-- cast 1.1.151 -->
<!-- /codecast-messaging -->
