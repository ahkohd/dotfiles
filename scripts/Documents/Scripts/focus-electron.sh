#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title focus electron
# @raycast.mode silent

# Optional parameters:
# @raycast.icon ⚛️

# Documentation:
# @raycast.author user_450f697d0d170e6ecd79
# @raycast.authorURL https://raycast.com/user_450f697d0d170e6ecd79

for process in "Electron" "Electron Dev"; do
    if killall -0 "$process" 2>/dev/null; then
        open -a "$process"
        exit 0
    fi
done
