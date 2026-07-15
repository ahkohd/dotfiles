import { spawn, type ChildProcess } from "node:child_process";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const READ_MAX_BYTES = 50 * 1024;
const READ_MAX_LINES = 2000;
const TAIL_MAX_LINES = 200;
const COMPLETION_MAX_BYTES = 8 * 1024;
const COMPLETION_MAX_LINES = 50;
const STOP_GRACE_MS = 1000;
const TITLE_MAX_LENGTH = 120;
const STATUS_KEY = "tasks";
const SPINNER_INTERVAL_MS = 80;
const SPINNER_FRAMES = ["\u2847\u28b8", "\u2847\u28b8", "\u28ff\u28ff", "\u28ff\u28ff", "\u28b8\u2847", "\u28b8\u2847", "\u28ff\u28ff", "\u28ff\u28ff", "\u2847\u28b8", "\u2847\u28b8"] as const;
const SUCCESS_ICON = "\u2714";
const ERROR_ICON = "\u2718";

const TASK_PARAMETERS = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["start", "list", "read", "tail", "stop", "clear"],
      description: "Task operation to perform.",
    },
    command: {
      type: "string",
      description: "Non-interactive shell command. Required for start.",
    },
    title: {
      type: "string",
      maxLength: TITLE_MAX_LENGTH,
      description: "Optional short title shown in the tool row and footer for start.",
    },
    id: {
      type: "integer",
      minimum: 1,
      description: "Task ID. Required for read, tail, stop, and clear.",
    },
    cursor: {
      type: "integer",
      minimum: 0,
      description: "Byte cursor returned by an earlier read or tail. Used by read.",
    },
  },
  required: ["action"],
  additionalProperties: false,
} as const;

type TaskAction = "start" | "list" | "read" | "tail" | "stop" | "clear";
type TaskStatus = "running" | "success" | "error" | "stopped";
type TaskInput = {
  action: TaskAction;
  command?: string;
  title?: string;
  id?: number;
  cursor?: number;
};

type TaskRecord = {
  id: number;
  command: string;
  title?: string;
  pid: number | null;
  logPath: string;
  startedAt: number;
  endedAt?: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  status: TaskStatus;
  error?: string;
  stopRequested: boolean;
  notifyOnExit: boolean;
  groupMonitor?: ReturnType<typeof setInterval>;
  done: Promise<void>;
  resolveDone: () => void;
};

type OutputChunk = {
  output: string;
  next_cursor: number;
  more: boolean;
  truncated: boolean;
  total_bytes: number;
};

