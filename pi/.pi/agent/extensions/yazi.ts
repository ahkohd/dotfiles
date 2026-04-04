import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

export default function yaziExtension(pi: ExtensionAPI): void {
  const cwd = process.cwd();

  pi.registerCommand("fzf", {
    description: "Fuzzy find files",
    handler: async (_args, ctx) => {
      const result = spawnSync("fzf", ["--multi"], { cwd, stdio: ["inherit", "pipe", "inherit"], env: { ...process.env, FZF_DEFAULT_COMMAND: "rg --files --hidden --glob '!.git' --glob '!.jj'" } });
      if (result.stdout) {
        const files = result.stdout.toString().trim().split("\n").filter(Boolean);
        if (files.length) {
          await new Promise((r) => setTimeout(r, 50));
          ctx.ui.pasteToEditor(files.map((f) => join(cwd, f)).join(" ") + " ");
        }
      }
    },
  });

  pi.registerCommand("ya", {
    description: "Open file picker",
    handler: async (args, ctx) => {
      const tempFile = join(tmpdir(), `yazi-chooser-${randomBytes(6).toString("hex")}`);
      const yaziArgs = ["--chooser-file", tempFile];

      if (args) {
        yaziArgs.push(...args.split(" "));
      } else {
        yaziArgs.push(cwd);
      }

      spawnSync("yazi", yaziArgs, { cwd, stdio: "inherit" });

      // Read selected file(s) and paste paths into editor
      try {
        const chosen = readFileSync(tempFile, "utf-8").trim();
        unlinkSync(tempFile);

        if (chosen) {
          const files = chosen.split("\n").filter(Boolean);
          const fileList = files.join(" ");
          ctx.ui.pasteToEditor(fileList + " ");
        }
      } catch {
        try { unlinkSync(tempFile); } catch {}
      }
    },
  });
}
