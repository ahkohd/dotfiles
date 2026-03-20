#!/usr/bin/env bash
# Patch pi spinner frames — run after every pi update
# Usage: bash loader.sh [worm|police]

LOADER=$(find ~/.nvm/versions/node/*/lib/node_modules/@mariozechner/pi-coding-agent/node_modules/@mariozechner/pi-tui/dist/components/loader.js 2>/dev/null | head -1)

if [ -z "$LOADER" ]; then
  echo "loader.js not found"
  exit 1
fi

STYLE="${1:-police}"

case "$STYLE" in
  worm)
    FRAMES='["⡇ ", "⣿ ", "⣿⡇", "⣿⣿", "⢸⣿", " ⣿", " ⢸", " ⢸", " ⣿", "⢸⣿", "⣿⣿", "⣿⡇", "⣿ ", "⡇ ", "⡇ "]'
    ;;
  police)
    FRAMES='["⡇⢸", "⡇⢸", "⣿⣿", "⣿⣿", "⢸⡇", "⢸⡇", "⣿⣿", "⣿⣿", "⡇⢸", "⡇⢸"]'
    ;;
  *)
    echo "Unknown style: $STYLE"
    echo "Available: worm, police"
    exit 1
    ;;
esac

sed -i "s/frames = \[.*\]/frames = $FRAMES/" "$LOADER"

echo "Spinner patched: $STYLE"
