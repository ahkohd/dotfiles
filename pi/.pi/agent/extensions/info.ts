import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("info", {
    description: "Show session and model info",
    handler: async (_args, ctx) => {
      const model = ctx.model;
      const modelName = model?.name ?? model?.id ?? "unknown";
      const modelProvider = model?.provider ?? "unknown";
      const contextWindow = model?.contextWindow ?? 0;

      const usage = ctx.getContextUsage();
      const usedTokens = usage?.tokens ?? 0;
      const freeTokens = contextWindow - usedTokens;
      const usedPct = contextWindow > 0 ? ((usedTokens / contextWindow) * 100).toFixed(1) : "0";

      const fmt = (n: number) => n.toLocaleString();

      let info = `Model\n\n`;
      info += `  Name: ${modelName}\n`;
      info += `  Provider: ${modelProvider}\n`;
      info += `  Context: ${fmt(usedTokens)} / ${fmt(contextWindow)} (${usedPct}% used, ${fmt(freeTokens)} free)\n`;

      ctx.ui.notify(info, "info");
    },
  });
}
