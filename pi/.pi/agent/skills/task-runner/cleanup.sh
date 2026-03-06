#!/usr/bin/env python3
"""Remove all finished jobs from state."""

import json
import os
import subprocess

JOBS_FILE = "/tmp/task-runner-jobs.json"

if not os.path.exists(JOBS_FILE):
    print("no jobs")
    raise SystemExit(0)

with open(JOBS_FILE) as f:
    jobs = json.load(f)

kept = []
removed = 0

for j in jobs:
    running = subprocess.run(
        ["tmux", "has-session", "-t", j["id"]],
        capture_output=True,
    ).returncode == 0

    if running:
        kept.append(j)
    else:
        # Clean up exit file
        exit_file = f"/tmp/{j['id']}.exit"
        if os.path.exists(exit_file):
            os.remove(exit_file)
        removed += 1
        print(f"cleaned: {j['id']}")

with open(JOBS_FILE, "w") as f:
    json.dump(kept, f, indent=2)

print(f"removed {removed}, kept {len(kept)}")
