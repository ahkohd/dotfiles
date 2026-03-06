#!/usr/bin/env python3
"""Check status of background pi agent jobs."""

import json
import os
import subprocess
import sys

JOBS_FILE = "/tmp/task-runner-jobs.json"


def is_running(job_id):
    return subprocess.run(
        ["tmux", "has-session", "-t", job_id],
        capture_output=True,
    ).returncode == 0


def get_exit_status(job_id):
    exit_file = f"/tmp/{job_id}.exit"
    if os.path.exists(exit_file):
        code = open(exit_file).read().strip()
        return int(code) if code.isdigit() else -1
    return None


def capture_screen(job_id):
    result = subprocess.run(
        ["tmux", "capture-pane", "-t", job_id, "-p"],
        capture_output=True, text=True,
    )
    return result.stdout if result.returncode == 0 else None


if len(sys.argv) > 1:
    job_id = sys.argv[1]
    if is_running(job_id):
        print("STATUS: RUNNING")
        screen = capture_screen(job_id)
        if screen:
            print("---SCREEN---")
            print(screen)
    else:
        code = get_exit_status(job_id)
        if code is None:
            print("STATUS: DONE (no exit code recorded)")
        elif code == 0:
            print("STATUS: DONE (exit 0)")
        else:
            print(f"STATUS: CRASHED (exit {code})")
else:
    if not os.path.exists(JOBS_FILE):
        print("[]")
        sys.exit(0)

    with open(JOBS_FILE) as f:
        jobs = json.load(f)

    for j in jobs:
        if is_running(j["id"]):
            j["status"] = "running"
        else:
            code = get_exit_status(j["id"])
            if code is None:
                j["status"] = "done (no exit code)"
            elif code == 0:
                j["status"] = "done"
            else:
                j["status"] = f"crashed (exit {code})"

    print(json.dumps(jobs, indent=2))
