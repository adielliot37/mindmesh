# @storacha/agent-knowledge

A shared knowledge layer for multi-agent systems, built on [Storacha Network](https://storacha.network). Provides content-addressed storage, UCAN-based access control, and semantic search across knowledge domains — exposed as MCP tools for any framework.

## What it does

- **Knowledge Domains**: Organize information into isolated Storacha Spaces (market-data, product-docs, customer-logs, etc.)
- **UCAN Permissions**: Cryptographic, fine-grained access control per agent per domain. No API keys, no central auth server.
- **Content Integrity**: Every fragment is content-addressed (CIDs). Tampered data is detectable by hash mismatch.
- **Semantic Search**: Embedding-based retrieval with cosine similarity ranking.
- **MCP Interface**: Three tools (`knowledge_search`, `knowledge_ingest`, `knowledge_domains`) compatible with any MCP client.

## Install

```bash
npm install @storacha/agent-knowledge
```

## Quick Start

### 1. Generate keys

```bash
npm install -g @storacha/cli
storacha key create           # admin key
storacha login you@email.com
storacha space create market-data
storacha space create product-docs
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in STORACHA_PRIVATE_KEY, STORACHA_PROOF, DOMAIN_*_DID, OPENAI_API_KEY
```

### 3. Start the MCP server

```bash
npx agent-knowledge-server
```

### 4. Connect from your agent framework

```json
{
  "mcpServers": {
    "storacha-knowledge": {
      "command": "npx",
      "args": ["agent-knowledge-server"],
      "env": {
        "STORACHA_PRIVATE_KEY": "${AGENT_KEY}",
        "STORACHA_PROOF": "${AGENT_DELEGATION}",
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

## MCP Tools

### `knowledge_search`

Search across authorized knowledge domains.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Natural language search query |
| `domains` | string[] | all authorized | Filter to specific domains |
| `top_k` | number | 5 | Max results (1-20) |
| `min_score` | number | 0.7 | Minimum similarity threshold |
| `tags` | string[] | - | Filter by tags |
| `since` | string | - | ISO date, only fragments after this date |

### `knowledge_ingest`

Add new knowledge fragments to a domain. Requires write delegation.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `domain` | string | required | Target domain |
| `content` | string | required | Raw text to ingest |
| `source_url` | string | - | Origin URL for provenance |
| `tags` | string[] | [] | Categorization tags |
| `chunk_strategy` | "fixed" \| "semantic" | "semantic" | Chunking method |

### `knowledge_domains`

List all domains and calling agent's access level. No parameters.

## Architecture

```
Layer 5: Agent Interface     → MCP tools (search, ingest, domains)
Layer 4: Authorization       → UCAN delegation index
Layer 3: Knowledge Index     → Semantic manifest per domain
Layer 2: Domain Spaces       → One Storacha Space per domain
Layer 1: Storage             → Storacha (IPFS + Filecoin)
```

## Programmatic Usage

```typescript
import { KnowledgeGraph, loadConfig } from "@storacha/agent-knowledge";

const config = loadConfig();
const kg = new KnowledgeGraph(config);
await kg.initialize();

// Load delegation policy
kg.getDelegationManager().loadPolicy(policyJson);

// Ingest
await kg.ingest(agentDid, "market-data", content, sourceUrl, ["earnings"]);

// Search
const results = await kg.search(agentDid, {
  query: "Q4 revenue",
  domains: ["market-data"],
  top_k: 5,
});
```

## Project Structure

```
src/
├── index.ts                     # Package exports
├── config.ts                    # Configuration
├── types.ts                     # TypeScript interfaces
├── core/
│   ├── knowledge-graph.ts       # Main orchestrator
│   ├── domain-manager.ts        # Storacha Space management
│   ├── fragment-store.ts        # Fragment upload/retrieval
│   ├── manifest-manager.ts      # Domain manifest CRUD
│   └── delegation-manager.ts    # UCAN delegation handling
├── mcp/
│   ├── server.ts                # MCP server entry point
│   ├── auth-middleware.ts       # Request authorization
│   └── tools/                   # Tool handlers
├── embeddings/
│   ├── provider.ts              # Provider interface
│   ├── openai.ts                # OpenAI implementation
│   └── similarity.ts            # Cosine similarity
├── chunking/
│   ├── chunker.ts               # Chunker interface
│   ├── fixed-chunker.ts         # Fixed-size windows
│   └── semantic-chunker.ts      # Paragraph-aware splitting
├── utils/
│   ├── storacha-client.ts       # Storacha client wrapper
│   ├── ipfs-gateway.ts          # CID content fetcher
│   └── logger.ts                # Structured logging
└── scripts/
    ├── setup-domains.ts         # Bootstrap Storacha Spaces
    ├── generate-delegations.ts  # Create UCAN delegations
    └── seed-knowledge.ts        # Bulk document ingestion
```

## Testing

```bash
npm test               # all tests
npm run test:unit      # unit tests only
npm run test:e2e       # end-to-end scenario
```

## Security Model

- Agents authenticate with UCAN tokens, not API keys
- Each delegation scopes abilities per domain with expiration timestamps
- Content integrity verified via CID hash matching
- Revocations take effect immediately
- Full audit trail via UCAN chains

## License

MIT
