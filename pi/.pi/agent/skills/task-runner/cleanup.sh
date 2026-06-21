#!/usr/bin/env python3
"""Remove all finished jobs from state."""

import fcntl
import json
import os
import shlex
import subprocess

JOBS_FILE = "/tmp/task-runner-jobs.json"
LOCK_FILE = "/tmp/task-runner-jobs.lock"
REMOTE_PATH = "$HOME/.npm-packages/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

lock = open(LOCK_FILE, "w")
fcntl.flock(lock, fcntl.LOCK_EX)

if not os.path.exists(JOBS_FILE):
    print("no jobs")
    raise SystemExit(0)

with open(JOBS_FILE) as f:
    jobs = json.load(f)

kept = []
removed = 0

for j in jobs:
    job_id = j["id"]
    ssh = j.get("ssh")
    cmd = ["zmx", "list", "--short"]
    if ssh:
        cmd = ["ssh", ssh, f'export PATH="{REMOTE_PATH}"; {shlex.join(cmd)}']
    result = subprocess.run(cmd, capture_output=True, text=True)
    running = job_id in result.stdout.splitlines()

    if running:
        kept.append(j)
        continue

    for suffix in ("exit", "heartbeat", "busy", "idle-ttl", "launch.sh", "done.sh", "mesh.log", "zmx.log", "relay.sh", "request.txt", "result.txt", "request.err"):
        path = f"/tmp/{job_id}.{suffix}"
        if ssh:
            subprocess.run(["ssh", ssh, "rm", "-f", path], capture_output=True)
        elif os.path.exists(path):
            os.remove(path)
    removed += 1
    print(f"cleaned: {job_id}")

with open(JOBS_FILE, "w") as f:
    json.dump(kept, f, indent=2)

print(f"removed {removed}, kept {len(kept)}")
