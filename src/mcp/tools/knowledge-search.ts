import { z } from "zod";
import { KnowledgeGraph } from "../../core/knowledge-graph.js";
import { AuthMiddleware } from "../auth-middleware.js";

export const knowledgeSearchSchema = z.object({
  query: z.string().describe("Natural language search query"),
  domains: z.array(z.string()).optional().describe("Filter to specific domains"),
  top_k: z.number().min(1).max(20).default(5).describe("Max results"),
  min_score: z.number().min(0).max(1).default(0.7).describe("Minimum similarity threshold"),
  tags: z.array(z.string()).optional().describe("Filter by tags"),
  since: z.string().optional().describe("ISO date, only fragments after this date"),
});

export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>;

export function createKnowledgeSearchHandler(
  knowledgeGraph: KnowledgeGraph,
  authMiddleware: AuthMiddleware
) {
  return async (agentDid: string, input: KnowledgeSearchInput) => {
    const ctx = authMiddleware.authenticate(agentDid);

    const results = await knowledgeGraph.search(agentDid, {
      query: input.query,
      domains: input.domains,
      top_k: input.top_k,
      min_score: input.min_score,
      tags: input.tags,
      since: input.since,
    });

    return {
      results: results.map((r) => ({
        cid: r.cid,
        domain: r.domain,
        content: r.content,
        score: r.score,
        metadata: {
          source_url: r.metadata.source_url,
          ingested_at: r.metadata.ingested_at,
          tags: r.metadata.tags,
        },
      })),
      authorized_domains: ctx.authorizedDomains,
      total_fragments_searched: results.length,
    };
  };
}
