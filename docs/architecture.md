# Architecture

## Overview

The system is a five-layer stack that provides multi-agent knowledge sharing with cryptographic access control.

## Layers

### Layer 1: Storage (Storacha Network)

All data lives on Storacha — IPFS for hot retrieval, Filecoin for durability. Every piece of data is content-addressed: the CID (Content Identifier) is a cryptographic hash of the content itself.

### Layer 2: Domain Spaces

Each knowledge domain maps to a Storacha Space. Spaces provide isolation — market data doesn't mix with customer logs at the storage level.

### Layer 3: Knowledge Index

Each domain maintains a manifest: a JSON blob stored on Storacha that maps fragment CIDs to their metadata (summary, embedding preview, tags, timestamps). The manifest itself is content-addressed.

### Layer 4: Authorization

UCAN (User Controlled Authorization Networks) delegations control which agents can access which domains. Delegations are cryptographic proofs — no central auth server required. Each delegation specifies:
- The agent's DID (decentralized identifier)
- Which Space abilities are granted
- An expiration timestamp

### Layer 5: Agent Interface

Three MCP tools expose the system to any agent framework:
- `knowledge_search`: semantic search across authorized domains
- `knowledge_ingest`: chunk, embed, and store new content
- `knowledge_domains`: list domains and access levels

## Data Flow

### Ingestion
1. Agent calls `knowledge_ingest` with raw text
2. Auth middleware verifies write delegation for target domain
3. Text is chunked (fixed-size or semantic)
4. Chunks are embedded via OpenAI
5. Each chunk becomes a Knowledge Fragment (JSON blob) uploaded to Storacha
6. Fragment CIDs are appended to the domain manifest
7. Updated manifest is uploaded; domain pointer updated

### Retrieval
1. Agent calls `knowledge_search` with a query
2. Auth middleware filters to authorized domains
3. Query is embedded
4. Manifest entries are pre-filtered by 2-dim embedding preview
5. Candidate fragments are fetched from Storacha by CID
6. Full-dimension cosine similarity ranking
7. Top-K results returned with content, CIDs, and scores
