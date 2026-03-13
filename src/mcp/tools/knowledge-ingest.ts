import { z } from "zod";
import { KnowledgeGraph } from "../../core/knowledge-graph.js";
import { AuthMiddleware } from "../auth-middleware.js";

export const knowledgeIngestSchema = z.object({
  domain: z.string().describe("Target domain name"),
  content: z.string().describe("Raw text content to ingest"),
  source_url: z.string().optional().describe("Origin URL for provenance"),
  tags: z.array(z.string()).optional().default([]).describe("Categorization tags"),
  chunk_strategy: z
    .enum(["fixed", "semantic"])
    .optional()
    .default("semantic")
    .describe("Chunking strategy"),
});

export type KnowledgeIngestInput = z.infer<typeof knowledgeIngestSchema>;

export function createKnowledgeIngestHandler(
  knowledgeGraph: KnowledgeGraph,
  authMiddleware: AuthMiddleware
) {
  return async (agentDid: string, input: KnowledgeIngestInput) => {
    authMiddleware.requireWrite(agentDid, input.domain);

    const result = await knowledgeGraph.ingest(
      agentDid,
      input.domain,
      input.content,
      input.source_url,
      input.tags,
      input.chunk_strategy
    );

    return {
      fragments_created: result.fragments_created,
      cids: result.cids,
      domain: result.domain,
      manifest_cid: result.manifest_cid,
    };
  };
}
