import { lstat, mkdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export type RecallThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export interface RecallConfig {
  model?: string;
  thinkingLevel: RecallThinkingLevel;
  display: boolean;
  libraries: string[];
}

export interface Recommendation {
  source: string;
  reason: string;
}

export const DEFAULT_CONFIG: RecallConfig = {
  model: undefined,
  thinkingLevel: "off",
  display: true,
  libraries: ["~/.claude/skills", "~/.pi/agent/skills", "~/.agents/skills"],
};

const THINKING_LEVELS = new Set<RecallThinkingLevel>(["off", "minimal", "low", "medium", "high", "xhigh"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLibraries(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim() !== "").map((item) => item.trim()))]
    : [...fallback];
}

export function normalizeConfig(value: unknown): RecallConfig {
  if (!isRecord(value)) return { ...DEFAULT_CONFIG, libraries: [...DEFAULT_CONFIG.libraries] };

  const model = typeof value.model === "string" && value.model.trim() ? value.model.trim() : undefined;
  const thinkingLevel =
    typeof value.thinkingLevel === "string" && THINKING_LEVELS.has(value.thinkingLevel as RecallThinkingLevel)
      ? (value.thinkingLevel as RecallThinkingLevel)
      : DEFAULT_CONFIG.thinkingLevel;
  const display = typeof value.display === "boolean" ? value.display : DEFAULT_CONFIG.display;
  const libraries = normalizeLibraries(value.libraries, DEFAULT_CONFIG.libraries);

  return { model, thinkingLevel, display, libraries };
}

export function expandPath(input: string, cwd: string): string {
  if (input === "~") return homedir();
  if (input.startsWith("~/")) return resolve(homedir(), input.slice(2));
  return isAbsolute(input) ? resolve(input) : resolve(cwd, input);
}

export function isPathInside(candidate: string, root: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export async function safeProjectConfigPath(cwd: string, createDirectory = false): Promise<string> {
  const root = await realpath(cwd);
  const directory = join(root, ".pi");

  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${directory} must be a real directory`);
    if (!isPathInside(await realpath(directory), root)) throw new Error(`${directory} is outside the project`);
  } catch (error) {
    if (!isMissingPath(error)) throw error;
    if (createDirectory) await mkdir(directory);
  }

  const path = join(directory, "recall.json");
  try {
    if ((await lstat(path)).isSymbolicLink()) throw new Error(`${path} must not be a symbolic link`);
  } catch (error) {
    if (!isMissingPath(error)) throw error;
  }
  return path;
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export function splitGlobPattern(path: string): { base: string; pattern: string } | undefined {
  const magicIndex = [path.indexOf("*"), path.indexOf("?"), path.indexOf("[")]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  if (magicIndex === undefined) return undefined;

  const boundary = path.lastIndexOf(sep, magicIndex);
  if (boundary === -1) return { base: ".", pattern: path };
  return {
    base: boundary === 0 ? sep : path.slice(0, boundary),
    pattern: path.slice(boundary + 1),
  };
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter((part): part is { type: "text"; text: string } => isRecord(part) && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

export function serializeRun(messages: unknown[], maxCharacters = 50_000): string {
  const blocks: string[] = [];

  for (const message of messages) {
    if (!isRecord(message) || typeof message.role !== "string") continue;
    if (message.role === "custom" && message.customType === "recall") continue;
    if (message.role !== "user" && message.role !== "assistant" && message.role !== "toolResult") continue;

    const text = textContent(message.content).trim();
    if (!text) continue;
    const label = message.role === "toolResult" && typeof message.toolName === "string" ? `tool:${message.toolName}` : message.role;
    blocks.push(`[${label}]\n${text}`);
  }

  const serialized = blocks.join("\n\n");
  return serialized.length <= maxCharacters ? serialized : serialized.slice(-maxCharacters);
}

export function parseModelReference(reference: string): { provider: string; modelId: string } | undefined {
  const slash = reference.indexOf("/");
  if (slash <= 0 || slash === reference.length - 1) return undefined;
  return { provider: reference.slice(0, slash), modelId: reference.slice(slash + 1) };
}
