# Where this came from, and how it is wired

`SKILL.md` and everything in `references/` is **Apple's** material, extracted from
Xcode 27 beta 4. Not written here, not rewritten — copied verbatim, because the
wording is tuned for retrieval and paraphrasing would only degrade it.

Source: <https://github.com/ahkohd/xcode-27-system-prompts>, a fork of
`artemnovichkov/xcode-27-system-prompts`. Files used:
`c-bounds-safety.idechatprompttemplate` and the nine
`c-bounds-safety-ref-*.md.packaged` files.

## Layout

Lives in the cross-harness hub with everything else, reached by symlink from both
agents:

    ~/.claude/skills/c-bounds-safety    -> ../../.agents/skills/c-bounds-safety
    ~/.pi/agent/skills/c-bounds-safety  -> ../../../../../.agents/skills/c-bounds-safety

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
