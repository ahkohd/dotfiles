#!/usr/bin/env bash
TMUX_BIN=$(command -v tmux || echo "/Users/var/.nix-profile/bin/tmux")

target=$($TMUX_BIN list-panes -a \
  -F "#{session_name}:#{window_index}.#{pane_index} #{window_name}/#{pane_current_command} #{pane_current_path}" \
  | fzf --prompt="jump> " --reverse)

[ -z "$target" ] && exit 0

$TMUX_BIN switch-client -t "$(echo "$target" | awk '{print $1}')"
