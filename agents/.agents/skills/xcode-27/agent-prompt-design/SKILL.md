---
name: agent-prompt-design
description: >-
  Apple's complete prompt stack for Xcode 27's coding agent, as shipped. Consult
  when designing or reviewing agent prompts, tool descriptions, planner/executor
  splits, edit-application strategies, or context-window assembly — this is a
  production system's actual wording, not advice about prompting. Covers: planner
  and executor system prompts (including a GPT-5-specific variant and a
  no-classify variant), reasoning vs non-reasoning variants, tool-assisted
  variants, an A/B test pair, three edit integrators (standard, new-code,
  fast-apply), retrieval query expansion, and the fourteen fragments used to
  frame current file, selection, snippets, issues and search results.
---

Everything Xcode 27 sends to a model, extracted from the shipping app. Useful as
evidence rather than opinion: when deciding how to word a tool description or
split planning from execution, read what a team with real usage data actually
shipped.

Nothing here should be installed as an agent's own system prompt. It is reference
material for writing prompts, not a prompt to adopt.

# References

## Agent architecture

- `references/PlannerExecutorStylePlannerSystemPrompt.md`: the planner half of a
  planner/executor split — the largest and most instructive file here.
- `references/PlannerExecutorStylePlannerSystemPrompt-gpt_5.md`: the same planner
  retargeted at GPT-5. Diff the two to see what a team changes per model.
- `references/PlannerExecutorStyleNoClassify.md`: the variant that skips the
  classification step.
- `references/AgentSystemPromptAddition.md`: what is appended when running in agent
  mode rather than chat.
- `references/AgentAdditionalContext.md`: extra context supplied to the agent.
- `references/AgentVersions.plist`: the agent backends Xcode bundles — Claude Code
  and Codex, pinned by version, URL and checksum.

## System prompt variants

- `references/BasicSystemPrompt.md` and
  `references/ToolAssistedBasicSystemPrompt.md`: the baseline, with and without
  tools.
- `references/ReasoningSystemPrompt.md` and
  `references/ToolAssistedReasoningSystemPrompt.md`: the reasoning-model versions.
- `references/VariantASystemPrompt.md` and `references/VariantBSystemPrompt.md`: an
  A/B pair. The differences are the interesting part.
- `references/TextEditorToolSystemPrompt.md`: the prompt for the text-editor tool.

## Applying edits

Three strategies for turning a model's output into a file change:

- `references/IntegratorSystemPrompt.md`, `references/IntegratorUserPrompt.md`
- `references/NewCodeIntegratorSystemPrompt.md`,
  `references/NewCodeIntegratorUserPrompt.md`
- `references/FastApplyIntegratorSystemPrompt.md`,
  `references/FastApplyIntegratorUserPrompt.md`

## Response guidelines

- `references/InQueryShortGuidelines.md`,
  `references/InQueryDetailedGuidelines.md`
- `references/ToolAssistedInQueryShortGuidelines.md`,
  `references/ToolAssistedInQueryDetailedGuidelines.md`

## Retrieval and chrome

- `references/InstructionEmbeddingsQueryExpansion.md`,
  `references/LocalInfillEmbeddingsQueryExpansion.md`: query expansion before
  embedding search.
- `references/ChatTitleResolver.md`: naming a conversation.
- `references/PromptSuggestionGenerator.md`: generating follow-up suggestions.

## Context assembly

Small fragments that frame each piece of context. Read together, they show how one
team budgets a context window:

`AdditionalFiles`, `ContextItems`, `CurrentFile`, `CurrentFileAbbreviated`,
`CurrentFileName`, `CurrentSelection`, `Interfaces`, `Issues`, `NewKnowledge`,
`NoSelection`, `OriginalFile`, `Query`, `SearchResults`, `Snippets` — each
`references/<name>.md`.

## Single-purpose tools

Short task prompts, useful mainly as examples of how terse a working tool prompt
can be:

- `references/CodingToolTemplateDocument.md`, `references/GenerateDocumentation.md`
- `references/CodingToolTemplateExplain.md`
- `references/CodingToolTemplateGeneratePreview.md`,
  `references/GeneratePreview.md`
- `references/CodingToolTemplateGeneratePlayground.md`,
  `references/GeneratePlayground.md`