type Completion = {
  type: "task_complete";
  task_id: number;
  title?: string;
  status: "success" | "error";
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  error?: string;
  output: string;
  output_truncated: boolean;
  total_output_bytes: number;
  log_path: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeOutput(text: string): string {
  return Array.from(text)
    .filter((character) => {
      const code = character.codePointAt(0);
      if (code === undefined) return false;
      if (code === 0x09 || code === 0x0a || code === 0x0d) return true;
      if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return false;
      return !(code >= 0xfff9 && code <= 0xfffb);
    })
    .join("");
}

function singleLine(text: string): string {
  return sanitizeOutput(text).replace(/[\r\n\t]+/g, " ").replace(/ +/g, " ").trim();
}

function processGroupAlive(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalProcessTree(pid: number | null, signal: NodeJS.Signals): void {
  if (!pid) return;

  try {
    process.kill(-pid, signal);
  } catch {
    // The detached process group has already exited.
  }
}

function readBytes(path: string, position: number, length: number): Buffer {
  if (length <= 0) return Buffer.alloc(0);
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.allocUnsafe(length);
    const bytesRead = readSync(fd, buffer, 0, length, position);
    return buffer.subarray(0, bytesRead);
  } finally {
    closeSync(fd);
  }
}

function limitLinesFromStart(buffer: Buffer, maxLines: number): Buffer {
  let lines = 0;
  for (let index = 0; index < buffer.length; index++) {
    if (buffer[index] !== 0x0a) continue;
    lines++;
    if (lines === maxLines) return buffer.subarray(0, index + 1);
  }
  return buffer;
}

function completeUtf8Prefix(buffer: Buffer): Buffer {
  if (buffer.length === 0) return buffer;

  let start = buffer.length - 1;
  while (start > 0 && (buffer[start] & 0xc0) === 0x80) start--;
  const first = buffer[start];
  const expected =
    (first & 0x80) === 0 ? 1 :
    (first & 0xe0) === 0xc0 ? 2 :
    (first & 0xf0) === 0xe0 ? 3 :
    (first & 0xf8) === 0xf0 ? 4 : 1;

  return buffer.length - start < expected ? buffer.subarray(0, start) : buffer;
}

function dropUtf8ContinuationPrefix(buffer: Buffer): Buffer {
  let start = 0;
  while (start < buffer.length && (buffer[start] & 0xc0) === 0x80) start++;
  return buffer.subarray(start);
}

function limitLinesFromEnd(text: string, maxLines: number): { output: string; truncated: boolean } {
  const endedWithNewline = text.endsWith("\n");
  const lines = text.split("\n");
  if (endedWithNewline) lines.pop();
  if (lines.length <= maxLines) return { output: text, truncated: false };

  const output = lines.slice(-maxLines).join("\n") + (endedWithNewline ? "\n" : "");
  return { output, truncated: true };
}

function taskSummary(task: TaskRecord) {
  return {
    task_id: task.id,
    status: task.status,
    pid: task.pid,
    command: task.command,
    title: task.title,
    started_at: new Date(task.startedAt).toISOString(),
    ended_at: task.endedAt ? new Date(task.endedAt).toISOString() : null,
    exit_code: task.exitCode,
    signal: task.signal,
    error: task.error,
    log_path: task.logPath,
  };
}

class TaskManager {
  private readonly tasks = new Map<number, TaskRecord>();
  private readonly logDir = mkdtempSync(join(tmpdir(), "pi-tasks-"));
  private readonly cwd: string;
  private readonly onComplete: (completion: Completion) => void;
  private readonly onChange: () => void;
  private nextId = 1;
  private shuttingDown = false;

  constructor(cwd: string, onComplete: (completion: Completion) => void, onChange: () => void) {
    this.cwd = cwd;
    this.onComplete = onComplete;
    this.onChange = onChange;
  }

  start(commandInput: string, titleInput?: string): TaskRecord {
    const command = commandInput.trim();
    const title = titleInput?.trim() || undefined;
    if (!command) throw new Error("start requires a non-empty command");
    if (title && Array.from(title).length > TITLE_MAX_LENGTH) throw new Error(`title must not exceed ${TITLE_MAX_LENGTH} characters`);
    if (process.platform === "win32") throw new Error("task is only supported on Unix systems");
    if (this.shuttingDown) throw new Error("cannot start a task while the session is shutting down");

    const id = this.nextId++;
    const logPath = join(this.logDir, `${id}.log`);
    const logFd = openSync(logPath, "a");
    let child: ChildProcess;

    try {
      child = spawn(command, {
        cwd: this.cwd,
        shell: true,
        detached: true,
        stdio: ["ignore", logFd, logFd],
        windowsHide: true,
      });
    } finally {
      closeSync(logFd);
    }

    let resolveDone = () => {};
    const done = new Promise<void>((resolveTask) => {
      resolveDone = resolveTask;
    });

    const task: TaskRecord = {
      id,
      command,
      title,
      pid: child.pid ?? null,
      logPath,
      startedAt: Date.now(),
      exitCode: null,
      signal: null,
      status: "running",
      stopRequested: false,
      notifyOnExit: true,
      done,
      resolveDone,
    };

    this.tasks.set(id, task);
    child.once("error", (error) => this.finish(task, null, null, errorMessage(error)));
    child.once("close", (code, signal) => this.handleClose(task, code, signal));
    this.onChange();
    return task;
  }

  list() {
    return Array.from(this.tasks.values(), taskSummary);
  }

  read(id: number, cursor = 0): OutputChunk {
    const task = this.get(id);
    const size = statSync(task.logPath).size;
    if (cursor > size) throw new Error(`cursor ${cursor} is beyond task ${id} output (${size} bytes)`);

    const available = Math.min(READ_MAX_BYTES, size - cursor);
    const limited = limitLinesFromStart(readBytes(task.logPath, cursor, available), READ_MAX_LINES);
    const buffer = cursor + limited.length < size || task.status === "running" ? completeUtf8Prefix(limited) : limited;
    const nextCursor = cursor + buffer.length;

    return {
      output: sanitizeOutput(buffer.toString("utf8")),
      next_cursor: nextCursor,
      more: nextCursor < size,
      truncated: nextCursor < size,
      total_bytes: size,
    };
  }

  tail(id: number, maxBytes = READ_MAX_BYTES, maxLines = TAIL_MAX_LINES): OutputChunk {
    const task = this.get(id);
    const size = statSync(task.logPath).size;
    const start = Math.max(0, size - maxBytes);
    const aligned = dropUtf8ContinuationPrefix(readBytes(task.logPath, start, size - start));
    const buffer = task.status === "running" ? completeUtf8Prefix(aligned) : aligned;
    const trailingBytes = aligned.length - buffer.length;
    const text = sanitizeOutput(buffer.toString("utf8"));
    const limited = limitLinesFromEnd(text, maxLines);

    return {
      output: limited.output,
      next_cursor: size - trailingBytes,
      more: trailingBytes > 0,
      truncated: start > 0 || trailingBytes > 0 || limited.truncated,
      total_bytes: size,
    };
  }

  async stop(id: number): Promise<TaskRecord> {
    const task = this.get(id);
    if (task.status !== "running") return task;

    task.stopRequested = true;
    task.notifyOnExit = false;
    signalProcessTree(task.pid, "SIGTERM");
    await Promise.race([task.done, delay(STOP_GRACE_MS)]);

    if (task.status === "running") {
      signalProcessTree(task.pid, "SIGKILL");
      await Promise.race([task.done, delay(STOP_GRACE_MS)]);
    }

    return task;
  }

  clear(id: number): TaskRecord {
    const task = this.get(id);
    if (task.status === "running") throw new Error(`task ${id} is running; stop it before clearing`);

    this.tasks.delete(id);
    rmSync(task.logPath, { force: true });
    this.onChange();
    return task;
  }

  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    const running = Array.from(this.tasks.values()).filter((task) => task.status === "running");
    for (const task of running) {
      task.stopRequested = true;
      task.notifyOnExit = false;
      signalProcessTree(task.pid, "SIGTERM");
    }

    await Promise.race([Promise.all(running.map((task) => task.done)), delay(STOP_GRACE_MS)]);
    for (const task of running) {
      if (task.status === "running") signalProcessTree(task.pid, "SIGKILL");
    }

    await Promise.race([Promise.all(running.map((task) => task.done)), delay(STOP_GRACE_MS)]);
    try {
      rmSync(this.logDir, { recursive: true, force: true });
    } catch {
      // A forced task can briefly retain its log file.
    }
  }

  private get(id: number): TaskRecord {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`task ${id} not found`);
    return task;
  }

  private handleClose(task: TaskRecord, exitCode: number | null, signal: NodeJS.Signals | null): void {
    if (!processGroupAlive(task.pid)) {
      this.finish(task, exitCode, signal);
      return;
    }

    task.groupMonitor ??= setInterval(() => {
      if (processGroupAlive(task.pid)) return;
      if (task.groupMonitor) clearInterval(task.groupMonitor);
      task.groupMonitor = undefined;
      this.finish(task, exitCode, signal);
    }, 100);
  }

  private finish(
    task: TaskRecord,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
    error?: string,
  ): void {
    if (task.status !== "running") return;
    if (task.groupMonitor) clearInterval(task.groupMonitor);
    task.groupMonitor = undefined;

    task.endedAt = Date.now();
    task.exitCode = exitCode;
    task.signal = signal;
    task.error = error;
    task.status = task.stopRequested ? "stopped" : !error && exitCode === 0 ? "success" : "error";
    this.onChange();
    task.resolveDone();

    if (!this.shuttingDown && task.notifyOnExit && task.status !== "stopped") {
      try {
        const tail = this.tail(task.id, COMPLETION_MAX_BYTES, COMPLETION_MAX_LINES);
        this.onComplete({
          type: "task_complete",
          task_id: task.id,
          title: task.title,
          status: task.status,
          exit_code: task.exitCode,
          signal: task.signal,
          error: task.error,
          output: tail.output,
          output_truncated: tail.truncated,
          total_output_bytes: tail.total_bytes,
          log_path: task.logPath,
        });
      } catch (completionError) {
        console.error(`task ${task.id} completion notification failed: ${errorMessage(completionError)}`);
      }
    }
  }
}

