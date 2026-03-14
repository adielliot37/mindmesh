import { describe, it, expect } from "vitest";
import { cosineSimilarity, rankFragments } from "../../src/embeddings/similarity.js";
import { KnowledgeFragment } from "../../src/types.js";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("handles zero vectors", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});

describe("rankFragments", () => {
  const fragments: KnowledgeFragment[] = [
    {
      id: "f1",
      domain: "test",
      content: "high match",
      embedding: [1, 0, 0],
      metadata: {
        ingested_at: "2026-03-10T00:00:00Z",
        ingested_by: "did:key:test",
        chunk_index: 0,
        total_chunks: 1,
        tags: [],
      },
      cid: "cid1",
    },
    {
      id: "f2",
      domain: "test",
      content: "low match",
      embedding: [0, 1, 0],
      metadata: {
        ingested_at: "2026-03-10T00:00:00Z",
        ingested_by: "did:key:test",
        chunk_index: 0,
        total_chunks: 1,
        tags: [],
      },
      cid: "cid2",
    },
  ];

  it("ranks by similarity score", () => {
    const results = rankFragments([1, 0, 0], fragments, 5, 0);
    expect(results[0].content).toBe("high match");
    expect(results[0].score).toBeCloseTo(1);
  });

  it("filters by min_score", () => {
    const results = rankFragments([1, 0, 0], fragments, 5, 0.9);
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("high match");
  });

  it("respects top_k", () => {
    const results = rankFragments([0.5, 0.5, 0], fragments, 1, 0);
    expect(results).toHaveLength(1);
  });
});
