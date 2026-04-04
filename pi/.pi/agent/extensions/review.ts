import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawnSync } from "node:child_process";

export default function reviewExtension(pi: ExtensionAPI): void {
  const cwd = process.cwd();

  pi.registerCommand("review", {
    description: "Review changes",
    handler: async () => {
      spawnSync("tuicr", [], { cwd, stdio: "inherit" });
    },
  });
}