function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    details: value,
  };
}

function requiredId(input: TaskInput): number {
  if (input.id === undefined) throw new Error(`${input.action} requires id`);
  return input.id;
}

export default async function taskExtension(pi: ExtensionAPI): Promise<void> {
  const { Text } = await import("@mariozechner/pi-tui");
  let manager: TaskManager | undefined;
  let sessionContext: ExtensionContext | undefined;
  let spinner: ReturnType<typeof setInterval> | undefined;
  let spinnerIndex = 0;

  const stopSpinner = () => {
    if (spinner) clearInterval(spinner);
    spinner = undefined;
    spinnerIndex = 0;
  };

  const updateStatus = () => {
    if (!manager || !sessionContext) return;
    const ctx = sessionContext;
    const tasks = manager.list().reverse();
    const hasRunning = tasks.some((task) => task.status === "running");

    if (hasRunning && !spinner) {
      spinner = setInterval(() => {
        spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
        updateStatus();
      }, SPINNER_INTERVAL_MS);
    } else if (!hasRunning) {
      stopSpinner();
    }

    if (tasks.length === 0) {
      ctx.ui.setStatus(STATUS_KEY, undefined);
      return;
    }

    const status = tasks.map((task) => {
      const title = singleLine(task.title || `Task #${task.task_id}`);
      const icon = task.status === "running"
        ? SPINNER_FRAMES[spinnerIndex]
        : task.status === "success"
          ? SUCCESS_ICON
          : ERROR_ICON;
      const color = task.status === "running"
        ? "warning"
        : task.status === "success"
          ? "success"
          : task.status === "error"
            ? "error"
            : "muted";
      return ctx.ui.theme.fg(color, `${icon} ${title}`);
    });
    ctx.ui.setStatus(STATUS_KEY, status.join("  "));
  };

  pi.registerMessageRenderer("task", (message, _options, theme) => {
    const completion = message.details as Partial<Completion> | undefined;
    if (!completion || (completion.status !== "success" && completion.status !== "error")) {
      return new Text(message.content, 0, 0);
    }

    const rawTitle = typeof completion.title === "string" ? completion.title : `Task #${completion.task_id ?? "?"}`;
    const title = singleLine(rawTitle);
    const status = completion.status === "success"
      ? "completed"
      : `failed${typeof completion.exit_code === "number" ? ` (exit ${completion.exit_code})` : ""}`;
    const color = completion.status === "success" ? "success" : "error";
    const output = typeof completion.output === "string" && completion.output
      ? `\n${theme.fg("toolOutput", completion.output.trimEnd())}`
      : "";
    return new Text(theme.fg(color, theme.bold(`${title} ${status}`)) + output, 0, 0);
  });

  pi.on("session_start", async (_event, ctx) => {
    sessionContext = ctx;
    manager = new TaskManager(
      ctx.cwd,
      (completion) => {
        pi.sendMessage(
          {
            customType: "task",
            content: JSON.stringify(completion),
            display: true,
            details: completion,
          },
          { deliverAs: "followUp", triggerTurn: true },
        );
      },
      updateStatus,
    );
    updateStatus();
  });

  pi.on("session_shutdown", async () => {
    stopSpinner();
    sessionContext?.ui.setStatus(STATUS_KEY, undefined);
    const currentManager = manager;
    manager = undefined;
    sessionContext = undefined;
    await currentManager?.shutdown();
  });

  pi.registerTool({
    name: "task",
    label: "Task",
    description:
      "Start and manage non-interactive asynchronous shell tasks on Unix systems. Actions: start(command, title?), list, " +
      "read(id, cursor?), tail(id), stop(id), and clear(id). Start returns immediately. Read returns at most " +
      `${READ_MAX_LINES} lines or ${READ_MAX_BYTES / 1024}KB with a next_cursor. Tail returns the latest ` +
      `${TAIL_MAX_LINES} lines or ${READ_MAX_BYTES / 1024}KB. Successful and failed tasks send a JSON follow-up message.`,
    promptSnippet: "Run shell commands asynchronously while continuing the conversation",
    promptGuidelines: [
      "Prefer task over bash for commands that can run asynchronously, especially tests, builds, servers, and watchers, so you can continue helping the user while they run.",
      "Give task start a short title when it will help the user understand the running command in the footer.",
      "After starting a task, do not wait or poll for completion. Continue other work or return control to the user; successful and failed tasks send a follow-up message.",
      "Use task tail for recent output, then task read with next_cursor for new output.",
      "Completed task logs remain available until task clear or session shutdown.",
      "Clear completed or stopped tasks once their result is no longer useful.",
    ],
    parameters: TASK_PARAMETERS,
    renderCall(input, theme) {
      const args = input && typeof input === "object" ? input : {};
      const action = typeof args.action === "string" ? singleLine(args.action) || "task" : "task";
      const title = typeof args.title === "string" ? singleLine(args.title) || undefined : undefined;
      const command = typeof args.command === "string" ? singleLine(args.command) || undefined : undefined;
      const id = typeof args.id === "number" ? ` #${args.id}` : "";
      const text = action === "start" ? title || command || action : `${action}${id}`;
      const color = action === "start" ? "warning" : "muted";
      return new Text(
        theme.fg("toolTitle", theme.bold("task ")) + theme.fg(color, text),
        0,
        0,
      );
    },
    async execute(_toolCallId, input: TaskInput) {
      if (!manager) throw new Error("task manager is not ready");

      switch (input.action) {
        case "start": {
          if (input.command === undefined) throw new Error("start requires command");
          const task = manager.start(input.command, input.title);
          return jsonResult(taskSummary(task));
        }
        case "list":
          return jsonResult({ tasks: manager.list() });
        case "read": {
          const id = requiredId(input);
          return jsonResult({ task_id: id, status: manager.list().find((task) => task.task_id === id)?.status, ...manager.read(id, input.cursor) });
        }
        case "tail": {
          const id = requiredId(input);
          return jsonResult({ task_id: id, status: manager.list().find((task) => task.task_id === id)?.status, ...manager.tail(id) });
        }
        case "stop": {
          const task = await manager.stop(requiredId(input));
          return jsonResult(taskSummary(task));
        }
        case "clear": {
          const task = manager.clear(requiredId(input));
          return jsonResult({ task_id: task.id, title: task.title, status: "cleared", previous_status: task.status });
        }
        default:
          throw new Error(`unknown task action: ${String(input.action)}`);
      }
    },
  });
}

