import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ENV_PATH = join(homedir(), ".pi", "agent", "env.json");
const EXA_BASE = "https://api.exa.ai";

function getApiKey(): string | null {
  if (process.env.EXA_API_KEY) return process.env.EXA_API_KEY;
  try {
    if (existsSync(ENV_PATH)) {
      const env = JSON.parse(readFileSync(ENV_PATH, "utf-8"));
      if (env.EXA_API_KEY) return env.EXA_API_KEY;
    }
  } catch {}
  return null;
}

function requireApiKey(): string {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      "Exa API key not found. Either:\n" +
        '  1. Add EXA_API_KEY to ~/.pi/agent/env.json\n' +
        "  2. Set EXA_API_KEY environment variable\n" +
        "Get a key at https://exa.ai"
    );
  }
  return key;
}

async function exaPost(endpoint: string, body: Record<string, any>, integration: string): Promise<any> {
  const res = await fetch(`${EXA_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      "x-api-key": requireApiKey(),
      "x-exa-integration": integration,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Exa API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function exaGet(endpoint: string, integration: string): Promise<any> {
  const res = await fetch(`${EXA_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": requireApiKey(),
      "x-exa-integration": integration,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Exa API error ${res.status}: ${text}`);
  }
  return res.json();
}

function errResult(msg: string) {
  return { content: [{ type: "text" as const, text: msg }], details: {}, isError: true };
}

function okResult(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Exa Search",
    description:
      "Search the web for any topic and get clean, ready-to-use content.\n\n" +
      "Best for: Finding current information, news, facts, or answering questions about any topic.\n" +
      "Returns: Clean text content from top search results, ready for LLM use.",
    parameters: Type.Object({
      query: Type.String({ description: "Web search query" }),
      numResults: Type.Optional(
        Type.Number({ description: "Number of results to return (default: 8)" })
      ),
      livecrawl: Type.Optional(
        StringEnum(["fallback", "preferred"] as const, {
          description:
            "Live crawl mode - 'fallback': use live crawling as backup (default), 'preferred': prioritize live crawling",
        })
      ),
      type: Type.Optional(
        StringEnum(["auto", "fast"] as const, {
          description: "Search type - 'auto': balanced (default), 'fast': quick results",
        })
      ),
      contextMaxCharacters: Type.Optional(
        Type.Number({ description: "Max characters for context string (default: 10000)" })
      ),
    }),
    async execute(_id, params) {
      try {
        const data = await exaPost(
          "/search",
          {
            query: params.query,
            type: params.type || "auto",
            numResults: params.numResults || 8,
            contents: {
              text: true,
              context: { maxCharacters: params.contextMaxCharacters || 10000 },
              livecrawl: params.livecrawl || "fallback",
            },
          },
          "web-search-mcp"
        );
        return okResult(data.context || JSON.stringify(data.results, null, 2));
      } catch (e: any) {
        return errResult(`Search error: ${e.message}`);
      }
    },
  });

  pi.registerTool({
    name: "get_code_context",
    label: "Exa Code Search",
    description:
      "Find code examples, documentation, and programming solutions. Searches GitHub, Stack Overflow, and official docs.\n\n" +
      "Best for: Any programming question - API usage, library examples, code snippets, debugging help.\n" +
      "Returns: Relevant code and documentation, formatted for easy reading.",
    parameters: Type.Object({
      query: Type.String({
        description:
          "Search query for code context. E.g. 'React useState hook examples', 'Python pandas filtering', 'Express.js middleware'",
      }),
      tokensNum: Type.Optional(
        Type.Number({
          description:
            "Number of tokens to return (1000-50000, default: 5000). Lower for focused queries, higher for comprehensive docs.",
        })
      ),
    }),
    async execute(_id, params) {
      try {
        const data = await exaPost(
          "/context",
          { query: params.query, tokensNum: params.tokensNum || 5000 },
          "exa-code-mcp"
        );
        const content =
          typeof data.response === "string" ? data.response : JSON.stringify(data.response, null, 2);
        return okResult(content);
      } catch (e: any) {
        return errResult(`Code search error: ${e.message}`);
      }
    },
  });

  pi.registerTool({
    name: "fetch_content",
    label: "Exa Crawl",
    description:
      "Get the full content of a specific webpage. Use when you have an exact URL.\n\n" +
      "Best for: Extracting content from a known URL.\n" +
      "Returns: Full text content and metadata from the page.",
    parameters: Type.Object({
      url: Type.String({ description: "URL to crawl and extract content from" }),
      maxCharacters: Type.Optional(
        Type.Number({ description: "Maximum characters to extract (default: 3000)" })
      ),
    }),
    async execute(_id, params) {
      try {
        const data = await exaPost(
          "/contents",
          {
            ids: [params.url],
            contents: {
              text: { maxCharacters: params.maxCharacters || 3000 },
              livecrawl: "preferred",
            },
          },
          "crawling-mcp"
        );
        return okResult(JSON.stringify(data, null, 2));
      } catch (e: any) {
        return errResult(`Crawling error: ${e.message}`);
      }
    },
  });

  pi.registerTool({
    name: "company_research",
    label: "Exa Company Research",
    description:
      "Research any company to get business information, news, and insights.\n\n" +
      "Best for: Learning about a company's products, services, recent news, or industry position.\n" +
      "Returns: Company information from trusted business sources.",
    parameters: Type.Object({
      companyName: Type.String({ description: "Name of the company to research" }),
      numResults: Type.Optional(
        Type.Number({ description: "Number of results (default: 3)" })
      ),
    }),
    async execute(_id, params) {
      try {
        const data = await exaPost(
          "/search",
          {
            query: `${params.companyName} company`,
            type: "auto",
            numResults: params.numResults || 3,
            category: "company",
            contents: { text: { maxCharacters: 7000 } },
          },
          "company-research-mcp"
        );
        return okResult(JSON.stringify(data, null, 2));
      } catch (e: any) {
        return errResult(`Company research error: ${e.message}`);
      }
    },
  });

  pi.registerTool({
    name: "web_search_advanced",
    label: "Exa Advanced Search",
    description:
      "Advanced web search with full control over filters, domains, dates, and content options.\n\n" +
      "Best for: When you need specific filters like date ranges, domain restrictions, or category filters.\n" +
      "Not recommended for: Simple searches - use web_search instead.\n" +
      "Returns: Search results with optional highlights, summaries, and subpage content.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      numResults: Type.Optional(Type.Number({ description: "Number of results (1-100, default: 10)" })),
      type: Type.Optional(
        StringEnum(["auto", "fast", "neural"] as const, {
          description: "Search type - 'auto': balanced (default), 'fast': quick, 'neural': semantic",
        })
      ),
      category: Type.Optional(
        StringEnum(
          ["company", "research paper", "news", "pdf", "github", "tweet", "personal site", "people", "financial report"] as const,
          { description: "Filter results to a specific category" }
        )
      ),
      includeDomains: Type.Optional(
        Type.Array(Type.String(), { description: "Only include results from these domains" })
      ),
      excludeDomains: Type.Optional(
        Type.Array(Type.String(), { description: "Exclude results from these domains" })
      ),
      startPublishedDate: Type.Optional(
        Type.String({ description: "Only results published after this date (YYYY-MM-DD)" })
      ),
      endPublishedDate: Type.Optional(
        Type.String({ description: "Only results published before this date (YYYY-MM-DD)" })
      ),
      includeText: Type.Optional(
        Type.Array(Type.String(), { description: "Only results containing ALL of these strings" })
      ),
      excludeText: Type.Optional(
        Type.Array(Type.String(), { description: "Exclude results containing ANY of these strings" })
      ),
      livecrawl: Type.Optional(
        StringEnum(["never", "fallback", "always", "preferred"] as const, {
          description: "Live crawl mode (default: 'fallback')",
        })
      ),
      textMaxCharacters: Type.Optional(
        Type.Number({ description: "Max characters for text extraction per result" })
      ),
    }),
    async execute(_id, params) {
      try {
        const body: Record<string, any> = {
          query: params.query,
          type: params.type || "auto",
          numResults: params.numResults || 10,
          contents: {
            text: params.textMaxCharacters ? { maxCharacters: params.textMaxCharacters } : true,
            livecrawl: params.livecrawl || "fallback",
          },
        };
        if (params.category) body.category = params.category;
        if (params.includeDomains?.length) body.includeDomains = params.includeDomains;
        if (params.excludeDomains?.length) body.excludeDomains = params.excludeDomains;
        if (params.startPublishedDate) body.startPublishedDate = params.startPublishedDate;
        if (params.endPublishedDate) body.endPublishedDate = params.endPublishedDate;
        if (params.includeText?.length) body.includeText = params.includeText;
        if (params.excludeText?.length) body.excludeText = params.excludeText;

        const data = await exaPost("/search", body, "web-search-advanced-mcp");
        return okResult(JSON.stringify(data, null, 2));
      } catch (e: any) {
        return errResult(`Advanced search error: ${e.message}`);
      }
    },
  });

  pi.registerTool({
    name: "find_similar",
    label: "Exa Similar",
    description:
      "Find web pages similar to a given URL. Useful for finding alternatives, related resources, or similar documentation.",
    parameters: Type.Object({
      url: Type.String({ description: "URL to find similar pages for" }),
      numResults: Type.Optional(Type.Number({ description: "Number of results (default: 5)" })),
    }),
    async execute(_id, params) {
      try {
        const data = await exaPost(
          "/findSimilar",
          {
            url: params.url,
            numResults: params.numResults || 5,
            contents: { text: { maxCharacters: 3000 } },
          },
          "find-similar-mcp"
        );
        return okResult(JSON.stringify(data, null, 2));
      } catch (e: any) {
        return errResult(`Find similar error: ${e.message}`);
      }
    },
  });

  pi.registerTool({
    name: "deep_research_start",
    label: "Exa Deep Research",
    description:
      "Start an AI research agent that searches, reads, and writes a detailed report. Takes 15 seconds to 2 minutes.\n\n" +
      "Best for: Complex research questions needing deep analysis and synthesis.\n" +
      "Returns: Research ID - use deep_research_check to get results.\n" +
      "Important: Call deep_research_check with the returned research ID to get the report.",
    parameters: Type.Object({
      instructions: Type.String({
        description: "Complex research question or detailed instructions for the AI researcher.",
      }),
      model: Type.Optional(
        StringEnum(["exa-research-fast", "exa-research", "exa-research-pro"] as const, {
          description:
            "'exa-research-fast' (~15s), 'exa-research' (15-45s), 'exa-research-pro' (45s-3min). Default: exa-research-fast",
        })
      ),
    }),
    async execute(_id, params) {
      try {
        const data = await exaPost(
          "/research/v1",
          { model: params.model || "exa-research-fast", instructions: params.instructions },
          "deep-research-mcp"
        );
        if (!data.researchId) return errResult("Failed to start research task.");
        return okResult(
          JSON.stringify(
            {
              success: true,
              researchId: data.researchId,
              model: params.model || "exa-research-fast",
              message: `Research started. Call deep_research_check with researchId: "${data.researchId}"`,
            },
            null,
            2
          )
        );
      } catch (e: any) {
        return errResult(`Research start error: ${e.message}`);
      }
    },
  });

  pi.registerTool({
    name: "deep_research_check",
    label: "Exa Research Check",
    description:
      "Check status and get results from a deep research task.\n\n" +
      "Best for: Getting the research report after calling deep_research_start.\n" +
      "Returns: Research report when complete, or status update if still running.\n" +
      "Important: Keep calling with the same research ID until status is 'completed'.",
    parameters: Type.Object({
      researchId: Type.String({
        description: "The research ID returned from deep_research_start",
      }),
    }),
    async execute(_id, params) {
      try {
        // Built-in delay like the MCP server
        await new Promise((r) => setTimeout(r, 5000));
        const data = await exaGet(`/research/v1/${params.researchId}`, "deep-research-mcp");

        if (data.status === "completed") {
          return okResult(
            JSON.stringify(
              {
                success: true,
                status: "completed",
                report: data.output?.content || "No report generated",
                citations: data.citations,
                costDollars: data.costDollars,
              },
              null,
              2
            )
          );
        } else if (data.status === "running" || data.status === "pending") {
          return okResult(
            JSON.stringify(
              {
                status: data.status,
                message: "Research in progress. Call deep_research_check again with the same ID.",
              },
              null,
              2
            )
          );
        } else {
          return errResult(`Research ${data.status}. Start a new task.`);
        }
      } catch (e: any) {
        return errResult(`Research check error: ${e.message}`);
      }
    },
  });
}
