import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { CustomEditor } from "@mariozechner/pi-coding-agent";

const ANSI_RE = /\x1b\[[^m]*m/g;

function isBorderLine(line: string): boolean {
    const stripped = line.replace(ANSI_RE, "");
    return stripped.length > 0 && /^─+$/.test(stripped) || /^───\s*[↑↓]/.test(stripped);
}

class BorderlessEditor extends CustomEditor {
    render(width: number): string[] {
        const lines = super.render(width);
        // Remove top border entirely, blank bottom border
        if (lines.length >= 1 && isBorderLine(lines[0])) lines.splice(0, 1);
        for (let i = 0; i < lines.length; i++) {
            if (isBorderLine(lines[i])) lines[i] = "";
        }
        return lines;
    }
}

export default function (pi: ExtensionAPI) {
    const defaultMessage = "Tinkering...";

    pi.on("session_start", async (_event, ctx) => {
        ctx.ui.setEditorComponent((tui, theme, keybindings) =>
            new BorderlessEditor(tui, theme, keybindings)
        );
        ctx.ui.setWorkingMessage(defaultMessage);
    });

    pi.on("model_select", async (_event, ctx) => {
        ctx.ui.setWorkingMessage(defaultMessage);
    });

    pi.on("agent_start", async (_event, ctx) => {
        ctx.ui.setWorkingMessage(defaultMessage);
    });

    let firstLine = "";
    let settled = false;

    function trySetTitle(ctx: any) {
        const trimmed = firstLine.trim();
        if (trimmed && (/^#{1,6}\s/.test(trimmed) || /^\*\*/.test(trimmed) || /^\*[^*]/.test(trimmed))) {
            const title = trimmed.replace(/^#{1,6}\s+/, "").replace(/^\*\*(.+?)\*\*$/, "$1").replace(/^\*(.+?)\*$/, "$1");
            ctx.ui.setWorkingMessage(`${title}...`);
        }
    }

    pi.on("message_update", async (event, ctx) => {
        const evt = event.assistantMessageEvent;

        if (evt.type === "thinking_start") {
            firstLine = "";
            settled = false;
        } else if (evt.type === "thinking_delta" && !settled) {
            const newlineIdx = evt.delta.indexOf("\n");
            if (newlineIdx === -1) {
                firstLine += evt.delta;
            } else {
                firstLine += evt.delta.slice(0, newlineIdx);
                settled = true;
                trySetTitle(ctx);
            }
        } else if (evt.type === "thinking_end") {
            if (!settled) {
                trySetTitle(ctx);
            }
            firstLine = "";
            settled = false;
        }
    });

    pi.on("agent_end", async (_event, ctx) => {
        firstLine = "";
        settled = false;
        ctx.ui.setWorkingMessage(defaultMessage);
    });
}
