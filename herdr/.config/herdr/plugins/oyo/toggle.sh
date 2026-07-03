#!/usr/bin/env bash
set -uo pipefail
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

H="${HERDR_BIN_PATH:-herdr}"
ws="${HERDR_WORKSPACE_ID:-${HERDR_ACTIVE_WORKSPACE_ID:-}}"
pane="${HERDR_PANE_ID:-${HERDR_ACTIVE_PANE_ID:-}}"
cwd="${HERDR_ACTIVE_PANE_CWD:-}"

if [ -n "${HERDR_PLUGIN_CONTEXT_JSON:-}" ]; then
  [ -n "$ws" ] || ws=$(printf '%s' "$HERDR_PLUGIN_CONTEXT_JSON" | jq -r '.workspace_id // .workspace.workspace_id // .workspace.id // empty' 2>/dev/null)
  [ -n "$pane" ] || pane=$(printf '%s' "$HERDR_PLUGIN_CONTEXT_JSON" | jq -r '.focused_pane_id // .pane_id // .focused_pane.pane_id // empty' 2>/dev/null)
  [ -n "$cwd" ] || cwd=$(printf '%s' "$HERDR_PLUGIN_CONTEXT_JSON" | jq -r '.focused_pane_cwd // .workspace_cwd // .focused_pane.cwd // .workspace.cwd // empty' 2>/dev/null)
fi

[ -n "$ws" ] || exit 0

statedir="${HERDR_PLUGIN_STATE_DIR:-${TMPDIR:-/tmp}}"
mkdir -p "$statedir" 2>/dev/null
state="$statedir/pane-$ws"

if [ -f "$state" ]; then
  prev=$(cat "$state" 2>/dev/null)
  if [ -n "$prev" ] && "$H" pane list --workspace "$ws" 2>/dev/null |
    jq -e --arg p "$prev" '.result.panes[]? | select(.pane_id == $p)' >/dev/null 2>&1; then
    "$H" plugin pane close "$prev" >/dev/null 2>&1 || "$H" pane close "$prev" >/dev/null 2>&1
    rm -f "$state" 2>/dev/null
    exit 0
  fi
  rm -f "$state" 2>/dev/null
fi

if [ -z "$pane" ]; then
  pane=$("$H" pane list --workspace "$ws" 2>/dev/null | jq -r '.result.panes[0].pane_id // empty' 2>/dev/null)
fi
[ -n "$pane" ] || exit 0

cmd=("$H" plugin pane open --plugin "${HERDR_PLUGIN_ID:-local.oyo}" --entrypoint sidebar --placement split --target-pane "$pane" --direction right --no-focus)
[ -n "$cwd" ] && cmd+=(--cwd "$cwd")

new=$("${cmd[@]}" 2>/dev/null | jq -r '.result.plugin_pane.pane.pane_id // .result.pane.pane_id // empty' 2>/dev/null)
[ -n "$new" ] && printf '%s' "$new" > "$state"
