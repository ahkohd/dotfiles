# Tool discovery

Read only the owning documentation needed for the task. These are entry points,
not an exhaustive inventory or a promise of access. Prefer installed skills and
live tool descriptions over examples from a different runtime or release.

| Capability | Where to look | What to establish |
| --- | --- | --- |
| General-purpose compute | The BB Box plugin's tools and skill; [project docs](https://github.com/moonstead/bb-box) | Suitable environments for implementation, reproduction, testing, QA, benchmarks, browsing or evidence capture. Discover available platforms, capacity, ownership, persistence and artifact transfer. |
| Context browsing and browser automation | The installed Playwriter skill and its current documentation; [project docs](https://playwriter.dev/docs) | Reuse the intended authenticated browser context when the task calls for it. Discover connection and session ownership rather than assuming a fresh browser has the user's login. |
| Browser debugging and instrumentation | Available browser tools and their documented CDP access | Inspect the actual target and protocol capabilities. Browser interaction, debugging and recording can overlap; choose by the task, not an exclusive product role. |
| Terminal and TUI interaction | The installed Pilotty skill or help; [project docs](https://github.com/msmps/pilotty) | Drive and observe an actual terminal session. Confirm the selected session and its lifecycle; do not confuse terminal control with browser authentication. |
| Visual context, evidence and handoff | The installed Mean skills and help; [agent docs](https://github.com/moonstead/Mean.app/tree/main/Resources/skills) | Capture and inspect screens, recordings, annotations, differences and timing evidence. Mean observes the app; pair it with a driver when interaction is needed. Respect capture consent and human handoff. |
| Linear issues and project tracking | The installed Linearis CLI's `usage` and domain-specific `usage`; [project docs](https://github.com/linearis-oss/linearis) and [owning skill](https://github.com/linearis-oss/linearis/tree/next/skills/linearis) | Confirm the organization, account, team and project, then resolve its approved private authentication. Consult current auth help for credential precedence; do not assume organization-switching flags or shared credentials across organizations. Scope reads and authorized changes to the intended workspace. |
| Persistent knowledge | Configured Writestead tools and their workflow guide; [project docs](https://github.com/ahkohd/writestead) | Find the relevant vault, search existing knowledge, ingest sources and make authorized, traceable updates. Follow the live guide for structure, validation and sync. |
| Agent email | Configured mail tools, including Postead when supplied, and their own documentation | Establish how to use the agent identities in SKILL.md, retrieve relevant messages and perform authorized sends. No Postead endpoint or API is inferred by this index. |

Do not transfer authenticated browser state to another machine or service merely
to make access convenient. Use supported access within the user's authorization.

## Sources and ownership

This is original guidance based on the user's stated workflow and the linked
projects' documentation, not copied third-party skill content. Identity policy
comes from the user. Tool behavior belongs to the owning project and the installed
runtime; resolve it there rather than preserving a second manual here.
