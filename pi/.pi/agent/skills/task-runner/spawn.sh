#!/usr/bin/env python3
"""Spawn a mesh task-runner agent, then send it a task."""

import argparse
import fcntl
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time

JOBS_FILE = "/tmp/task-runner-jobs.json"
LOCK_FILE = "/tmp/task-runner-jobs.lock"
SKILL_DIR = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.expanduser("~")
REMOTE_PATH = "$HOME/.npm-packages/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

parser = argparse.ArgumentParser(description="Spawn a background pi agent")
parser.add_argument("model", help="Model to use, e.g. ollama-victor/glm-5.2:cloud")
parser.add_argument("cwd", help="Working directory")
parser.add_argument("task", help="Task message for the agent")
parser.add_argument("--reply-to", help="Mesh agent alias or id to receive the result")
parser.add_argument("--ssh", help="Spawn on remote SSH host, e.g. user@host")
parser.add_argument("--peer", help="Local pi-mesh service address for remote workers")
parser.add_argument("--reuse", action="store_true", help="Reuse an owned worker for follow-up tasks")
parser.add_argument("--idle-ttl", type=int, default=600, help="Reuse-only idle seconds before exit; 0 disables")
parser.add_argument("--no-mesh", action="store_true", help="Legacy mode: run task directly without pi-mesh")
parser.add_argument("--tools", default="read,bash,edit,write", help="Comma-separated tool list")
parser.add_argument("--system-prompt", dest="system_prompt", help="System prompt text")
parser.add_argument("--name", help="Session display name for a new worker")
parser.add_argument("--job-id", help="zmx session name for a new worker")
parser.add_argument("--startup-timeout", type=float, default=20.0, help="Seconds to wait for mesh registration")
parser.add_argument("--request-timeout", type=int, default=3600, help="Seconds to wait for a fresh worker result")
parser.add_argument("--ready-delay", type=float, default=3.0, help="Seconds to wait after fresh worker registers before sending task")
parser.add_argument("--extensions", nargs="*", help="Extension paths for legacy no-mesh mode")
args = parser.parse_args()

if not args.no_mesh and not args.reply_to:
    parser.error("--reply-to is required unless --no-mesh")
if args.no_mesh and args.ssh:
    parser.error("--ssh requires mesh mode")
if args.idle_ttl < 0:
    parser.error("--idle-ttl must be >= 0")
if args.request_timeout < 1:
    parser.error("--request-timeout must be >= 1")
if args.ready_delay < 0:
    parser.error("--ready-delay must be >= 0")
if args.job_id and not re.fullmatch(r"[A-Za-z0-9._-]{1,80}", args.job_id):
    parser.error("--job-id must be 1-80 chars: A-Za-z0-9._-")

if args.extensions is None:
    args.extensions = [
        os.path.join(HOME, ".pi/agent/extensions/exa-search.ts"),
        os.path.join(HOME, ".pi/agent/extensions/exit.ts"),
    ]


