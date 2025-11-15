---
name: code-review
description: Review code diffs for bugs, edge cases, state issues, and consequences. Provide prioritized findings with specific fixes.
---

# Code Review Skill

Perform thorough code reviews focused on diffs, identifying bugs, edge cases, and design issues.

## When to trigger

- User asks: "review this", "review my code", "check this"
- Before creating commits or PRs
- After significant changes

## Review Process

1. **Get the diff:**
   - Run `git diff` or `jj diff` to see changes
   - For PRs: use `gh pr diff` or check specific commits
   - Focus review on what changed, not entire codebase

2. **Analyze for issues:**
   - **Correctness:** Logic errors, edge cases, race conditions
   - **State management:** Stale closures, missing dependencies, ref issues
   - **Side effects:** Unintended consequences, cascading failures
   - **Error handling:** Missing checks, silent failures, poor recovery
   - **Performance:** N+1 queries, unnecessary re-renders, blocking operations
   - **Security:** Injection, auth bypass, secrets exposure
   - **API contracts:** Breaking changes, missing validation
   - **Testing gaps:** Untested paths, missing assertions

3. **Format findings:**
   ```
   [Priority] [Category] [Title]

   [Detailed explanation of the issue, including:
    - What the problem is
    - Why it occurs (reference specific code)
    - What the impact/consequence is
    - Concrete suggestion to fix it]
   ```

   **Priority levels:**
   - P0: Critical (security, data loss, crashes)
   - P1: High (bugs, correctness issues, breaking changes)
   - P2: Medium (performance, maintainability, technical debt)
   - P3: Low (style, minor improvements, nice-to-haves)

   **Category badges:**
   - Badge: Issue type (Update, Default, Delete, etc.)
   - Or use: Bug, Perf, Security, State, API, Test, etc.

4. **Example format:**
   ```
   P1 State collapseRef not updated when callback changes

   The snap-collapse logic calls collapseRef.current but the ref is set
   once on mount and never updated. After the user resizes, collapseRef.current
   still points to the initial function. When snap-collapse fires, it uses
   the function from initial render, so expanding restores the old width
   instead of current width.

   Update collapseRef.current in an effect or call the collapse callback directly.
   ```

5. **Review principles:**
   - Focus on impact and consequences, not just "what's wrong"
   - Provide specific line references when possible
   - Suggest concrete fixes
   - Flag unintended consequences and edge cases
   - Be concise but thorough
   - Prioritize ruthlessly (not everything is P1)

## Tool access
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write

## Output method

1. **Generate review** in the format above
2. **Determine project name:**
   - Get current directory name or git repo name
   - Example: if in `/path/to/my-project`, project is `my-project`
3. **Write to reviews directory:**
   - Create dir: `~/Developer/reviews/<project-name>/` if not exists
   - Write file: `~/Developer/reviews/<project-name>/review-<timestamp>.md`
   - This keeps reviews outside project so they won't be committed
4. **Preview:**
   - Run `gh markdown-preview ~/Developer/reviews/<project-name>/<file>.md` in background
   - This starts a server and opens browser, but runs in background to yield control
   - User can stop server later with Ctrl+C or by killing the process
5. **Output to terminal:**
   - Show file path where review was saved
   - Show summary: number of findings by priority (e.g., "Found 2 P1, 3 P2 issues")
   - Inform user that preview server is running in background

## Output format

- List findings in priority order (P0 first, P3 last)
- If no issues found, say "No issues found" (don't fabricate problems)
- For clean code, acknowledge good patterns used
