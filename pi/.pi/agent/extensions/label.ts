/**
 * Label — Simple session label for the footer
 *
 * Commands:
 *   /label set <text>  — Set the label
 *   /label clear       — Remove the label
 *   /label hide        — Hide the label from the footer
 *   /label show        — Show the label in the footer again
 *
 * The label appears in the footer as: project • label
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

let label: string | undefined;

export default function (pi: ExtensionAPI) {
    pi.registerCommand("label", {
        description: "Set, clear, hide, or show a session label",
        handler: async (args: string, ctx) => {
            const trimmed = args.trim();
            const spaceIdx = trimmed.indexOf(" ");
            const sub = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
            const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

            switch (sub) {
                case "set": {
                    if (!rest) {
                        ctx.ui.notify("Usage: /label set <text>", "warning");
                        return;
                    }
                    label = rest;
                    ctx.ui.setStatus("__label", rest);
                    ctx.ui.notify(`Label set: ${rest}`, "success");
                    break;
                }
                case "clear": {
                    label = undefined;
                    ctx.ui.setStatus("__label", undefined);
                    ctx.ui.notify("Label cleared", "success");
                    break;
                }
                case "hide": {
                    if (!label) {
                        ctx.ui.notify("No label to hide", "warning");
                        return;
                    }
                    ctx.ui.setStatus("__label", undefined);
                    ctx.ui.notify("Label hidden", "success");
                    break;
                }
                case "show": {
                    if (!label) {
                        ctx.ui.notify("No label to show", "warning");
                        return;
                    }
                    ctx.ui.setStatus("__label", label);
                    ctx.ui.notify(`Label: ${label}`, "success");
                    break;
                }
                default:
                    ctx.ui.notify("Usage: /label set|clear|hide|show", "warning");
            }
        },
    });
}
