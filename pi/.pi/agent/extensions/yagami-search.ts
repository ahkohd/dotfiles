import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ENV_PATH = join(homedir(), ".pi", "agent", "env.json");

function getYagamiBase(): string {
  if (process.env.YAGAMI_URL && process.env.YAGAMI_URL.trim()) {
    return process.env.YAGAMI_URL.trim();
  }

  try {
    if (existsSync(ENV_PATH)) {
      const env = JSON.parse(readFileSync(ENV_PATH, "utf8")) as { YAGAMI_URL?: unknown };
      if (typeof env.YAGAMI_URL === "string" && env.YAGAMI_URL.trim()) {
        return env.YAGAMI_URL.trim();
      }
    }
  } catch {
    // ignore malformed env.json and fall through to default
  }

  return "http://127.0.0.1:43111";
}

type YagamiResponse = {
  ok?: boolean;
  error?: string;
  result?: unknown;
};

type RenderTheme = {
  bold: (text: string) => string;
  fg: (token: string, text: string) => string;
};

type RenderArgs = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function renderCallLine(toolName: string, value: unknown, theme: RenderTheme): Text {
  return new Text(`${theme.bold(toolName)} ${theme.fg("muted", asString(value))}`, 0, 0);
}

async function yagamiPost(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${getYagamiBase()}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yagami error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as YagamiResponse;
  if (!data.ok) throw new Error(data.error || "Unknown yagami error");
  return data.result;
}

function errResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], details: {}, isError: true };
}

