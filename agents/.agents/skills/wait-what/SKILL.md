---
name: wait-what
description: "Stop. That last message did not land: re-pitch it."
disable-model-invocation: true
---

# Re-pitch the last answer

Stop the current explanation. Explain the last answer again.

- Start with one sentence that states the current situation.
- Add enough background to explain how you got there.
- Say what changed, what it means, and what the user can do next.
- Keep all important facts, limits, and warnings.
- Use ASD-STE100 Simplified Technical English: use short sentences, common words, active voice, and one idea per sentence.
- Define a technical term before you use it when a simpler term will not work.

Use the project's established terms:

1. If `CONTEXT-MAP.md` exists in the project root, read it and follow it to the relevant `CONTEXT.md` file.
2. Otherwise, use the `CONTEXT.md` file nearest to the files under discussion, if one exists.
3. If neither file exists, use terms from the current conversation and project documentation.

`CONTEXT.md` is an optional project glossary. Do not create or change context files unless the user asks.
