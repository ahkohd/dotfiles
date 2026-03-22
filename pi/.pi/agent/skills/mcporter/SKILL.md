---
name: mcporter
description: Call MCP servers from pi via MCPorter CLI. Use when a skill or task needs to interact with an MCP server. Provides install instructions, config, and calling conventions.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# MCPorter — MCP Bridge for Pi

MCPorter lets you call any MCP server from pi via CLI. Skills that depend on MCP servers should reference this skill first.

## Check / Install

```bash
which mcporter >/dev/null 2>&1 && mcporter --version || echo "NOT INSTALLED"
```

If not installed:

```bash
npm install -g mcporter
```

## Configuration

MCPorter auto-discovers MCP servers from Claude, Cursor, Codex, Windsurf, OpenCode, and VS Code configs.

To add a server manually:

```bash
# HTTP/SSE server
mcporter config add <name> --http-url <url>

# Stdio server
mcporter config add <name> --stdio "<command>"
```

Config files:
- Project: `config/mcporter.json`
- Global: `~/.mcporter/mcporter.json`

## Calling Tools

```bash
# List available servers
mcporter list

# List tools on a server
mcporter list <server>

# Call a tool
mcporter call <server>.<tool> key=value key2=value2

# Function-call style
mcporter call '<server>.<tool>(arg1: "value", arg2: "value")'
```

## Usage in Pi

Call via bash tool:

```bash
mcporter call sentry.list_issues project=my-app status=unresolved
```

Or for tools that return images:

```bash
mcporter call chrome-devtools.take_snapshot --save-images /tmp/
```

Then `read /tmp/<image>.png` to view.

## OAuth Servers

Some MCP servers require OAuth (Vercel, Linear, Sentry). Authenticate once:

```bash
mcporter auth <server>
```

Tokens are cached at `~/.mcporter/<server>/`.

## Notes

- MCPorter handles connection pooling, OAuth refresh, and transport management
- Supports HTTP, SSE, and stdio transports
- Auto-corrects tool name typos
- Add `--json` for machine-readable output
- Add `--raw` for unformatted output
