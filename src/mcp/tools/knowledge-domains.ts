import { KnowledgeGraph } from "../../core/knowledge-graph.js";
import { AuthMiddleware } from "../auth-middleware.js";

export function createKnowledgeDomainsHandler(
  knowledgeGraph: KnowledgeGraph,
  authMiddleware: AuthMiddleware
) {
  return async (agentDid: string) => {
    const ctx = authMiddleware.authenticate(agentDid);
    const domains = knowledgeGraph.listDomains(agentDid);

    return {
      agent_did: ctx.agentDid,
      domains,
    };
  };
}
