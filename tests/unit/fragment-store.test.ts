import { describe, it, expect } from "vitest";
import { FragmentStore } from "../../src/core/fragment-store.js";

describe("FragmentStore", () => {
  it("creates fragments with correct structure", () => {
    const store = new FragmentStore(null as any);
    const fragment = store.createFragment(
      "test-domain",
      "some content here",
      [0.1, 0.2, 0.3],
      {
        ingested_by: "did:key:test",
        chunk_index: 0,
        total_chunks: 3,
        tags: ["tag1"],
      }
    );

    expect(fragment.id).toMatch(/^frag_/);
    expect(fragment.domain).toBe("test-domain");
    expect(fragment.content).toBe("some content here");
    expect(fragment.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(fragment.metadata.ingested_by).toBe("did:key:test");
    expect(fragment.metadata.chunk_index).toBe(0);
    expect(fragment.metadata.total_chunks).toBe(3);
    expect(fragment.metadata.tags).toEqual(["tag1"]);
    expect(fragment.metadata.ingested_at).toBeDefined();
  });
});
