import { basename } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

function sanitizeStatusText(text: string): string {
    return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
}

function installFooter(pi: ExtensionAPI, ctx: ExtensionContext) {
    ctx.ui.setFooter((_tui, theme, footerData) => ({
        dispose: () => { },
        invalidate() { },
        render(width: number): string[] {
            const pad = 1;
            const inner = width - pad * 2;
            if (inner < 1) return [];
            const pl = " ".repeat(pad);
            const pr = " ".repeat(pad);

            const project = basename(ctx.cwd) || "project";

            const percent = ctx.getContextUsage()?.percent;
            const remaining = percent === null || percent === undefined ? undefined : 100 - percent;
            const percentStr = remaining === undefined ? "?" : `${remaining.toFixed(1)}%`;

            const model = ctx.model?.id || "no-model";
            const thinking = pi.getThinkingLevel();

            // Read label from extension status (set by label.ts)
            const label = footerData.getExtensionStatuses().get("__label");
            const leftText = label
                ? `${project} • ${label}`
                : project;
            const left = theme.fg("dim", leftText);
            const right = theme.fg("dim", `${model} (${thinking}) ${percentStr}`);

            const rightWidth = visibleWidth(right);
            if (rightWidth >= inner) {
                return [pl + truncateToWidth(right, inner) + pr];
            }

            const minGap = 2;
            const maxLeftWidth = Math.max(1, inner - rightWidth - minGap);
            const leftFitted = truncateToWidth(left, maxLeftWidth);
            const gap = " ".repeat(Math.max(minGap, inner - visibleWidth(leftFitted) - rightWidth));
            const lines = [pl + truncateToWidth(leftFitted + gap + right, inner) + pr];

            // Show extension statuses (excluding our internal __label key)
            const extensionStatuses = Array.from(footerData.getExtensionStatuses().entries())
                .filter(([key]) => key !== "__label")
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, text]) => sanitizeStatusText(text))
                .filter((text) => text.length > 0);
            if (extensionStatuses.length > 0) {
                lines.push(pl + truncateToWidth(theme.fg("dim", extensionStatuses.join("  ")), inner) + pr);
            }

            return lines;
        },
    }));
}

export default function (pi: ExtensionAPI) {
    pi.on("session_start", async (_event, ctx) => {
        installFooter(pi, ctx);
    });

    pi.on("model_select", async (_event, ctx) => {
        installFooter(pi, ctx);
    });
}
