---
name: paper-design
description: Interact with Paper.design canvas via its local MCP server. Use when the user asks to create, edit, inspect, or export designs in Paper.
dependencies:
  - mcporter
---

# Paper Design

Paper is a professional design tool with an HTML/CSS canvas. Its desktop app runs a local MCP server.

> **Prerequisite:** This skill requires MCPorter. Read the [mcporter skill](../mcporter/SKILL.md) first to ensure it's installed.

## Discover Tools

```bash
mcporter list paper
```

## Call Tools

```bash
mcporter call paper.<tool_name> key=value
```

### Screenshots

```bash
mcporter call paper.get_screenshot nodeId=1-0 --save-images /tmp/
```

Then `read /tmp/paper-screenshot.jpg` to view.

## write_html Rules

- Always use **inline styles** (`style="..."`)
- Use `display: flex` for layout. Flexbox, padding, and gap are the core tools.
- All Google Fonts available via `font-family: "Font Name"`.
- All CSS color formats: hex, rgb, rgba, hsl, hsla, oklch, oklab.
- Absolute positioning supported for decorative/overlay elements.
- **Do NOT** use `display: inline`, `display: grid`, margins, or HTML tables.
- Use `<pre>` or `white-space: pre` for code blocks.
- Do NOT use emojis as icons — use SVG or placeholder images.
- Set `layer-name="..."` attribute for semantic layer names.
- Clone existing nodes with `<x-paper-clone node-id="A-01" style="..." />`
- Two modes: `"insert-children"` (add as children) or `"replace"` (swap node)

### Default Artboard Sizes

| Device | Size |
|--------|------|
| Desktop | 1440 × 900px |
| Tablet | 768 × 1024px |
| Mobile | 390 × 844px |

## Workflow

1. **Start with context**: Call `get_basic_info` to understand the file.
2. **Check selection**: Use `get_selection` to see what the user is focused on.
3. **Explore hierarchy**: Use `get_tree_summary` for structure.
4. **Visual understanding**: Use `get_screenshot` at 1x scale. Only use scale=2 for reading small text.
5. **Code generation**: Use `get_jsx` for component structure.
6. **Style details**: Use `get_computed_styles` with multiple nodeIds to batch.

### Writing New Designs

1. Generate a design brief: color palette, type choices, spacing rhythm, visual direction.
2. **Check fonts first**: Call `get_font_family_info` before writing typographic styles.
3. Create artboard with `create_artboard`.
4. **Write small, write often.** Each `write_html` call = ONE visual group.
5. Use `duplicate_nodes` + `update_styles` + `set_text_content` when more efficient.
6. **MANDATORY**: Call `finish_working_on_nodes` when done.

### Editing Existing Designs

1. Update in small pieces — one visual group per tool call.
2. **MANDATORY**: Call `finish_working_on_nodes` when done.

## Review Checkpoints — MANDATORY

You MUST NOT make more than 2-3 modifications without calling `get_screenshot` to evaluate. Check:

- **Spacing**: Uneven gaps, cramped groups, empty areas.
- **Typography**: Text too small, poor line-height, weak hierarchy.
- **Contrast**: Low contrast text, elements blending into background.
- **Alignment**: Elements that should share lanes but don't.
- **Clipping**: Content cut off at edges. Fix with `update_styles` setting overflowing dimension to `"fit-content"`.
- **Repetition**: Grid-like sameness — vary scale, weight, spacing.

Fix issues before moving on.

## Design Quality

- **Minimalist**: fewer elements, refined ideas. Default to removal over addition.
- **White space** is a feature. Vary spacing deliberately.
- **Typography**: Swiss editorial print inspired. Maximize contrast between display and label weights.
- **Color**: One intense color moment > five. Build from neutrals first.
- **Text contrast is non-negotiable**. Extra attention to text below 16px.
- **Light mode** default unless requested otherwise.
- Use realistic placeholder content.
- When building repeated rows, use fixed-width slots for consistent vertical lanes.