def now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def acquire_jobs_lock():
    lock = open(LOCK_FILE, "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    return lock


def require_local(cmd):
    if not shutil.which(cmd):
        print(f"missing local command: {cmd}", file=sys.stderr)
        sys.exit(2)


def sidecar(job_id, suffix):
    return f"/tmp/{job_id}.{suffix}"


def new_job_id():
    return args.job_id or f"task-{int(time.time())}-{os.getpid()}"


def load_jobs():
    if not os.path.exists(JOBS_FILE):
        return []
    try:
        with open(JOBS_FILE) as f:
            return json.load(f)
    except Exception:
        return []


def save_jobs(jobs):
    with open(JOBS_FILE, "w") as f:
        json.dump(jobs, f, indent=2)


def run(cmd, **kwargs):
    return subprocess.run(cmd, **kwargs)


def ssh_run(host, script):
    run(["ssh", host, "bash -s"], input=script, text=True, check=True)


def remote_preflight(host, cwd):
    script = f"""export PATH="{REMOTE_PATH}"
missing=0
for cmd in zmx pi pi-mesh; do
  command -v "$cmd" >/dev/null 2>&1 || {{ echo "missing remote command: $cmd" >&2; missing=1; }}
done
[ -d {shlex.quote(cwd)} ] || {{ echo "remote cwd missing: {cwd}" >&2; missing=1; }}
exit "$missing"
"""
    result = run(["ssh", host, "bash -s"], input=script, text=True)
    if result.returncode != 0:
        sys.exit(result.returncode)


def preflight():
    require_local("zmx") if not args.ssh else require_local("ssh")
    if not args.no_mesh:
        require_local("pi-mesh")
    if args.ssh:
        remote_preflight(args.ssh, args.cwd)
    else:
        require_local("pi")
        if not os.path.isdir(args.cwd):
            print(f"local cwd missing: {args.cwd}", file=sys.stderr)
            sys.exit(2)


def zmx_running(job_id, ssh=None):
    cmd = ["zmx", "list", "--short"]
    if ssh:
        cmd = ["ssh", ssh, f'export PATH="{REMOTE_PATH}"; {shlex.join(cmd)}']
    result = run(cmd, capture_output=True, text=True)
    return job_id in result.stdout.splitlines()


def mesh_agents():
    try:
        out = subprocess.check_output(["pi-mesh", "list", "--json"], text=True)
        data = json.loads(out)
        return (data.get("local") or []) + (data.get("remote") or [])
    except Exception:
        return []


def local_peer_addr():
    if args.peer:
        return args.peer
    for cmd, key in ((["pi-mesh", "list", "--json"], "self"), (["pi-mesh", "status", "--json"], "advertise")):
        try:
            data = json.loads(subprocess.check_output(cmd, text=True))
            if data.get(key):
                return data[key]
        except Exception:
            pass
    print("cannot determine local pi-mesh peer address; pass --peer host:port", file=sys.stderr)
    sys.exit(2)


def find_agent(alias=None, agent_id=None, title=None):
    for agent in mesh_agents():
        if alias and agent.get("alias") == alias:
            return agent
        if agent_id and agent.get("id") == agent_id:
            return agent
        if title and agent.get("title") == title:
            return agent
    return None


def tool_list(raw):
    tools = [tool.strip() for tool in raw.split(",") if tool.strip()]
    needed = ["bash"]
    for tool in needed:
        if tool not in tools:
            tools.append(tool)
    return ",".join(tools)


def write_reuse_state(job_id, ttl):
    with open(sidecar(job_id, "idle-ttl"), "w") as f:
        f.write(str(ttl))
    with open(sidecar(job_id, "heartbeat"), "a"):
        os.utime(sidecar(job_id, "heartbeat"), None)


def mark_busy(job, ttl):
    job_id = job["id"]
    if job.get("ssh"):
        ssh_run(
            job["ssh"],
            f"echo {int(ttl)} > {shlex.quote(sidecar(job_id, 'idle-ttl'))}; "
            f"touch {shlex.quote(sidecar(job_id, 'heartbeat'))}; "
            f"date > {shlex.quote(sidecar(job_id, 'busy'))}",
        )
        return
    write_reuse_state(job_id, ttl)
    with open(sidecar(job_id, "busy"), "w") as f:
        f.write(now())


def launcher_text(job_id, command, cwd, reuse_ttl=None):
    exit_file = sidecar(job_id, "exit")
    watcher = ""
    watcher_cleanup = ""
    if reuse_ttl is not None:
        heartbeat = sidecar(job_id, "heartbeat")
        busy = sidecar(job_id, "busy")
        ttl_file = sidecar(job_id, "idle-ttl")
        watcher = f"""
(
  while true; do
    sleep 15
    TTL=$(cat {shlex.quote(ttl_file)} 2>/dev/null || echo {reuse_ttl})
    case "$TTL" in ''|*[!0-9]*) TTL={reuse_ttl};; esac
    [ "$TTL" -eq 0 ] && continue
    [ -e {shlex.quote(busy)} ] && continue
    [ -e {shlex.quote(heartbeat)} ] || touch {shlex.quote(heartbeat)}
    NOW=$(date +%s)
    LAST=$(stat -c %Y {shlex.quote(heartbeat)} 2>/dev/null || stat -f %m {shlex.quote(heartbeat)} 2>/dev/null || date +%s)
    if [ $((NOW - LAST)) -ge "$TTL" ]; then
      printf '/exit\\r' | zmx send {shlex.quote(job_id)} 2>/dev/null || true
      sleep 5
      zmx kill {shlex.quote(job_id)} --force 2>/dev/null || true
      break
    fi
  done
) &
WATCHER_PID=$!
"""
        watcher_cleanup = "[ -n \"$WATCHER_PID\" ] && kill \"$WATCHER_PID\" 2>/dev/null || true\n"
    return f"""#!/bin/bash
export PATH="$HOME/.npm-packages/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd {shlex.quote(cwd)}
{watcher}{command}
EXIT_CODE=$?
{watcher_cleanup}echo $EXIT_CODE > {shlex.quote(exit_file)}
rm -f {shlex.quote(sidecar(job_id, 'launch.sh'))} {shlex.quote(sidecar(job_id, 'done.sh'))}
"""


def run_local_zmx(job_id, command, cwd, reuse_ttl=None):
    if reuse_ttl is not None:
        write_reuse_state(job_id, reuse_ttl)
    script_fd, script_file = tempfile.mkstemp(prefix="task-run-", suffix=".sh", dir="/tmp")
    with os.fdopen(script_fd, "w") as f:
        f.write(launcher_text(job_id, command, cwd, reuse_ttl))
        f.write(f"rm -f {shlex.quote(script_file)}\n")
    os.chmod(script_file, 0o755)
    env = os.environ.copy()
    env.pop("ZMX_SESSION", None)
    with open(sidecar(job_id, "zmx.log"), "ab") as log:
        subprocess.Popen(["zmx", "attach", job_id, script_file], stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True, env=env)


def run_remote_zmx(job_id, command, cwd, ssh, reuse_ttl=None):
    launch = sidecar(job_id, "launch.sh")
    done = sidecar(job_id, "done.sh")
    peer = local_peer_addr()
    reuse_init = ""
    if reuse_ttl is not None:
        reuse_init = (
            f"echo {int(reuse_ttl)} > {shlex.quote(sidecar(job_id, 'idle-ttl'))}\n"
            f"touch {shlex.quote(sidecar(job_id, 'heartbeat'))}\n"
            f"rm -f {shlex.quote(sidecar(job_id, 'busy'))}\n"
        )
    payload = f"""set -e
export PATH="$HOME/.npm-packages/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
{reuse_init}cat > {shlex.quote(launch)} <<'TASK_RUNNER_LAUNCH'
{launcher_text(job_id, command, cwd, reuse_ttl)}
TASK_RUNNER_LAUNCH
chmod +x {shlex.quote(launch)}
cat > {shlex.quote(done)} <<'TASK_RUNNER_DONE'
#!/bin/bash
printf '/exit\\r' | zmx send {shlex.quote(job_id)}
TASK_RUNNER_DONE
chmod +x {shlex.quote(done)}
(pi-mesh start {shlex.quote(peer)} >> {shlex.quote(sidecar(job_id, 'mesh.log'))} 2>&1 || true)
(pi-mesh peer {shlex.quote(peer)} >> {shlex.quote(sidecar(job_id, 'mesh.log'))} 2>&1 || true)
unset ZMX_SESSION
nohup zmx attach {shlex.quote(job_id)} {shlex.quote(launch)} >> {shlex.quote(sidecar(job_id, 'zmx.log'))} 2>&1 < /dev/null &
"""
    ssh_run(ssh, payload)


def legacy_no_mesh():
    job_id = new_job_id()
    if zmx_running(job_id):
        print(f"zmx session already exists: {job_id}", file=sys.stderr)
        sys.exit(2)
    task_fd, task_file = tempfile.mkstemp(prefix="task-", suffix=".txt", dir="/tmp")
    with os.fdopen(task_fd, "w") as f:
        f.write(args.task)
    cmd = [
        "pi",
        "--print",
        "--model", args.model,
        "--tools", tool_list(args.tools),
        "--no-skills",
        "--no-session",
        "--no-extensions",
    ]
    for ext in args.extensions:
        cmd += ["-e", ext]
    if args.system_prompt:
        cmd += ["--system-prompt", args.system_prompt]
    command = shlex.join(cmd) + f" \"$(cat {shlex.quote(task_file)})\"; rm -f {shlex.quote(task_file)}"
    run_local_zmx(job_id, command, args.cwd)
    jobs = load_jobs()
    jobs.append({
        "id": job_id,
        "zmx_session": job_id,
        "model": args.model,
        "task": args.task,
        "cwd": args.cwd,
        "mesh": False,
        "started_at": now(),
    })
    save_jobs(jobs)
    print(f"job_id={job_id}")
    return 0


def reusable_worker(jobs):
    for job in reversed(jobs):
        if not job.get("reusable") or not job.get("mesh") or job.get("model") != args.model:
            continue
        if (job.get("ssh") or None) != (args.ssh or None):
            continue
        if not zmx_running(job.get("id", ""), job.get("ssh")):
            continue
        agent = find_agent(alias=job.get("agent_alias"), agent_id=job.get("agent_id"), title=job.get("title"))
        if agent:
            return job, agent
    return None, None


def spawn_worker(jobs):
    job_id = new_job_id()
    if zmx_running(job_id, args.ssh):
        print(f"zmx session already exists: {job_id}", file=sys.stderr)
        sys.exit(2)
    title = args.name or f"task-runner {job_id}"
    cmd = [
        "pi",
        "--model", args.model,
        "--tools", tool_list(args.tools),
        "--no-skills",
        "--no-session",
        "--name", title,
        "--mesh-on",
    ]
    if args.system_prompt:
        cmd += ["--system-prompt", args.system_prompt]
    command = shlex.join(cmd)
    ttl = args.idle_ttl if args.reuse else None
    if args.ssh:
        run_remote_zmx(job_id, command, args.cwd, args.ssh, ttl)
    else:
        run_local_zmx(job_id, command, args.cwd, ttl)

    deadline = time.time() + args.startup_timeout
    agent = None
    while time.time() < deadline:
        agent = find_agent(title=title)
        if agent:
            break
        time.sleep(0.5)
    if not agent:
        print(f"worker started but did not register in mesh: {job_id}", file=sys.stderr)
        sys.exit(2)

    job = {
        "id": job_id,
        "zmx_session": job_id,
        "model": args.model,
        "task": args.task,
        "cwd": args.cwd,
        "mesh": True,
        "ssh": args.ssh,
        "reusable": args.reuse,
        "idle_ttl": args.idle_ttl if args.reuse else None,
        "title": title,
        "agent_alias": agent.get("alias"),
        "agent_id": agent.get("id"),
        "reply_to": args.reply_to,
        "started_at": now(),
    }
    jobs.append(job)
    save_jobs(jobs)
    return job, agent


def kill_worker(job):
    cmd = ["zmx", "kill", job["id"], "--force"]
    if job.get("ssh"):
        cmd = ["ssh", job["ssh"], f'export PATH="{REMOTE_PATH}"; {shlex.join(cmd)}']
    return " ".join(shlex.quote(part) for part in cmd)


def write_exit(job):
    path = shlex.quote(sidecar(job["id"], "exit"))
    if job.get("ssh"):
        return f"ssh {shlex.quote(job['ssh'])} \"printf '%s\\n' \\\"$CODE\\\" > {path}\""
    return f"printf '%s\n' \"$CODE\" > {path}"


def mark_idle(job):
    heartbeat = shlex.quote(sidecar(job["id"], "heartbeat"))
    busy = shlex.quote(sidecar(job["id"], "busy"))
    cmd = f"touch {heartbeat}; rm -f {busy}"
    if job.get("ssh"):
        return f"ssh {shlex.quote(job['ssh'])} {shlex.quote(cmd)}"
    return cmd


def worker_location(job):
    if job.get("ssh"):
        return f"You are already running on {job['ssh']}. Use local tools there; do not SSH back to that host unless the task explicitly asks."
    return "You are running on the target machine. Use local tools."


def request_body(job):
    keepalive = "Stay available after replying." if args.reuse else "The coordinator will stop this worker after receiving your final answer."
    return f"""Context: task-runner job {job['id']}.
{worker_location(job)}

Do the task below. Reply normally with only the requested result. Do not call agent_send. {keepalive}

Task:
{args.task}
"""


def spawn_relay(job, agent, keep_worker):
    request_file = sidecar(job["id"], "request.txt")
    relay_file = sidecar(job["id"], "relay.sh")
    done_prefix = f"task-runner {job['id']} done:"
    err_prefix = f"task-runner {job['id']} error:"
    stop_worker = f"{write_exit(job)}\n{kill_worker(job)} >/dev/null 2>&1 || true"
    success_finish = mark_idle(job) if keep_worker else stop_worker
    error_finish = stop_worker
    with open(request_file, "w") as f:
        f.write(request_body(job))
    with open(relay_file, "w") as f:
        f.write(f"""#!/bin/bash
export PATH="$HOME/.npm-packages/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
REQ={shlex.quote(request_file)}
OUT={shlex.quote(sidecar(job['id'], 'result.txt'))}
ERR={shlex.quote(sidecar(job['id'], 'request.err'))}
CODE=0
pi-mesh request --from {shlex.quote(args.reply_to)} {shlex.quote(agent['alias'])} "$(cat "$REQ")" --timeout {int(args.request_timeout)} > "$OUT" 2> "$ERR" || CODE=$?
if [ "$CODE" -eq 0 ]; then
  pi-mesh send --from task-runner@$(hostname) {shlex.quote(args.reply_to)} "{done_prefix}
$(cat "$OUT")"
  {success_finish}
else
  pi-mesh send --from task-runner@$(hostname) {shlex.quote(args.reply_to)} "{err_prefix}
$(cat "$ERR" "$OUT" 2>/dev/null)"
  {error_finish}
fi
rm -f {shlex.quote(relay_file)} "$REQ" "$OUT" "$ERR"
""")
    os.chmod(relay_file, 0o755)
    subprocess.Popen(["bash", relay_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)


def send_task(job, agent):
    if not args.reuse:
        spawn_relay(job, agent, keep_worker=False)
        return
    mark_busy(job, args.idle_ttl)
    heartbeat = sidecar(job["id"], "heartbeat")
    busy = sidecar(job["id"], "busy")
    after = f"After sending the mesh result, call the bash tool with: touch {shlex.quote(heartbeat)}; rm -f {shlex.quote(busy)}. Stay available for later task-runner work."
    body = f"""Context: task-runner job {job['id']}.
Reply target: {args.reply_to}
{worker_location(job)}

Do the task below. When done, call agent_send to the reply target with the result. Start the message with "task-runner {job['id']} done:". {after}

Task:
{args.task}
"""
    run(["pi-mesh", "send", "--from", args.reply_to, agent["alias"], body], check=True)


preflight()
_jobs_lock = acquire_jobs_lock()

if args.no_mesh:
    raise SystemExit(legacy_no_mesh())

jobs = load_jobs()
reused = False
job = None
agent = None
if args.reuse:
    job, agent = reusable_worker(jobs)
    reused = bool(job and agent)

if not reused:
    job, agent = spawn_worker(jobs)
    if args.ready_delay:
        time.sleep(args.ready_delay)

send_task(job, agent)
print(f"job_id={job['id']}")
print(f"agent={agent['alias']}")
if job.get("ssh"):
    print(f"ssh={job['ssh']}")
print(f"reused={str(reused).lower()}")
print("sent=true")
