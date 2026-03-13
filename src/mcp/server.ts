import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KnowledgeGraph } from "../core/knowledge-graph.js";
import { AuthMiddleware } from "./auth-middleware.js";
import { loadConfig } from "../config.js";
import { createKnowledgeSearchHandler, knowledgeSearchSchema } from "./tools/knowledge-search.js";
import { createKnowledgeIngestHandler, knowledgeIngestSchema } from "./tools/knowledge-ingest.js";
import { createKnowledgeDomainsHandler } from "./tools/knowledge-domains.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("mcp-server");

export async function startServer() {
  const config = loadConfig();
  const kg = new KnowledgeGraph(config);
  await kg.initialize();

  const authMiddleware = new AuthMiddleware(kg.getDelegationManager());

  const searchHandler = createKnowledgeSearchHandler(kg, authMiddleware);
  const ingestHandler = createKnowledgeIngestHandler(kg, authMiddleware);
  const domainsHandler = createKnowledgeDomainsHandler(kg, authMiddleware);

  const server = new McpServer({
    name: "storacha-knowledge",
    version: "0.1.0",
  });

  server.tool(
    "knowledge_search",
    "Search the shared knowledge graph for relevant fragments. Only returns results from domains the calling agent is authorized to access.",
    {
      query: z.string().describe("Natural language search query"),
      domains: z.array(z.string()).optional().describe("Filter to specific domains"),
      top_k: z.number().min(1).max(20).default(5).describe("Max results"),
      min_score: z.number().min(0).max(1).default(0.7).describe("Minimum similarity threshold"),
      tags: z.array(z.string()).optional().describe("Filter by tags"),
      since: z.string().optional().describe("ISO date filter"),
    },
    async (params, extra) => {
      try {
        const agentDid = extractAgentDid(extra);
        const result = await searchHandler(agentDid, params);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "knowledge_ingest",
    "Add new knowledge fragments to a domain. Requires write delegation on the target domain.",
    {
      domain: z.string().describe("Target domain name"),
      content: z.string().describe("Raw text content to ingest"),
      source_url: z.string().optional().describe("Origin URL"),
      tags: z.array(z.string()).optional().default([]).describe("Tags"),
      chunk_strategy: z.enum(["fixed", "semantic"]).optional().default("semantic").describe("Chunking strategy"),
    },
    async (params, extra) => {
      try {
        const agentDid = extractAgentDid(extra);
        const result = await ingestHandler(agentDid, params);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.tool(
    "knowledge_domains",
    "List all knowledge domains and your access level for each.",
    {},
    async (_params, extra) => {
      try {
        const agentDid = extractAgentDid(extra);
        const result = await domainsHandler(agentDid);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("MCP server started");
}

function extractAgentDid(extra: any): string {
  return (
    extra?.meta?.agentDid ||
    process.env.AGENT_DID ||
    "did:key:anonymous"
  );
}

startServer().catch((err) => {
  console.error("failed to start server:", err);
  process.exit(1);
});
