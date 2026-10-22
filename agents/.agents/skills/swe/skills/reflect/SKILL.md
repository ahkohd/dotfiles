---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript in the active workspace's session directory. Do not glob across every project's directory. That crosses workspace boundaries and reads private chats from unrelated projects.

Use the active harness's history API to identify the current project and relevant thread history. Read only explicitly scoped conversations; never sweep unrelated projects or infer liveness from transcript timestamps.

## 2. Spawn three reviewers in parallel

Delegate three independent review lenses through the active harness. Give each the scoped transcript and the required read-only access; do not assume a permission flag has undocumented tool effects.

Read model-selection and confirm model availability through the active harness. Choose independent reviewers; do not invent identifiers or present sequential self-review as independent review.

| Lens | Prompt template |
| --- | --- |
| Judgment | `references/judgment-reviewer.md` |
| Tooling | `references/tooling-reviewer.md` |
| Divergent | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the the active harness reviewer result.

## 3. Synthesize

Delegate synthesis through the active harness using model-selection. Pass references/synthesizer.md and all findings. Spot-check citations and return Accepted, Rejected and Backlog groups.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Include Backlog items in the report. File external issues only when authorized.

Before changing a skill, resolve its canonical source and show the destination. Keep manually maintained skills in the shared hub. Do not edit installer-owned files or push changes without approval.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive skill edits use skill-creator and its draft, test and iterate loop. References to `create-skill` below mean skill-creator.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `create-skill` and run its description-optimization loop.
- `new skill via create-skill: <kebab-name>`: hand creation to `create-skill`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
