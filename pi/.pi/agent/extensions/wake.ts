import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

type AgentWake = {
  reason: string;
  dueAt: number;
  scheduledAt: number;
};

type WakeState = {
  enabled: boolean;
  afterMs: number;
  schedule: AgentWake | null;
};

type CommandContext = {
  ui: {
    notify: (message: string, type?: "info" | "warning" | "error") => void;
  };
  sessionManager?: {
    getBranch?: () => Array<{ type?: string; customType?: string; data?: unknown }>;
    getEntries?: () => Array<{ type?: string; customType?: string; data?: unknown }>;
  };
};

const ENTRY_TYPE = "wake-state";
const DEFAULT_AFTER_MS = 7.5 * 60 * 1000;
const MAX_TIMER_MS = 2_147_483_647;

const BASE_WAKE_PROMPT = [
  "Wake.",
  "",
  "Review current state and decide whether anything needs action.",
  "If future follow-up is useful, set one schedule for the next wake.",
].join("\n");

const SCHEDULE_REMINDER = [
  "WAKE SCHEDULING.",
  "You have one pending wake schedule. Use the schedule tool when a concrete future follow-up is useful.",
  "Pass wake:null to clear the pending wake. Setting a new wake replaces the prior wake.",
].join("\n");

const defaultState = (): WakeState => ({
  enabled: true,
  afterMs: DEFAULT_AFTER_MS,
  schedule: null,
});

let state: WakeState = defaultState();
let timer: ReturnType<typeof setTimeout> | undefined;
let idleSince: number | undefined = Date.now();
let agentRunning = false;
let wakeQueued = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validWake(value: unknown): AgentWake | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  if (typeof value.reason !== "string") return undefined;
  if (typeof value.dueAt !== "number" || !Number.isFinite(value.dueAt)) return undefined;
  if (typeof value.scheduledAt !== "number" || !Number.isFinite(value.scheduledAt)) return undefined;
  return {
    reason: value.reason,
    dueAt: value.dueAt,
    scheduledAt: value.scheduledAt,
  };
}

function validState(value: unknown): WakeState | undefined {
  if (!isRecord(value)) return undefined;

  const schedule = validWake(value.schedule);
  if (schedule === undefined) return undefined;

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    afterMs: typeof value.afterMs === "number" && value.afterMs > 0 ? value.afterMs : DEFAULT_AFTER_MS,
    schedule,
  };
}

function restoreState(ctx: CommandContext): WakeState {
  let next = defaultState();
  const entries = ctx.sessionManager?.getBranch?.() ?? ctx.sessionManager?.getEntries?.() ?? [];

  for (const entry of entries) {
    if (entry.type !== "custom" || entry.customType !== ENTRY_TYPE) continue;
    const restored = validState(entry.data);
    if (restored) next = restored;
  }

  return next;
}

function saveState(pi: ExtensionAPI): void {
  pi.appendEntry(ENTRY_TYPE, state);
}

function parseDuration(input: string): number | undefined {
  const text = input.trim().toLowerCase();
  if (!text) return undefined;

  const unitMs: Record<string, number> = {
    ms: 1,
    millisecond: 1,
    milliseconds: 1,
    s: 1000,
    sec: 1000,
    secs: 1000,
    second: 1000,
    seconds: 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    mins: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hrs: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  let total = 0;
  let matched = "";
  const re = /(\d+(?:\.\d+)?)\s*(milliseconds?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)/g;
  for (const match of text.matchAll(re)) {
    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier = unitMs[unit];
    if (!Number.isFinite(amount) || multiplier === undefined) return undefined;
    total += amount * multiplier;
    matched += match[0];
  }

  if (matched.length === 0) return undefined;
  if (text.replace(/\s+/g, "") !== matched.replace(/\s+/g, "")) return undefined;
  if (!Number.isFinite(total) || total <= 0) return undefined;
  return Math.round(total);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const units: Array<[string, number]> = [
    ["d", 24 * 60 * 60 * 1000],
    ["h", 60 * 60 * 1000],
    ["m", 60 * 1000],
    ["s", 1000],
  ];
  const parts: string[] = [];
  let remaining = Math.round(ms);

  for (const [suffix, unitMs] of units) {
    const count = Math.floor(remaining / unitMs);
    if (count <= 0) continue;
    parts.push(`${count}${suffix}`);
    remaining -= count * unitMs;
  }

  if (remaining > 0 && parts.length === 0) parts.push(`${remaining}ms`);
  return parts.join("");
}

function formatTime(epochMs: number): string {
  return `${new Date(epochMs).toISOString()} (epoch_ms ${epochMs})`;
}

function formatReason(reason: string): string {
  return reason.trim() || "(no reason)";
}

function effectiveNext():
  | { kind: "agent"; dueAt: number; wake: AgentWake }
  | { kind: "base"; dueAt: number }
  | null {
  if (state.schedule) return { kind: "agent", dueAt: state.schedule.dueAt, wake: state.schedule };
  if (!state.enabled || agentRunning || idleSince === undefined) return null;
  return { kind: "base", dueAt: idleSince + state.afterMs };
}

function clearTimer(): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
}

