# Where this came from

`references/` is **Apple's** documentation, taken verbatim from the
`AdditionalDocumentation/` folder of
<https://github.com/ahkohd/xcode-27-system-prompts> (a fork of
`artemnovichkov/xcode-27-system-prompts`), extracted from Xcode 27 beta 4.

`SKILL.md` is **not** Apple's — Xcode ships these as loose documents with no
template, so the frontmatter and the reference index were written here to make
them addressable as a skill.

## Layout

Lives in the cross-harness hub with everything else, reached by symlink from both
agents:

    ~/.claude/skills/agent-prompt-design    -> ../../.agents/skills/agent-prompt-design
    ~/.pi/agent/skills/agent-prompt-design  -> ../../../../../.agents/skills/agent-prompt-design

## Attribution

`SKILL.md` and `references/` are Apple's, not ours. The dotfiles repo is public,
so this is committed and published there — a deliberate choice, made knowing the
upstream repo carries no licence and that a fork copies files rather than rights.
Keep this file with the skill: attribution is the least that should travel with it.

## Converting the others

Xcode's coding tools are structurally identical to Claude skills — YAML
frontmatter with `name` and `description`, an instruction body, and a
`# References` section whose files load on demand. The conversion is mechanical:

    <tool>.idechatprompttemplate      ->  SKILL.md
    <tool>-ref-<topic>.md.packaged    ->  references/<topic>.md

The packaged files need no editing. They already cross-reference each other by
bare filename (`dataflow.md`), which is exactly what `references/` provides.

Worth converting for a macOS SwiftUI app: `swiftui-whats-new-27` (nine refs) and
possibly `audit-xcode-security-settings` (sixteen refs and a Python script,
covering hardened runtime and entitlements). Not worth it:
`uikit-app-modernization` is iOS-only, and both `c-bounds-safety` variants are
for C.
