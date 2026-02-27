---
name: paper-design
description: Interact with Paper.design canvas via its local MCP server. Use when the user asks to create, edit, inspect, or export designs in Paper. Provides tools to read the canvas, write HTML into it, take screenshots, manage artboards, and more.
---

# Paper Design

Paper is a professional design tool with an HTML/CSS canvas. Its desktop app runs a local MCP server that gives you full read/write access to the canvas.

## Calling Paper Tools

Use the helper script. Session management is automatic.

```bash
paper.py <tool_name> ['{ json args }']
```

The script is at: `~/.pi/agent/skills/paper-design/paper.py`

### Examples

```bash
paper.py get_basic_info
paper.py get_selection
paper.py get_node_info '{"nodeId":"1-0"}'
paper.py get_children '{"nodeId":"1-0"}'
paper.py get_tree_summary '{"nodeId":"1-0","depth":3}'
paper.py get_computed_styles '{"nodeIds":["1-0","2-0"]}'
paper.py get_font_family_info '{"familyNames":["Inter"]}'
paper.py get_jsx '{"nodeId":"1-0","format":"tailwind"}'
paper.py create_artboard '{"name":"Login","styles":{"width":"390px","height":"844px","backgroundColor":"#fff"}}'
paper.py write_html '{"html":"<div style=\"padding:20px\">Hello</div>","targetNodeId":"1-0","mode":"insert-children"}'
paper.py set_text_content '{"updates":[{"nodeId":"3-0","textContent":"New text"}]}'
paper.py update_styles '{"updates":[{"nodeIds":["3-0"],"styles":{"color":"#ff0000"}}]}'
paper.py delete_nodes '{"nodeIds":["3-0"]}'
paper.py duplicate_nodes '{"nodes":[{"id":"2-0"}]}'
paper.py rename_nodes '{"updates":[{"nodeId":"2-0","name":"Hero"}]}'
paper.py finish_working_on_nodes
```

### Screenshots

Screenshots auto-decode to a file. Use `read` to view:

```bash
paper.py get_screenshot '{"nodeId":"1-0"}'          # saves to /tmp/paper-screenshot.jpg
paper.py get_screenshot '{"nodeId":"1-0","scale":2}' # 2x for fine detail
```

Then `read /tmp/paper-screenshot.jpg` to see it.

Pass a third argument to change the output path:

```bash
paper.py get_screenshot '{"nodeId":"1-0"}' /tmp/my-shot.jpg
```

### Session Reset

If Paper restarts, delete the cached session:

```bash
rm /tmp/paper-mcp-session
```

## Available Tools

### Read Tools

| Tool | Description | Arguments |
|------|-------------|-----------|
| `get_basic_info` | File name, page, artboards, fonts, node count | `{}` |
| `get_selection` | Currently selected nodes with IDs, names, sizes | `{}` |
| `get_node_info` | Detailed info for a node (size, visibility, children, text) | `{"nodeId": "..."}` |
| `get_children` | Direct children of a node | `{"nodeId": "..."}` |
| `get_tree_summary` | Compact indented hierarchy of a subtree | `{"nodeId": "...", "depth": 3}` |
| `get_screenshot` | Screenshot of a node as base64 image | `{"nodeId": "...", "scale": 1}` |
| `get_jsx` | JSX/code representation of a node tree | `{"nodeId": "...", "format": "tailwind"}` |
| `get_computed_styles` | CSS styles for nodes (batch) | `{"nodeIds": ["...", "..."]}` |
| `get_fill_image` | Extract image fill data from a node | `{"nodeId": "..."}` |
| `get_font_family_info` | Check font availability and weights | `{"familyNames": ["Inter", "..."]}` |
| `get_guide` | Read detailed guides (e.g. "figma-import") | `{"topic": "figma-import"}` |

### Write Tools

| Tool | Description | Arguments |
|------|-------------|-----------|
| `write_html` | Write HTML into the design as nodes | `{"html": "...", "targetNodeId": "...", "mode": "insert-children"}` |
| `create_artboard` | Create a new artboard | `{"name": "...", "styles": {"width": "1440px", "height": "900px"}}` |
| `delete_nodes` | Delete nodes and descendants | `{"nodeIds": ["..."]}` |
| `set_text_content` | Update text content (batch) | `{"updates": [{"nodeId": "...", "textContent": "..."}]}` |
| `rename_nodes` | Rename layers (batch) | `{"updates": [{"nodeId": "...", "name": "..."}]}` |
| `update_styles` | Update CSS styles on nodes (batch) | `{"updates": [{"nodeIds": ["..."], "styles": {"backgroundColor": "#fff"}}]}` |
| `duplicate_nodes` | Deep-clone nodes | `{"nodes": [{"id": "...", "parentId": "..."}]}` |
| `finish_working_on_nodes` | Release working indicator | `{}` or `{"nodeIds": ["..."]}` |

