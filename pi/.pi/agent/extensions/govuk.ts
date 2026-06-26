import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type GovukMode = "on" | "off";

const ENTRY_TYPE = "govuk-mode";

const GOVUK_PROMPT = [
  "GOV.UK STYLE MODE.",
  "Use the govuk-style skill for reports, summaries, guidance, documentation, and other prose.",
].join("\n");

let mode: GovukMode = "on";

type UiContext = {
  ui: {
    notify: (message: string, type?: "info" | "warning" | "error") => void;
  };
};

function parseMode(input: string): GovukMode | "status" | undefined {
  const token = input.trim().toLowerCase();
  if (!token || token === "on") return "on";
  if (token === "off" || token === "stop" || token === "disable") return "off";
  if (token === "status") return "status";
  return undefined;
}

function setMode(next: GovukMode, ctx: UiContext, pi: ExtensionAPI): void {
  mode = next;
  pi.appendEntry(ENTRY_TYPE, { mode: next });
  ctx.ui.notify(`GOV.UK style: ${next}`, "info");
}

export default function govukExtension(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    mode = "on";

    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
        const candidate = (entry as { data?: { mode?: GovukMode } }).data?.mode;
        if (candidate === "on" || candidate === "off") mode = candidate;
      }
    }
  });

  pi.on("before_agent_start", async (event) => {
    if (mode === "off") return;
    return { systemPrompt: `${event.systemPrompt}\n\n${GOVUK_PROMPT}` };
  });

  pi.registerCommand("govuk", {
    description: "Set GOV.UK style mode: on|off|status",
    handler: async (args, ctx) => {
      const next = parseMode(args);

      if (next === "status") {
        ctx.ui.notify(`GOV.UK style: ${mode}`, "info");
        return;
      }

      if (!next) {
        ctx.ui.notify("Usage: /govuk [on|off|status]", "warning");
        return;
      }

      setMode(next, ctx, pi);
    },
  });
}
