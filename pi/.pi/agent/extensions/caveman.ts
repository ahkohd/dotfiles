import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type CavemanLevel = "off" | "lite" | "full" | "ultra";

const ENTRY_TYPE = "caveman-mode";

const AUTO_ON_RE = /\b(caveman mode|talk like caveman|use caveman|less tokens|be brief|be concise|token efficiency|fewer tokens)\b/i;
const AUTO_OFF_RE = /\b(stop caveman|normal mode|disable caveman|turn off caveman|stop terse mode)\b/i;

const MODE_PROMPTS: Record<Exclude<CavemanLevel, "off">, string> = {
  lite: [
    "CAVEMAN MODE (lite).",
    "Keep technical accuracy.",
    "English only.",
    "No filler, hedging, pleasantries.",
    "Keep full sentences and normal grammar.",
    "Be concise.",
    "Code blocks unchanged.",
    "Error strings quoted exact.",
    "Example: Your component re-renders because you create a new object reference each render. Wrap it in `useMemo`.",
    "For security warnings, irreversible actions, or risk of confusion: switch to clear normal English for that section.",
  ].join("\n"),
  full: [
    "CAVEMAN MODE (full).",
    "Keep technical accuracy.",
    "English only.",
    "Drop articles/filler/hedging/pleasantries.",
    "Fragments OK.",
    "Use short words.",
    "Pattern: [thing] [action] [reason]. [next step].",
    "Code blocks unchanged.",
    "Error strings quoted exact.",
    "Example: New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`.",
    "For security warnings, irreversible actions, or risk of confusion: switch to clear normal English for that section.",
  ].join("\n"),
  ultra: [
    "CAVEMAN MODE (ultra).",
    "Keep technical accuracy.",
    "English only.",
    "Maximum brevity.",
    "Use compact abbreviations when clear (DB/auth/config/req/res/fn/impl).",
    "Use arrows for causality (X -> Y).",
    "One word when enough.",
    "Code blocks unchanged.",
    "Error strings quoted exact.",
    "Example: Inline obj prop -> new ref -> re-render. `useMemo`.",
    "For security warnings, irreversible actions, or risk of confusion: switch to clear normal English for that section.",
  ].join("\n"),
};

let level: CavemanLevel = "ultra";

type UiContext = {
  ui: {
    notify: (message: string, type?: "info" | "warning" | "error") => void;
  };
};

function parseLevel(input: string): CavemanLevel | undefined {
  const token = input.trim().toLowerCase();
  if (!token || token === "on") return "ultra";
  if (token === "off" || token === "normal" || token === "stop" || token === "disable") return "off";
  if (token === "lite" || token === "full" || token === "ultra") return token;
  return undefined;
}

function setLevel(
  next: CavemanLevel,
  ctx: UiContext,
  pi: ExtensionAPI,
  opts: { persist?: boolean; notify?: boolean; notifyText?: string } = {},
): void {
  const changed = level !== next;
  level = next;

  if (opts.persist ?? true) {
    pi.appendEntry(ENTRY_TYPE, { level: next });
  }

  if (opts.notify ?? true) {
    const text = opts.notifyText ?? (changed ? `Caveman mode: ${next}` : `Caveman mode unchanged: ${next}`);
    ctx.ui.notify(text, "info");
  }
}

export default function cavemanExtension(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    level = "ultra";

    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
        const candidate = (entry as { data?: { level?: CavemanLevel } }).data?.level;
        if (candidate === "off" || candidate === "lite" || candidate === "full" || candidate === "ultra") {
          level = candidate;
        }
      }
    }

  });

  pi.on("input", async (event, ctx) => {
    const text = event.text.trim();
    if (!text || text.startsWith("/caveman")) return { action: "continue" };

    if (AUTO_OFF_RE.test(text) && level !== "off") {
      setLevel("off", ctx, pi, { persist: true, notify: true, notifyText: "Caveman mode: off" });
      return { action: "continue" };
    }

    if (level === "off" && AUTO_ON_RE.test(text)) {
      setLevel("ultra", ctx, pi, { persist: true, notify: true, notifyText: "Caveman mode auto-enabled: ultra" });
    }

    return { action: "continue" };
  });

  pi.on("before_agent_start", async (event) => {
    if (level === "off") return;
    const modePrompt = MODE_PROMPTS[level];
    return {
      systemPrompt: `${event.systemPrompt}\n\n${modePrompt}`,
    };
  });

  pi.registerCommand("caveman", {
    description: "Set terse mode: lite|full|ultra|off",
    handler: async (args, ctx) => {
      const trimmed = args.trim().toLowerCase();

      if (trimmed === "status") {
        ctx.ui.notify(`Caveman mode: ${level}`, "info");
        return;
      }

      const next = parseLevel(trimmed);
      if (!next) {
        ctx.ui.notify("Usage: /caveman [lite|full|ultra|off|status]", "warning");
        return;
      }

      setLevel(next, ctx, pi, { persist: true, notify: true });
    },
  });
}
