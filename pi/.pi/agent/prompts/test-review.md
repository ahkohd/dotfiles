---
description: Review PR for code quality and test health
---

Review this PR for code quality and test health:

Code simplification:

Identify dead code, duplicate logic, or overly complex blocks that can be simplified or removed.
Test anti-patterns:

Tests that only mock dependencies and assert on mock interactions without exercising real behavior.
Tests that duplicate coverage of existing tests without adding new scenarios, branches, or edge cases.
Tests that are overly brittle (e.g., asserting exact internal call sequences) instead of asserting user-visible behavior or final state.
Tests that exist solely to satisfy coverage metrics and don't meaningfully protect against regressions.
For each finding: name the file and location, explain why it's an issue, and recommend whether to delete, simplify, or refactor.
