import { KnowledgeGraphConfig, SearchRequest, SearchResult, IngestResult, DomainInfo } from "../types.js";
import { FragmentStore } from "./fragment-store.js";
import { ManifestManager } from "./manifest-manager.js";
import { DomainManager } from "./domain-manager.js";
import { DelegationManager } from "./delegation-manager.js";
import { OpenAIEmbeddingProvider } from "../embeddings/openai.js";
import { rankFragments } from "../embeddings/similarity.js";
import { SemanticChunker } from "../chunking/semantic-chunker.js";
import { FixedChunker } from "../chunking/fixed-chunker.js";
import { Chunker } from "../chunking/chunker.js";
import { EmbeddingProvider } from "../embeddings/provider.js";
import { createStorachaClient } from "../utils/storacha-client.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("knowledge-graph");

export class KnowledgeGraph {
  private fragmentStore!: FragmentStore;
  private manifestManager!: ManifestManager;
  private domainManager: DomainManager;
  private delegationManager: DelegationManager;
  private embeddingProvider: EmbeddingProvider;
  private chunker: Chunker;
  private initialized = false;

  constructor(private config: KnowledgeGraphConfig) {
    this.domainManager = new DomainManager(config);
    this.delegationManager = new DelegationManager();

    this.embeddingProvider = new OpenAIEmbeddingProvider(
      config.embedding.api_key,
      config.embedding.model,
      config.embedding.dimensions
    );

    this.chunker =
      config.chunking.strategy === "fixed"
        ? new FixedChunker({
            chunkSize: config.chunking.chunk_size,
            overlap: config.chunking.overlap,
          })
        : new SemanticChunker({
            chunkSize: config.chunking.chunk_size,
            overlap: config.chunking.overlap,
          });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const client = await createStorachaClient(
      this.config.storacha.private_key,
      this.config.storacha.proof
    );

    this.fragmentStore = new FragmentStore(client);
    this.manifestManager = new ManifestManager(client);
    this.initialized = true;
    log.info("knowledge graph initialized");
  }

  async search(agentDid: string, request: SearchRequest): Promise<SearchResult[]> {
    this.ensureInitialized();

    const authorizedDomains = this.delegationManager.getAuthorizedDomains(agentDid);
    const targetDomains = request.domains
      ? request.domains.filter((d) => authorizedDomains.includes(d))
      : authorizedDomains;

    if (targetDomains.length === 0) {
      log.warn({ agentDid }, "no authorized domains for search");
      return [];
    }

    const queryEmbedding = await this.embeddingProvider.embed(request.query);
    const allResults: SearchResult[] = [];

    for (const domain of targetDomains) {
      const domainRecord = this.domainManager.getDomain(domain);
      if (!domainRecord?.manifest_cid) continue;

      const manifest = await this.manifestManager.getManifest(
        domain,
        domainRecord.manifest_cid
      );

      let entries = manifest.fragments;

      if (request.tags?.length) {
        entries = entries.filter((e) =>
          request.tags!.some((t) => e.tags.includes(t))
        );
      }

      if (request.since) {
        const since = new Date(request.since);
        entries = entries.filter((e) => new Date(e.ingested_at) >= since);
      }

      const cids = entries.map((e) => e.cid);
      const fragments = await this.fragmentStore.retrieveBatch(cids);
      const ranked = rankFragments(
        queryEmbedding,
        fragments,
        request.top_k || 5,
        request.min_score || 0.7
      );

      allResults.push(...ranked);
    }

    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, request.top_k || 5);
  }

  async ingest(
    agentDid: string,
    domain: string,
    content: string,
    sourceUrl?: string,
    tags: string[] = [],
    chunkStrategy?: "fixed" | "semantic"
  ): Promise<IngestResult> {
    this.ensureInitialized();

    if (!this.delegationManager.canWrite(agentDid, domain)) {
      throw new Error(`agent ${agentDid} lacks write access to ${domain}`);
    }

    const chunker = chunkStrategy
      ? chunkStrategy === "fixed"
        ? new FixedChunker({ chunkSize: this.config.chunking.chunk_size, overlap: this.config.chunking.overlap })
        : new SemanticChunker({ chunkSize: this.config.chunking.chunk_size, overlap: this.config.chunking.overlap })
      : this.chunker;

    const chunks = chunker.chunk(content);
    const embeddings = await this.embeddingProvider.embedBatch(chunks);

    const fragments = chunks.map((chunk, i) =>
      this.fragmentStore.createFragment(domain, chunk, embeddings[i], {
        source_url: sourceUrl,
        ingested_by: agentDid,
        chunk_index: i,
        total_chunks: chunks.length,
        tags,
      })
    );

    const cids = await this.fragmentStore.storeBatch(fragments);

    const manifestEntries = fragments.map((f, i) => ({
      cid: cids[i],
      summary: f.content.substring(0, 100),
      embedding_preview: [f.embedding[0], f.embedding[1]] as [number, number],
      ingested_at: f.metadata.ingested_at,
      tags: f.metadata.tags,
    }));

    const domainRecord = this.domainManager.getDomain(domain);
    const currentManifest = domainRecord?.manifest_cid
      ? await this.manifestManager.getManifest(domain, domainRecord.manifest_cid)
      : this.manifestManager.createEmptyManifest(
          domain,
          domainRecord?.space_did
        );

    const updated = await this.manifestManager.appendEntries(
      currentManifest,
      manifestEntries
    );

    this.domainManager.updateManifestCid(domain, updated.manifest_cid!);

    log.info({ domain, fragments: cids.length }, "ingestion complete");

    return {
      fragments_created: cids.length,
      cids,
      domain,
      manifest_cid: updated.manifest_cid!,
    };
  }

  listDomains(agentDid: string): DomainInfo[] {
    const domains = this.domainManager.listDomains();

    return domains.map((d) => ({
      name: d.name,
      space_did: d.space_did,
      access: this.delegationManager.getAccessLevel(agentDid, d.name),
      fragment_count: 0,
      last_updated: "",
      delegation_expires: this.delegationManager.getDelegationExpiry(
        agentDid,
        d.name
      ),
    }));
  }

  async removeFragments(
    agentDid: string,
    domain: string,
    cids: string[]
  ): Promise<{ removed: number; manifest_cid: string }> {
    this.ensureInitialized();

    if (!this.delegationManager.canWrite(agentDid, domain)) {
      throw new Error(`agent ${agentDid} lacks write access to ${domain}`);
    }

    const domainRecord = this.domainManager.getDomain(domain);
    if (!domainRecord?.manifest_cid) {
      throw new Error(`domain ${domain} has no manifest`);
    }

    const manifest = await this.manifestManager.getManifest(
      domain,
      domainRecord.manifest_cid
    );

    const updated = await this.manifestManager.removeEntries(manifest, cids);
    this.domainManager.updateManifestCid(domain, updated.manifest_cid!);

    log.info({ domain, removed: cids.length }, "fragments removed");

    return { removed: cids.length, manifest_cid: updated.manifest_cid! };
  }

  getDelegationManager(): DelegationManager {
    return this.delegationManager;
  }

  getDomainManager(): DomainManager {
    return this.domainManager;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("knowledge graph not initialized - call initialize() first");
    }
  }
}
