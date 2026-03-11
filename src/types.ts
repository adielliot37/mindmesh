export interface KnowledgeFragment {
  id: string;
  domain: string;
  content: string;
  embedding: number[];
  metadata: FragmentMetadata;
  cid?: string;
}

export interface FragmentMetadata {
  source_url?: string;
  ingested_at: string;
  ingested_by: string;
  chunk_index: number;
  total_chunks: number;
  tags: string[];
}

export interface DomainManifest {
  domain: string;
  space_did: string;
  updated_at: string;
  fragments: ManifestEntry[];
  manifest_cid?: string;
}

export interface ManifestEntry {
  cid: string;
  summary: string;
  embedding_preview: [number, number];
  ingested_at: string;
  tags: string[];
}

export interface DelegationPolicy {
  agents: Record<string, AgentPolicy>;
}

export interface AgentPolicy {
  did: string;
  domains: Record<string, DomainAccess>;
}

export interface DomainAccess {
  abilities: string[];
  expiration_hours: number;
}

export interface KnowledgeGraphConfig {
  storacha: {
    private_key: string;
    proof: string;
  };
  domains: Record<string, { space_did: string; description: string }>;
  embedding: {
    provider: "openai" | "custom";
    model: string;
    api_key: string;
    dimensions: number;
  };
  chunking: {
    strategy: "fixed" | "semantic";
    chunk_size: number;
    overlap: number;
  };
  mcp: {
    transport: "stdio" | "http";
    port?: number;
  };
}

export interface SearchResult {
  cid: string;
  domain: string;
  content: string;
  score: number;
  metadata: FragmentMetadata;
}

export interface DomainInfo {
  name: string;
  space_did: string;
  access: "read" | "write" | "none";
  fragment_count: number;
  last_updated: string;
  delegation_expires: string;
}

export interface IngestResult {
  fragments_created: number;
  cids: string[];
  domain: string;
  manifest_cid: string;
}

export interface SearchRequest {
  query: string;
  domains?: string[];
  top_k?: number;
  min_score?: number;
  tags?: string[];
  since?: string;
}
