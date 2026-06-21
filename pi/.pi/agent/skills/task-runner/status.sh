#!/usr/bin/env python3
"""Check status of background pi agent jobs."""

import fcntl
import json
import os
import shlex
import subprocess
import sys

JOBS_FILE = "/tmp/task-runner-jobs.json"
LOCK_FILE = "/tmp/task-runner-jobs.lock"
REMOTE_PATH = "$HOME/.npm-packages/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"


def read_jobs():
    if not os.path.exists(JOBS_FILE):
        return []
    lock = open(LOCK_FILE, "w")
    fcntl.flock(lock, fcntl.LOCK_SH)
    with open(JOBS_FILE) as f:
        return json.load(f)


def job_for(job_id):
    return next((j for j in read_jobs() if j.get("id") == job_id), None)


def run_job_cmd(job, args):
    cmd = args
    if job and job.get("ssh"):
        cmd = ["ssh", job["ssh"], f'export PATH="{REMOTE_PATH}"; {shlex.join(args)}']
    return subprocess.run(cmd, capture_output=True, text=True)


def is_running(job_id, job=None):
    result = run_job_cmd(job, ["zmx", "list", "--short"])
    return job_id in result.stdout.splitlines()


def get_exit_status(job_id, job=None):
    path = f"/tmp/{job_id}.exit"
    if job and job.get("ssh"):
        result = run_job_cmd(job, ["sh", "-lc", f"cat {path} 2>/dev/null"])
        raw = result.stdout.strip()
    else:
        raw = open(path).read().strip() if os.path.exists(path) else ""
    return int(raw) if raw.isdigit() else (None if not raw else -1)


def capture_screen(job_id, job=None):
    result = run_job_cmd(job, ["zmx", "history", job_id])
    if result.returncode != 0:
        return None
    return "\n".join(result.stdout.splitlines()[-200:])


if len(sys.argv) > 1:
    job_id = sys.argv[1]
    job = job_for(job_id)
    if is_running(job_id, job):
        where = f" on {job['ssh']}" if job and job.get("ssh") else ""
        print(f"STATUS: RUNNING{where}")
        screen = capture_screen(job_id, job)
        if screen:
            print("---SCREEN---")
            print(screen)
    else:
        code = get_exit_status(job_id, job)
        if code is None:
            print("STATUS: DONE (no exit code recorded)")
        elif code == 0:
            print("STATUS: DONE (exit 0)")
        else:
            print(f"STATUS: CRASHED (exit {code})")
else:
    jobs = read_jobs()
    if not jobs:
        print("[]")
        sys.exit(0)

    for j in jobs:
        if is_running(j["id"], j):
            j["status"] = "running"
        else:
            code = get_exit_status(j["id"], j)
            if code is None:
                j["status"] = "done (no exit code)"
            elif code == 0:
                j["status"] = "done"
            else:
                j["status"] = f"crashed (exit {code})"

    print(json.dumps(jobs, indent=2))