async function selfCheck(): Promise<void> {
  const splitUtf8 = Buffer.concat([Buffer.alloc(READ_MAX_BYTES - 1, 0x61), Buffer.from([0xf0, 0x9f, 0x92, 0xa9])]);
  assert.equal(completeUtf8Prefix(splitUtf8.subarray(0, READ_MAX_BYTES)).length, READ_MAX_BYTES - 1);
  assert.equal(dropUtf8ContinuationPrefix(Buffer.from([0x9f, 0x92, 0xa9, 0x61])).toString(), "a");

  const completions: Completion[] = [];
  const manager = new TaskManager(process.cwd(), (completion) => completions.push(completion), () => {});

  try {
    const completed = manager.start("printf 'first\\nsecond\\n'; sleep 0.1; printf 'third\\n'", "Example task");
    await completed.done;
    assert.equal(completed.status, "success");
    assert.equal(completed.title, "Example task");
    assert.match(manager.tail(completed.id).output, /first\nsecond\nthird/);

    const firstRead = manager.read(completed.id, 0);
    assert.equal(firstRead.more, false);
    assert.equal(manager.read(completed.id, firstRead.next_cursor).output, "");
    assert.equal(completions.length, 1);
    assert.equal(completions[0].status, "success");
    assert.equal(completions[0].title, "Example task");

    const failed = manager.start("printf 'failed\\n' >&2; exit 7");
    await failed.done;
    assert.equal(failed.status, "error");
    assert.equal(completions.length, 2);
    assert.equal(completions[1].exit_code, 7);
    assert.match(completions[1].output, /failed/);
    manager.clear(failed.id);
    assert.throws(() => manager.tail(failed.id), /not found/);

    const stopped = manager.start("sleep 30 & echo $!");
    await delay(100);
    assert.match(manager.tail(stopped.id).output, /^\d+\n$/);
    assert.equal(stopped.status, "running");
    await manager.stop(stopped.id);
    assert.equal(stopped.status, "stopped");
    assert.equal(processGroupAlive(stopped.pid), false);
    assert.equal(completions.length, 2);

    const stubborn = manager.start(`node -e "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)"`);
    await delay(100);
    const stopStartedAt = Date.now();
    await manager.stop(stubborn.id);
    assert.equal(stubborn.status, "stopped");
    assert.ok(Date.now() - stopStartedAt >= STOP_GRACE_MS - 100);

    const shutdownTask = manager.start("sleep 30");
    await manager.shutdown();
    assert.equal(shutdownTask.status, "stopped");
    assert.equal(completions.length, 2);
  } finally {
    await manager.shutdown();
  }

  process.stdout.write("task self-check passed\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await selfCheck();
}
