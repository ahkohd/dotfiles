import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export default function nvimExtension(pi: ExtensionAPI): void {
  const cwd = process.cwd();

  pi.registerCommand("edit", {
    description: "Edit file",
    handler: async (args) => {
      let files: string[];

      if (args) {
        files = args.split(" ").map((f) => resolve(cwd, f));
      } else {
        const result = spawnSync("fzf", ["--multi"], {
          cwd,
          stdio: ["inherit", "pipe", "inherit"],
          env: { ...process.env, FZF_DEFAULT_COMMAND: "rg --files --hidden --glob '!.git' --glob '!.jj'" },
        });
        files = result.stdout
          ? result.stdout.toString().trim().split("\n").filter(Boolean).map((f) => resolve(cwd, f))
          : [];
      }

      if (files.length) {
        spawnSync("nvim", files, { cwd, stdio: "inherit" });
      }
    },
  });
}
