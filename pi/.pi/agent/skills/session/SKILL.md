---
name: session
description: "Save or resume session state for context continuity across compactions. Use when user says 'save state', 'save session', 'compact', 'resume', or invokes /session."
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Session State Skill

Two modes: **save** and **resume**. Detect from `$ARGUMENTS` or conversation context.

## State File Path

`~/Developer/claude/{project}-session-state.md` where `{project}` is the basename of the current working directory.

## Mode: save

Write a structured session state file. This is NOT a chronological narrative -- it is structured for agent continuation after compaction.

### Required sections

```markdown
# {Project} Session State - {YYYY-MM-DD}

## Current Task
One-line role and objective.

## Active Work
- Bullet list of in-progress items, next steps, blockers
- Include status: (next), (in progress), (blocked by X), (open P0/P1/P2)

## Context Summary
Key domain/architecture knowledge needed to continue work.
Point to persistent memory files rather than duplicating:
- `See /path/to/memory/file.md for details`
Include only what a fresh session needs to pick up where this one left off.

## Baselines
Measurable state to preserve: test results, perf numbers, regression tables.
Use markdown tables for structured data.

## Key Files
- `path/to/file.rs` -- what it does, key functions with line numbers

## Work Products
- Files created or modified this session with one-line descriptions

## User Corrections
Verbatim user quotes that corrected the agent's understanding.
Format: "exact quote" -- context of what it corrected

## Decisions
- Key choices made and rationale, one bullet each
```

### Guidelines

- Date-stamp the header with today's date
- Keep it concise: scan-friendly, not exhaustive
- Pointers over duplication: reference memory files, QA reports, docs
- Baselines must be reproducible: include exact commands or query sets
- User corrections are verbatim -- preserve exact wording including typos
- Omit empty sections (if no user corrections, skip the section)

## Mode: resume

1. Read the state file from `~/Developer/claude/{project}-session-state.md`
2. Read any files referenced in the state (memory files, linked docs)
3. Confirm restoration with a brief summary:
   - Current task
   - Active work items
   - Any blockers or pending items
