import { KnowledgeGraphConfig } from "./types.js";

export const DEFAULT_CONFIG: Partial<KnowledgeGraphConfig> = {
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
    api_key: "",
    dimensions: 1536,
  },
  chunking: {
    strategy: "semantic",
    chunk_size: 512,
    overlap: 128,
  },
  mcp: {
    transport: "stdio",
  },
};

export function loadConfig(
  overrides: Partial<KnowledgeGraphConfig> = {}
): KnowledgeGraphConfig {
  const env = process.env;

  const config: KnowledgeGraphConfig = {
    storacha: {
      private_key: env.STORACHA_PRIVATE_KEY || "",
      proof: env.STORACHA_PROOF || "",
    },
    domains: buildDomainsFromEnv(env),
    embedding: {
      provider: "openai",
      model: env.EMBEDDING_MODEL || "text-embedding-3-small",
      api_key: env.OPENAI_API_KEY || "",
      dimensions: parseInt(env.EMBEDDING_DIMENSIONS || "1536", 10),
    },
    chunking: {
      strategy: (env.CHUNKING_STRATEGY as "fixed" | "semantic") || "semantic",
      chunk_size: parseInt(env.CHUNK_SIZE || "512", 10),
      overlap: parseInt(env.CHUNK_OVERLAP || "128", 10),
    },
    mcp: {
      transport:
        (env.MCP_TRANSPORT_MODE as "stdio" | "http") || "stdio",
      port: env.MCP_PORT ? parseInt(env.MCP_PORT, 10) : undefined,
    },
  };

  return { ...config, ...overrides } as KnowledgeGraphConfig;
}

function buildDomainsFromEnv(
  env: NodeJS.ProcessEnv
): Record<string, { space_did: string; description: string }> {
  const domains: Record<string, { space_did: string; description: string }> =
    {};
  const prefix = "DOMAIN_";
  const suffix = "_DID";

  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(prefix) && key.endsWith(suffix) && value) {
      const name = key
        .slice(prefix.length, -suffix.length)
        .toLowerCase()
        .replace(/_/g, "-");
      domains[name] = { space_did: value, description: name };
    }
  }

  return domains;
}
