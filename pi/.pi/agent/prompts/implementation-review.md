---
description: Full implementation review
---

Please review this pull request and provide feedback on:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security concerns
- Test coverage
Be constructive and helpful in your feedback. Only mention high quality feedback, don't write unnecessary words. Be concise, assume the reader is a smart software engineer.
Skip sections if there is nothing meaningful to add, don't write generic sentences obvious to a good developer. Your primary responsibility is minimizing the chance of subtle
bugs and issues. Your secondary responsibilities are - helping with code craftmanship, performance, security concerns and tests.
You're only to create three sections - "TLDR", "Bugs and Issues" and "Other comments". TLDR should be max 3 lines summary of the what and why of the PR. Skip this for smaller PRs.
Bugs and issues should point out any high severity bugs- be practical, don't get too pedantic or worrying about hypotheticals.
Everything other than issues should be grouped in the section "Other Comments". The rule for this section is: ONLY WRITE ACTIONABLE ITEMS. The only exception is: you can write ONE BULLET POINT listing all the good things you see that don't require any action, for example:
- Great test coverage and type safety, nice separation of concerns, correct Temporal workflow setup
Other parts of "Other Comments" should be dedicated to things that don't rise to the level of "high severity", specifically: medium severity actionables. Skip low severity items.
If there is no signficant change, or you've nothing meaningful to comment, just say "LGTM", don't write words for the sake of writing them. I want your every sentence to have EXTREMELY high SNR, and don't want to waste time reading generic phrases I already know. This is very important, I want you to be concise and skip writing anything which doesn't lead to a clear actionable.
A few other points to keep in mind while reviewing -
- Detect potential memory leaks, inefficient memory usage, or CPU throttling issues in the code that might cause performance degradation under load. Flag expensive loops, unbounded data structures, or blocking calls that can starve CPU.
- Identify database-performance risks and query issues: potential N+1 patterns, missing indexes, unbounded scans, long transactions/locks, unsafe isolation usage, non-parameterized or injection-prone queries, inefficient ORM usage or cause load spikes.
- Ensure that tests are meaningful, follow best practices and not only for the sake of coverage.
- Point out overly big functions and entities. If there is too much nesting, or high cyclomatic complexity point it out. Code should be easy to read and understand without high cognitive load.
- Flag raw index access on data structures where typed abstractions exist. Prefer semantic accessors over positional indexing.
- Flag unnecessary comments, redundant type imports, and AI-generated boilerplate.
