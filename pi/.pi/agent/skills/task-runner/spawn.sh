#!/usr/bin/env python3
"""Spawn a background pi agent in tmux."""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time

SKILL_DIR = os.path.dirname(os.path.abspath(__file__))
JOBS_FILE = "/tmp/task-runner-jobs.json"
HOME = os.path.expanduser("~")

parser = argparse.ArgumentParser(description="Spawn a background pi agent")
parser.add_argument("model", help="Model to use (e.g. gpu0/qwen3.5-35b)")
parser.add_argument("cwd", help="Working directory")
parser.add_argument("task", help="Task message for the agent")
parser.add_argument("--tools", default="read,bash,edit,write", help="Comma-separated tool list")
parser.add_argument("--system-prompt", dest="system_prompt", help="System prompt file path")
parser.add_argument("--extensions", nargs="*", help="Extension paths")
args = parser.parse_args()

if args.extensions is None:
    args.extensions = [
        os.path.join(HOME, ".pi/agent/extensions/exa-search.ts"),
        os.path.join(HOME, ".pi/agent/extensions/exit.ts"),
    ]

job_id = f"task-{int(time.time())}-{os.getpid()}"
exit_file = f"/tmp/{job_id}.exit"

# Read exit instructions and append to task
exit_instructions_file = os.path.join(SKILL_DIR, "exit-instructions.md")
exit_instructions = ""
if os.path.exists(exit_instructions_file):
    with open(exit_instructions_file) as f:
        exit_instructions = "\n\n" + f.read().strip()

# Write task to temp file to avoid quoting issues
task_fd, task_file = tempfile.mkstemp(prefix="task-", suffix=".txt", dir="/tmp")
with os.fdopen(task_fd, "w") as f:
    f.write(args.task + exit_instructions)

# Build pi command
pi_cmd = f'pi --model "{args.model}" --tools "{args.tools}" --no-extensions'
for ext in args.extensions:
    pi_cmd += f" -e {ext}"
pi_cmd += " --no-skills --no-session"
if args.system_prompt:
    pi_cmd += f' --system-prompt "{args.system_prompt}"'

pi_cmd += ' "$(cat ' + task_file + ')"'

# Write launcher script
script_fd, script_file = tempfile.mkstemp(prefix="task-run-", suffix=".sh", dir="/tmp")
with os.fdopen(script_fd, "w") as f:
    f.write(f"""#!/bin/bash
cd "{args.cwd}"
{pi_cmd}
EXIT_CODE=$?
echo $EXIT_CODE > "{exit_file}"
if [ $EXIT_CODE -eq 0 ]; then
    osascript -e 'display notification "Agent finished successfully" with title "task-runner: {job_id}"' 2>/dev/null
else
    osascript -e "display notification \\"Agent crashed (exit $EXIT_CODE)\\" with title \\"task-runner: {job_id}\\"" 2>/dev/null
fi
rm -f "{task_file}" "{script_file}"
""")
os.chmod(script_file, 0o755)

# Launch in tmux
subprocess.run(["tmux", "new-session", "-d", "-s", job_id, script_file], check=True)

# Update state
jobs = []
if os.path.exists(JOBS_FILE):
    with open(JOBS_FILE) as f:
        jobs = json.load(f)

jobs.append({
    "id": job_id,
    "tmux_session": job_id,
    "model": args.model,
    "task": args.task,
    "cwd": args.cwd,
    "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
})

with open(JOBS_FILE, "w") as f:
    json.dump(jobs, f, indent=2)

print(job_id)
