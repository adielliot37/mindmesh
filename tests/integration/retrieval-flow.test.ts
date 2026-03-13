import { describe, it, expect } from "vitest";
import { cosineSimilarity, rankFragments, prefilterByPreview } from "../../src/embeddings/similarity.js";
import { KnowledgeFragment, ManifestEntry } from "../../src/types.js";

describe("retrieval flow", () => {
  const makeFragment = (
    id: string,
    content: string,
    embedding: number[],
    cid: string
  ): KnowledgeFragment => ({
    id,
    domain: "test",
    content,
    embedding,
    cid,
    metadata: {
      ingested_at: "2026-03-10T00:00:00Z",
      ingested_by: "did:key:test",
      chunk_index: 0,
      total_chunks: 1,
      tags: ["test"],
    },
  });

  const makeEntry = (
    cid: string,
    preview: [number, number],
    tags: string[] = []
  ): ManifestEntry => ({
    cid,
    summary: "test",
    embedding_preview: preview,
    ingested_at: "2026-03-10T00:00:00Z",
    tags,
  });

  it("ranks fragments by descending similarity", () => {
    const query = [1, 0, 0];
    const fragments = [
      makeFragment("f1", "unrelated", [0, 1, 0], "cid1"),
      makeFragment("f2", "very relevant", [0.95, 0.05, 0], "cid2"),
      makeFragment("f3", "somewhat relevant", [0.6, 0.4, 0], "cid3"),
    ];

    const results = rankFragments(query, fragments, 10, 0);
    expect(results[0].cid).toBe("cid2");
    expect(results[1].cid).toBe("cid3");
    expect(results[2].cid).toBe("cid1");
  });

  it("respects min_score threshold", () => {
    const query = [1, 0, 0];
    const fragments = [
      makeFragment("f1", "match", [0.9, 0.1, 0], "cid1"),
      makeFragment("f2", "no match", [0, 0, 1], "cid2"),
    ];

    const results = rankFragments(query, fragments, 10, 0.5);
    expect(results).toHaveLength(1);
    expect(results[0].cid).toBe("cid1");
  });

  it("limits results to top_k", () => {
    const query = [1, 0];
    const fragments = Array.from({ length: 10 }, (_, i) =>
      makeFragment(`f${i}`, `content ${i}`, [1 - i * 0.1, i * 0.1], `cid${i}`)
    );

    const results = rankFragments(query, fragments, 3, 0);
    expect(results).toHaveLength(3);
  });

  it("prefilters entries by 2d embedding preview", () => {
    const query = [0.9, 0.1, 0, 0, 0];
    const entries = [
      makeEntry("cid1", [0.9, 0.1]),
      makeEntry("cid2", [0.0, 1.0]),
      makeEntry("cid3", [0.8, 0.2]),
    ];

    const filtered = prefilterByPreview(query, entries);
    expect(filtered[0].cid).toBe("cid1");
  });

  it("handles single fragment retrieval", () => {
    const query = [1, 0, 0];
    const fragments = [makeFragment("f1", "only one", [1, 0, 0], "cid1")];

    const results = rankFragments(query, fragments, 5, 0);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeCloseTo(1);
  });

  it("returns empty for no matches above threshold", () => {
    const query = [1, 0, 0];
    const fragments = [makeFragment("f1", "orthogonal", [0, 1, 0], "cid1")];

    const results = rankFragments(query, fragments, 5, 0.9);
    expect(results).toHaveLength(0);
  });
});
