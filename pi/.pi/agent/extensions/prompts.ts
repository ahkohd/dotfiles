import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

interface Prompt {
  name: string;
  description: string;
  prompt: string;
  source: "global" | "project";
}

function parseTOML(content: string): Record<string, { description?: string; prompt?: string }> {
  const result: Record<string, { description?: string; prompt?: string }> = {};
  let currentSection = "";
  let currentKey = "";
  let multiLineValue = "";
  let inMultiLine = false;

  for (const line of content.split("\n")) {
    if (inMultiLine) {
      if (line.includes('"""')) {
        multiLineValue += line.split('"""')[0];
        if (currentSection && currentKey) {
          if (!result[currentSection]) result[currentSection] = {};
          (result[currentSection] as any)[currentKey] = multiLineValue;
        }
        inMultiLine = false;
        continue;
      }
      multiLineValue += line + "\n";
      continue;
    }

    const sectionMatch = line.match(/^\[([^\]]+)\]/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!result[currentSection]) result[currentSection] = {};
      continue;
    }

    const kvMatch = line.match(/^(\w+)\s*=\s*"""(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const rest = kvMatch[2];
      if (rest.includes('"""')) {
        multiLineValue = rest.split('"""')[0];
        if (currentSection) {
          (result[currentSection] as any)[currentKey] = multiLineValue;
        }
      } else {
        multiLineValue = rest + "\n";
        inMultiLine = true;
      }
      continue;
    }

    const simpleKV = line.match(/^(\w+)\s*=\s*"(.*)"/);
    if (simpleKV && currentSection) {
      (result[currentSection] as any)[simpleKV[1]] = simpleKV[2];
    }
  }

  return result;
}

function loadPrompts(cwd: string): Prompt[] {
  const prompts: Map<string, Prompt> = new Map();

  // Global prompts
  const globalPath = join(homedir(), ".pi", "agent", "prompts.toml");
  if (existsSync(globalPath)) {
    const parsed = parseTOML(readFileSync(globalPath, "utf-8"));
    for (const [name, entry] of Object.entries(parsed)) {
      prompts.set(name, {
        name,
        description: entry.description ?? "",
        prompt: entry.prompt ?? "",
        source: "global",
      });
    }
  }

  // Project-local prompts (override global)
  const localPath = join(cwd, ".pi", "prompts.toml");
  if (existsSync(localPath)) {
    const parsed = parseTOML(readFileSync(localPath, "utf-8"));
    for (const [name, entry] of Object.entries(parsed)) {
      prompts.set(name, {
        name,
        description: entry.description ?? "",
        prompt: entry.prompt ?? "",
        source: "project",
      });
    }
  }

  return Array.from(prompts.values());
}

export default function promptsExtension(pi: ExtensionAPI): void {
  const cwd = process.cwd();

  pi.registerCommand("prompts", {
    description: "Pick a saved prompt",
    handler: async (_args, ctx) => {
      const prompts = loadPrompts(cwd);

      if (prompts.length === 0) {
        ctx.ui.notify("No prompts found. Add them to ~/.pi/agent/prompts.toml", "info");
        return;
      }

      const labels = prompts.map(
        (p) => `${p.name}${p.description ? ` — ${p.description}` : ""}${p.source === "project" ? " (local)" : ""}`
      );

      const choice = await ctx.ui.select("Pick a prompt:", labels);
      if (!choice) return;

      const index = labels.indexOf(choice);
      if (index >= 0) {
        ctx.ui.pasteToEditor(prompts[index].prompt + " ");
      }
    },
  });
}