### write_html Details

Two modes:
- `"insert-children"` — parse HTML and add as children of the target node
- `"replace"` — remove the target node, insert parsed HTML in its place

HTML rules:
- Always use **inline styles** (`style="..."`)
- Use `display: flex` for layout. Flexbox, padding, and gap are the core tools.
- All Google Fonts available via `font-family: "Font Name"`. Local fonts also supported.
- All CSS color formats: hex, rgb, rgba, hsl, hsla, oklch, oklab.
- Absolute positioning supported for decorative/overlay elements.
- **Do NOT** use `display: inline`, `display: grid`, margins, or HTML tables.
- Use `<pre>` or `white-space: pre` for code blocks.
- Do NOT use emojis as icons — use SVG or placeholder images.
- Set `layer-name="..."` attribute for semantic layer names.
- Clone existing nodes with `<x-paper-clone node-id="A-01" style="..." />`

### Default Artboard Sizes

| Device | Size |
|--------|------|
| Desktop | 1440 × 900px |
| Tablet | 768 × 1024px |
| Mobile | 390 × 844px |

## Workflow

1. **Start with context**: Call `get_basic_info` to understand the file.
2. **Check selection**: Use `get_selection` to see what the user is focused on.
3. **Explore hierarchy**: Use `get_tree_summary` for structure, `get_children` for direct children, `get_node_info` for details.
4. **Visual understanding**: Use `get_screenshot` at 1x scale. Only use scale=2 for reading small text.
5. **Code generation**: Use `get_jsx` for component structure.
6. **Style details**: Use `get_computed_styles` with multiple nodeIds to batch.

### Writing New Designs

1. Generate a design brief:
   - Color palette (5-6 hex values with roles)
   - Type choices (font, weight, size scale)
   - Spacing rhythm (section, group, element gaps)
   - One sentence visual direction
2. **Check fonts first**: Call `get_font_family_info` before writing typographic styles.
3. Create artboard with `create_artboard`.
4. **Write small, write often.** Each `write_html` call = ONE visual group (a header, a single list row, a button bar, a card shell). Never batch an entire component.
5. Use `duplicate_nodes` + `update_styles` + `set_text_content` when more efficient than writing more HTML.
6. **MANDATORY**: Call `finish_working_on_nodes` when done.

### Editing Existing Designs

1. Update in small pieces — one visual group per tool call.
2. **MANDATORY**: Call `finish_working_on_nodes` when done.

## Review Checkpoints — MANDATORY

You MUST NOT make more than 2-3 modifications without calling `get_screenshot` to evaluate. Check:

- **Spacing**: Uneven gaps, cramped groups, empty areas. Clear visual rhythm?
- **Typography**: Text too small, poor line-height, weak heading/body/caption hierarchy.
- **Contrast**: Low contrast text, elements blending into background, uniform color.
- **Alignment**: Elements that should share lanes but don't. Misaligned icons/actions across rows.
- **Clipping**: Content cut off at edges. Fix with `update_styles` setting overflowing dimension to `"fit-content"`.
- **Repetition**: Grid-like sameness — vary scale, weight, spacing for visual interest.

Summarize each checkpoint in one line. Fix issues before moving on.

## Design Quality

- **Minimalist**: fewer elements, refined ideas. Default to removal over addition.
- **White space** is a feature. Vary spacing deliberately.
- **Typography**: Swiss editorial print inspired. Maximize contrast between display and label weights. Pair heavy display with light labels. Tighter tracking on large type, open tracking on small caps.
- **Color**: One intense color moment > five. Build from neutrals first (off-white, near-black, muted mid-tones). No pure black or pure gray body text.
- **Text contrast is non-negotiable**. Extra attention to text below 16px. Avoid text below 12px unless high-density UI or all-caps stylistic.
- **Light mode** default unless requested otherwise.
- Use realistic placeholder content. Use Paper (not Figma/Sketch) as example design software.
- Use `px` for font sizes, `em` for letter spacing, `px` for line height.
- When building repeated rows, use fixed-width slots for consistent vertical lanes.

### Vertical Lane Alignment

When building repeated rows (lists, tables, nav items), elements must form consistent vertical lanes. Use fixed-width slots (with width and flexShrink: 0) for icons, indicators, actions — even when empty in some rows. After building 3+ similar rows, screenshot and verify vertical alignment.