function scheduleTimer(pi: ExtensionAPI): void {
  clearTimer();
  if (wakeQueued) return;

  const next = effectiveNext();
  if (!next) return;

  const delay = Math.max(0, Math.min(MAX_TIMER_MS, next.dueAt - Date.now()));
  timer = setTimeout(() => {
    void fireWake(pi);
  }, delay);
}

async function fireWake(pi: ExtensionAPI): Promise<void> {
  clearTimer();

  const next = effectiveNext();
  if (!next) return;

  const now = Date.now();
  if (next.dueAt > now) {
    scheduleTimer(pi);
    return;
  }

  wakeQueued = true;

  if (next.kind === "agent") {
    state = { ...state, schedule: null };
    saveState(pi);
    pi.sendUserMessage(`Scheduled wake:\n\n${formatReason(next.wake.reason)}`, { deliverAs: "followUp" });
    return;
  }

  idleSince = undefined;
  pi.sendUserMessage(BASE_WAKE_PROMPT, { deliverAs: "followUp" });
}

function setBaseEnabled(pi: ExtensionAPI, enabled: boolean): void {
  state = { ...state, enabled };
  saveState(pi);
  if (!agentRunning && !wakeQueued) idleSince = Date.now();
  scheduleTimer(pi);
}

function setBaseAfter(pi: ExtensionAPI, afterMs: number): void {
  state = { ...state, afterMs };
  saveState(pi);
  if (!agentRunning && !wakeQueued) idleSince = Date.now();
  scheduleTimer(pi);
}

function setAgentWake(pi: ExtensionAPI, wake: AgentWake | null): void {
  state = { ...state, schedule: wake };
  saveState(pi);
  scheduleTimer(pi);
}

function statusText(short = false): string {
  const lines: string[] = [];
  const next = effectiveNext();

  if (short) {
    if (!next) {
      if (wakeQueued) return "up next: pending wake turn";
      if (agentRunning && state.enabled) {
        return `up next: base idle wake after agent is idle for ${formatDuration(state.afterMs)}`;
      }
      return "up next: none";
    }
    const label = next.kind === "agent" ? "agent schedule" : "base idle wake";
    return `up next: ${label} at ${formatTime(next.dueAt)}`;
  }

  lines.push(`wake: ${state.enabled ? "on" : "off"}`);
  lines.push(`after: ${formatDuration(state.afterMs)}`);
  lines.push(agentRunning ? "idle since: active" : `idle since: ${idleSince ? formatTime(idleSince) : "pending wake turn"}`);

  if (state.schedule) {
    lines.push(`agent schedule: ${formatTime(state.schedule.dueAt)}`);
    lines.push(`reason: ${formatReason(state.schedule.reason)}`);
  } else {
    lines.push("agent schedule: none");
  }

  if (next) {
    const label = next.kind === "agent" ? "agent schedule" : "base idle wake";
    lines.push(`up next: ${label} at ${formatTime(next.dueAt)}`);
  } else if (agentRunning && state.enabled) {
    lines.push(`up next: base idle wake after agent is idle for ${formatDuration(state.afterMs)}`);
  } else {
    lines.push("up next: none");
  }

  return lines.join("\n");
}

function usage(): string {
  return "Usage: /wake | /wake on | /wake off | /wake after <duration> | /wake upnext";
}

function scheduleContext(): string {
  if (!state.schedule) return "Current pending wake: none.";
  return [
    `Current pending wake: ${formatTime(state.schedule.dueAt)}.`,
    `Reason: ${formatReason(state.schedule.reason)}`,
  ].join("\n");
}

