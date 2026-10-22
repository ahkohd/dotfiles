#!/usr/bin/env bash
# Read-only audit. History and activity must be explicitly scoped by the caller.
set -euo pipefail
exec python3 "$(cd "$(dirname "$0")" && pwd)/worktree-audit.py" "$@"
