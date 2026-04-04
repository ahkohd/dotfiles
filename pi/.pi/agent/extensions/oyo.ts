import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawnSync } from "node:child_process";

export default function oyoExtension(pi: ExtensionAPI): void {
  const cwd = process.cwd();

  pi.registerCommand("diff", {
    description: "Open oyo diff viewer",
    handler: async (args) => {
      const oyoArgs = args ? args.split(" ") : [];
      spawnSync("oy", oyoArgs, { cwd, stdio: "inherit" });
    },
  });
}
