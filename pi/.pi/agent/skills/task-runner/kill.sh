#!/usr/bin/env python3
"""Kill a background pi agent job."""

import fcntl
import json
import os
import shlex
import subprocess
import sys

JOBS_FILE = "/tmp/task-runner-jobs.json"
LOCK_FILE = "/tmp/task-runner-jobs.lock"
REMOTE_PATH = "$HOME/.npm-packages/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

job_id = sys.argv[1] if len(sys.argv) > 1 else None
if not job_id:
    print("Usage: kill.sh <job-id>", file=sys.stderr)
    sys.exit(1)

lock = open(LOCK_FILE, "w")
fcntl.flock(lock, fcntl.LOCK_EX)

jobs = []
job = None
if os.path.exists(JOBS_FILE):
    with open(JOBS_FILE) as f:
        jobs = json.load(f)
    job = next((j for j in jobs if j.get("id") == job_id), None)

ssh = job.get("ssh") if job else None
cmd = ["zmx", "kill", job_id, "--force"]
if ssh:
    cmd = ["ssh", ssh, f'export PATH="{REMOTE_PATH}"; {shlex.join(cmd)}']
result = subprocess.run(cmd, capture_output=True)
print("killed zmx session" if result.returncode == 0 else "session already gone")

for suffix in ("exit", "heartbeat", "busy", "idle-ttl", "launch.sh", "done.sh", "mesh.log", "zmx.log", "relay.sh", "request.txt", "result.txt", "request.err"):
    path = f"/tmp/{job_id}.{suffix}"
    if ssh:
        subprocess.run(["ssh", ssh, "rm", "-f", path], capture_output=True)
    elif os.path.exists(path):
        os.remove(path)

if os.path.exists(JOBS_FILE):
    jobs = [j for j in jobs if j.get("id") != job_id]
    with open(JOBS_FILE, "w") as f:
        json.dump(jobs, f, indent=2)

print(f"removed {job_id}")
