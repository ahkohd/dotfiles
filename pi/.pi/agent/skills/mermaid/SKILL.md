---
name: mermaid
description: Render Mermaid diagrams to SVG/PNG using mmdr and validate with mmdr before finalizing.
---

# Mermaid Diagram Skill (mmdr)

Render Mermaid diagrams to SVG/PNG using `mmdr` -- a fast pure-Rust renderer.

## Quick Start

```bash
# From file
mmdr -i diagram.mmd -o diagram.svg
mmdr -i diagram.mmd -o diagram.png -e png

# From stdin
echo 'flowchart LR\n  A --> B' | mmdr -i - -o diagram.svg

# Pipe to stdout (SVG)
mmdr -i diagram.mmd
```

## Options

| Flag | Default | Description |
|------|---------|------------|
| `-i, --input` | | Input file (.mmd) or `-` for stdin |
| `-o, --output` | stdout | Output file (svg/png) |
| `-e, --outputFormat` | `svg` | `svg` or `png` |
| `-c, --configFile` | | Config JSON (Mermaid-like themeVariables) |
| `-w, --width` | `1200` | Width |
| `-H, --height` | `800` | Height |
| `--nodeSpacing` | | Node spacing |
| `--rankSpacing` | | Rank spacing |
| `--dumpLayout` | | Dump computed layout JSON |
| `--timing` | | Output timing info as JSON to stderr |
| `--fastText` | | Use fast approximate text metrics |

## Supported Diagram Types

Standard Mermaid syntax:
- `flowchart` (TB, LR, RL, BT)
- `sequenceDiagram`
- `classDiagram`
- `stateDiagram-v2`
- `erDiagram`
- `gantt`
- `pie`
- `gitgraph`

## Workflow

1. Write `.mmd` file with standard Mermaid syntax
2. Validate the diagram renders with `mmdr -i file.mmd -o file.svg` before finalizing
3. For docs, embed Mermaid directly in markdown (GitHub/editors render natively)
4. Only create `.mmd` and `.svg` artifacts when explicitly requested; otherwise just validate with `mmdr`
5. For exports, render to SVG/PNG with mmdr

## Config (themeVariables)

Pass a JSON config file with `-c` for custom theming:

```json
{
  "themeVariables": {
    "primaryColor": "#1e3a5f",
    "primaryTextColor": "#e5e5e5",
    "lineColor": "#4a9eed",
    "background": "#1e1e2e"
  }
}
```

## Tips

- Prefer embedding mermaid in markdown for docs (renders in GitHub, VS Code, etc.)
- Use mmdr for CI/CD exports or when you need raster output
- Always sanity-check new Mermaid diagrams by running `mmdr` to catch parser differences early
- Use `<br/>` in node labels for line breaks (avoid literal `\n` showing in rendered output)
- `--fastText` speeds up rendering at the cost of slightly less accurate text layout
- `--dumpLayout` is useful for debugging element positions
