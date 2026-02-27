import { existsSync, readdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const EXT_DIR = join(homedir(), ".pi", "agent", "extensions");
const PROTECTED_EXTENSION = "ext";

function normalizeExtensionName(name: string): string {
    return name.trim().replace(/\.ts(?:\.disabled)?$/i, "");
}

function listExtensions(): Array<{ name: string; enabled: boolean }> {
    if (!existsSync(EXT_DIR)) return [];
    const map = new Map<string, { name: string; enabled: boolean }>();

    for (const file of readdirSync(EXT_DIR)) {
        if (file.endsWith(".ts")) {
            const name = normalizeExtensionName(file);
            map.set(name, { name, enabled: true });
        } else if (file.endsWith(".ts.disabled")) {
            const name = normalizeExtensionName(file);
            if (!map.has(name)) map.set(name, { name, enabled: false });
        }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function setEnabled(name: string, enabled: boolean): string {
    const ext = normalizeExtensionName(name);
    const enabledPath = join(EXT_DIR, `${ext}.ts`);
    const disabledPath = join(EXT_DIR, `${ext}.ts.disabled`);

    if (!enabled && ext === PROTECTED_EXTENSION) {
        return "Cannot disable ext.ts (it contains the extension manager).";
    }

    if (enabled) {
        if (existsSync(enabledPath)) return `${ext} is already enabled.`;
        if (!existsSync(disabledPath)) return `Extension not found: ${ext}`;
        renameSync(disabledPath, enabledPath);
        return `Enabled ${ext}.`;
    }

    if (existsSync(disabledPath)) return `${ext} is already disabled.`;
    if (!existsSync(enabledPath)) return `Extension not found: ${ext}`;
    renameSync(enabledPath, disabledPath);
    return `Disabled ${ext}.`;
}

function setOnly(targetName: string): string {
    const target = normalizeExtensionName(targetName);
    const all = listExtensions();
    if (!all.some((e) => e.name === target)) {
        return `Extension not found: ${target}`;
    }

    const keepEnabled = new Set<string>([PROTECTED_EXTENSION, target]);
    let enabledCount = 0;
    let disabledCount = 0;

    for (const ext of all) {
        if (keepEnabled.has(ext.name)) {
            if (!ext.enabled) {
                setEnabled(ext.name, true);
                enabledCount++;
            }
        } else if (ext.enabled) {
            setEnabled(ext.name, false);
            disabledCount++;
        }
    }

    return `Enabled: ext, ${target}. Disabled ${disabledCount} others${enabledCount > 0 ? `, enabled ${enabledCount}` : ""}.`;
}

export default function (pi: ExtensionAPI) {
    pi.registerCommand("ext", {
        description: "Manage extensions: /ext ls | on <name> | off <name> | toggle <name> | only <name>",
        handler: async (args, ctx) => {
            const parts = (args || "").trim().split(/\s+/).filter(Boolean);
            let action = (parts[0] || "ls").toLowerCase();
            let name = parts[1];

            const usage = "Usage: /ext ls | /ext on <name> | /ext off <name> | /ext toggle <name> | /ext only <name>\nShortcut: /ext <name> (same as toggle)";

            if (action === "ls") {
                const lines = listExtensions().map((e) => `${e.enabled ? "●" : "○"} ${e.name}`);
                ctx.ui.notify(lines.length > 0 ? lines.join("\n") : "No extensions found.", "info");
                return;
            }

            const knownActions = new Set(["on", "off", "toggle", "only"]);
            if (!knownActions.has(action)) {
                name = parts[0];
                action = "toggle";
            }

            if (!name) {
                ctx.ui.notify(usage, "warning");
                return;
            }

            let message = "";
            if (action === "on") {
                message = setEnabled(name, true);
            } else if (action === "off") {
                message = setEnabled(name, false);
            } else if (action === "only") {
                message = setOnly(name);
            } else if (action === "toggle") {
                const ext = listExtensions().find((e) => e.name === normalizeExtensionName(name!));
                if (!ext) {
                    ctx.ui.notify(`Extension not found: ${name}`, "warning");
                    return;
                }
                message = setEnabled(ext.name, !ext.enabled);
            } else {
                ctx.ui.notify(usage, "warning");
                return;
            }

            ctx.ui.notify(message, "info");
            await ctx.reload();
        },
    });
}
