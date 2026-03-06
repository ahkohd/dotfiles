#!/usr/bin/env python3
"""Kill a background pi agent job."""

import json
import os
import subprocess
import sys

JOBS_FILE = "/tmp/task-runner-jobs.json"

job_id = sys.argv[1] if len(sys.argv) > 1 else None
if not job_id:
    print("Usage: kill.sh <job-id>", file=sys.stderr)
    sys.exit(1)

result = subprocess.run(["tmux", "kill-session", "-t", job_id], capture_output=True)
print("killed tmux session" if result.returncode == 0 else "session already gone")

if os.path.exists(JOBS_FILE):
    with open(JOBS_FILE) as f:
        jobs = json.load(f)
    jobs = [j for j in jobs if j["id"] != job_id]
    with open(JOBS_FILE, "w") as f:
        json.dump(jobs, f, indent=2)

# Clean up exit file
exit_file = f"/tmp/{job_id}.exit"
if os.path.exists(exit_file):
    os.remove(exit_file)

print(f"removed {job_id}")