export default function wakeExtension(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    state = restoreState(ctx);
    agentRunning = false;
    wakeQueued = false;
    idleSince = Date.now();
    scheduleTimer(pi);
  });

  pi.on("session_shutdown", async () => {
    clearTimer();
  });

  pi.on("agent_start", async () => {
    agentRunning = true;
    wakeQueued = false;
    clearTimer();
  });

  pi.on("agent_end", async () => {
    agentRunning = false;
    if (!wakeQueued) idleSince = Date.now();
    scheduleTimer(pi);
  });

  pi.on("before_agent_start", async (event) => ({
    systemPrompt: `${event.systemPrompt}\n\n${SCHEDULE_REMINDER}\n${scheduleContext()}`,
  }));

  pi.registerTool({
    name: "schedule",
    label: "Schedule Wake",
    description: "Set, replace, or clear the single pending wake for this Pi session.",
    promptSnippet: "Set one pending future wake for concrete follow-up work",
    promptGuidelines: [
      "Use schedule when a concrete future follow-up is useful; setting a new wake replaces the prior wake.",
      "Use schedule with wake:null to clear the pending wake when it is no longer needed.",
    ],
    parameters: Type.Object({
      wake: Type.Union([
        Type.Null(),
        Type.Object({
          reason: Type.String({
            description: "Why the agent should wake later. Include any notes that need to carry forward.",
          }),
          after: Type.Optional(Type.String({ description: "Relative delay, e.g. 30s, 7m30s, 1h." })),
          at: Type.Optional(Type.String({ description: "Absolute ISO timestamp, e.g. 2026-07-07T12:30:00Z." })),
        }),
      ], {
        description: "Wake to set, or null to clear the current pending wake.",
      }),
    }),
    async execute(_toolCallId, params) {
      if (params.wake === null) {
        setAgentWake(pi, null);
        return { content: [{ type: "text", text: "wake schedule cleared" }], details: { schedule: null } };
      }

      const reason = params.wake.reason.trim();
      if (!reason) throw new Error("schedule reason is required");

      const hasAfter = typeof params.wake.after === "string" && params.wake.after.trim() !== "";
      const hasAt = typeof params.wake.at === "string" && params.wake.at.trim() !== "";
      if (hasAfter === hasAt) throw new Error("provide exactly one of after or at");

      const scheduledAt = Date.now();
      let dueAt: number;

      if (hasAfter) {
        const afterMs = parseDuration(params.wake.after!);
        if (afterMs === undefined) throw new Error(`invalid duration: ${params.wake.after}`);
        dueAt = scheduledAt + afterMs;
      } else {
        dueAt = Date.parse(params.wake.at!);
        if (!Number.isFinite(dueAt)) throw new Error(`invalid timestamp: ${params.wake.at}`);
        if (dueAt <= scheduledAt) throw new Error("wake time must be in the future");
      }

      const wake: AgentWake = { reason, dueAt, scheduledAt };
      setAgentWake(pi, wake);

      return {
        content: [{ type: "text", text: `wake scheduled for ${formatTime(dueAt)}` }],
        details: { schedule: wake },
      };
    },
  });

  pi.registerCommand("wake", {
    description: "Manage idle wake: /wake | on | off | after <duration> | upnext",
    handler: async (args, ctx) => {
      const trimmed = args.trim();
      if (!trimmed || trimmed === "status") {
        ctx.ui.notify(statusText(), "info");
        return;
      }

      const [cmd = "", ...rest] = trimmed.split(/\s+/);
      const action = cmd.toLowerCase();

      if (action === "on") {
        setBaseEnabled(pi, true);
        ctx.ui.notify(statusText(), "info");
        return;
      }

      if (action === "off") {
        setBaseEnabled(pi, false);
        ctx.ui.notify(statusText(), "info");
        return;
      }

      if (action === "upnext") {
        ctx.ui.notify(statusText(true), "info");
        return;
      }

      if (action === "after") {
        const durationText = rest.join(" ");
        const afterMs = parseDuration(durationText);
        if (afterMs === undefined) {
          ctx.ui.notify(usage(), "warning");
          return;
        }

        setBaseAfter(pi, afterMs);
        ctx.ui.notify(statusText(), "info");
        return;
      }

      ctx.ui.notify(usage(), "warning");
    },
  });
}
