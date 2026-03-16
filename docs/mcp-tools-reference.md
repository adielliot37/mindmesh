# MCP Tools Reference

## knowledge_search

Search the shared knowledge graph for relevant fragments.

### Input

```json
{
  "query": "Tesla Q4 revenue",
  "domains": ["market-data"],
  "top_k": 5,
  "min_score": 0.7,
  "tags": ["earnings"],
  "since": "2026-01-01T00:00:00Z"
}
```

### Output

```json
{
  "results": [
    {
      "cid": "bafybeig...",
      "domain": "market-data",
      "content": "Tesla Q4 2025 revenue was $25.7B...",
      "score": 0.92,
      "metadata": {
        "source_url": "https://ir.tesla.com/...",
        "ingested_at": "2026-03-15T10:30:00Z",
        "tags": ["earnings", "tesla"]
      }
    }
  ],
  "authorized_domains": ["market-data", "product-docs"],
  "total_fragments_searched": 42
}
```

## knowledge_ingest

Add new knowledge fragments to a domain. Requires write delegation.

### Input

```json
{
  "domain": "market-data",
  "content": "Full text content to be chunked and indexed...",
  "source_url": "https://example.com/report",
  "tags": ["quarterly", "financial"],
  "chunk_strategy": "semantic"
}
```

### Output

```json
{
  "fragments_created": 7,
  "cids": ["bafybeig...", "bafybeid...", "..."],
  "domain": "market-data",
  "manifest_cid": "bafybeih..."
}
```

## knowledge_domains

List all knowledge domains and the calling agent's permissions.

### Input

No parameters required.

### Output

```json
{
  "agent_did": "did:key:z6Mk...",
  "domains": [
    {
      "name": "market-data",
      "space_did": "did:key:z6Mk...",
      "access": "read",
      "fragment_count": 156,
      "last_updated": "2026-03-15T10:30:00Z",
      "delegation_expires": "2026-03-16T10:30:00Z"
    },
    {
      "name": "customer-logs",
      "space_did": "did:key:z6Mk...",
      "access": "none",
      "fragment_count": 0,
      "last_updated": "",
      "delegation_expires": ""
    }
  ]
}
```

## Error Responses

Authorization errors return:

```json
{
  "content": [{ "type": "text", "text": "Error: agent did:key:... is not authorized to read from customer-logs" }],
  "isError": true
}
```