function okResult(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

function formatResult(result: unknown): string {
  if (typeof result === "string") return result;
  if (isRecord(result) && typeof result.answer === "string") return result.answer;
  if (isRecord(result) && typeof result.text === "string") return result.text;
  return JSON.stringify(result, null, 2);
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Yagami Search",
    description:
      "Search the web for any topic and get clean, ready-to-use content.\n\n" +
      "Best for: Finding current information, news, facts, or answering questions about any topic.\n" +
      "Returns: Clean text content from top search results, ready for LLM use.",
    renderCall(args: RenderArgs, theme: RenderTheme) {
      return renderCallLine("web_search", args.query, theme);
    },
    parameters: Type.Object({
      query: Type.String({ description: "Web search query" }),
    }),
    async execute(_id, params) {
      try {
        const result = await yagamiPost("/search", { query: params.query });
        return okResult(formatResult(result));
      } catch (error: unknown) {
        return errResult(`Search error: ${errorMessage(error)}`);
      }
    },
  });

  pi.registerTool({
    name: "get_code_context",
    label: "Yagami Code Search",
    description:
      "Find code examples, documentation, and programming solutions. Searches GitHub, Stack Overflow, and official docs.\n\n" +
      "Best for: Any programming question - API usage, library examples, code snippets, debugging help.\n" +
      "Returns: Relevant code and documentation, formatted for easy reading.",
    renderCall(args: RenderArgs, theme: RenderTheme) {
      return renderCallLine("get_code_context", args.query, theme);
    },
    parameters: Type.Object({
      query: Type.String({ description: "Search query for code context." }),
    }),
    async execute(_id, params) {
      try {
        const result = await yagamiPost("/code-context", { query: params.query });
        return okResult(formatResult(result));
      } catch (error: unknown) {
        return errResult(`Code search error: ${errorMessage(error)}`);
      }
    },
  });

  pi.registerTool({
    name: "fetch_content",
    label: "Yagami Fetch",
    description:
      "Get the full content of a specific webpage. Use when you have an exact URL.\n\n" +
      "Best for: Extracting content from a known URL.\n" +
      "Returns: Full text content and metadata from the page.",
    renderCall(args: RenderArgs, theme: RenderTheme) {
      return renderCallLine("fetch_content", args.url, theme);
    },
    parameters: Type.Object({
      url: Type.String({ description: "URL to crawl and extract content from" }),
      maxCharacters: Type.Optional(Type.Number({ description: "Maximum characters to extract (default: 3000)" })),
    }),
    async execute(_id, params) {
      try {
        const result = await yagamiPost("/fetch", {
          url: params.url,
          maxCharacters: params.maxCharacters || 3000,
        });
        return okResult(formatResult(result));
      } catch (error: unknown) {
        return errResult(`Fetch error: ${errorMessage(error)}`);
      }
    },
  });

  pi.registerTool({
    name: "company_research",
    label: "Yagami Company Research",
    description:
      "Research any company to get business information, news, and insights.\n\n" +
      "Best for: Learning about a company's products, services, recent news, or industry position.\n" +
      "Returns: Company information from trusted business sources.",
    renderCall(args: RenderArgs, theme: RenderTheme) {
      return renderCallLine("company_research", args.companyName, theme);
    },
    parameters: Type.Object({
      companyName: Type.String({ description: "Name of the company to research" }),
    }),
    async execute(_id, params) {
      try {
        const result = await yagamiPost("/company-research", { companyName: params.companyName });
        return okResult(formatResult(result));
      } catch (error: unknown) {
        return errResult(`Company research error: ${errorMessage(error)}`);
      }
    },
  });

  pi.registerTool({
    name: "web_search_advanced",
    label: "Yagami Advanced Search",
    description:
      "Advanced web search with full control over filters, domains, dates, and content options.\n\n" +
      "Best for: When you need specific filters like date ranges, domain restrictions, or category filters.\n" +
      "Not recommended for: Simple searches - use web_search instead.\n" +
      "Returns: Search results with optional highlights, summaries, and subpage content.",
    renderCall(args: RenderArgs, theme: RenderTheme) {
      return renderCallLine("web_search_advanced", args.query, theme);
    },
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      includeDomains: Type.Optional(
        Type.Array(Type.String(), { description: "Only include results from these domains" }),
      ),
      excludeDomains: Type.Optional(Type.Array(Type.String(), { description: "Exclude results from these domains" })),
      category: Type.Optional(Type.String({ description: "Filter results to a specific category" })),
    }),
    async execute(_id, params) {
      try {
        const result = await yagamiPost("/search/advanced", params);
        return okResult(formatResult(result));
      } catch (error: unknown) {
        return errResult(`Advanced search error: ${errorMessage(error)}`);
      }
    },
  });

  pi.registerTool({
    name: "find_similar",
    label: "Yagami Similar",
    description:
      "Find web pages similar to a given URL. Useful for finding alternatives, related resources, or similar documentation.",
    renderCall(args: RenderArgs, theme: RenderTheme) {
      return renderCallLine("find_similar", args.url, theme);
    },
    parameters: Type.Object({
      url: Type.String({ description: "URL to find similar pages for" }),
    }),
    async execute(_id, params) {
      try {
        const result = await yagamiPost("/find-similar", { url: params.url });
        return okResult(formatResult(result));
      } catch (error: unknown) {
        return errResult(`Find similar error: ${errorMessage(error)}`);
      }
    },
  });

  pi.registerTool({
    name: "deep_research_start",
    label: "Yagami Deep Research",
    description:
      "Start an AI research agent that searches, reads, and writes a detailed report.\n\n" +
      "Best for: Complex research questions needing deep analysis and synthesis.\n" +
      "Returns: Research ID - use deep_research_check to get results.\n" +
      "Important: Call deep_research_check with the returned research ID to get the report.",
    renderCall(args: RenderArgs, theme: RenderTheme) {
      const preview = asString(args.instructions).slice(0, 80);
      return renderCallLine("deep_research_start", preview, theme);
    },
    parameters: Type.Object({
      instructions: Type.String({ description: "Complex research question or detailed instructions." }),
      effort: Type.Optional(
        StringEnum(["fast", "balanced", "thorough"] as const, {
          description: "'fast', 'balanced', or 'thorough'. Default: fast",
        }),
      ),
    }),
    async execute(_id, params) {
      try {
        const result = await yagamiPost("/deep-research/start", {
          instructions: params.instructions,
          effort: params.effort || "fast",
        });
        return okResult(JSON.stringify(result, null, 2));
      } catch (error: unknown) {
        return errResult(`Research start error: ${errorMessage(error)}`);
      }
    },
  });

  pi.registerTool({
    name: "deep_research_check",
    label: "Yagami Research Check",
    description:
      "Check status and get results from a deep research task.\n\n" +
      "Best for: Getting the research report after calling deep_research_start.\n" +
      "Returns: Research report when complete, or status update if still running.\n" +
      "Important: Keep calling with the same research ID until status is 'completed'.",
    renderCall(args: RenderArgs, theme: RenderTheme) {
      return renderCallLine("deep_research_check", args.researchId, theme);
    },
    parameters: Type.Object({
      researchId: Type.String({ description: "The research ID returned from deep_research_start" }),
    }),
    async execute(_id, params) {
      try {
        const result = await yagamiPost("/deep-research/check", { researchId: params.researchId });
        return okResult(JSON.stringify(result, null, 2));
      } catch (error: unknown) {
        return errResult(`Research check error: ${errorMessage(error)}`);
      }
    },
  });
}
