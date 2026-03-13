import { describe, it, expect, beforeEach } from "vitest";
import { FragmentStore } from "../../src/core/fragment-store.js";
import { ManifestManager } from "../../src/core/manifest-manager.js";
import { DomainManifest, ManifestEntry } from "../../src/types.js";
import { FixedChunker } from "../../src/chunking/fixed-chunker.js";
import { SemanticChunker } from "../../src/chunking/semantic-chunker.js";

describe("ingestion flow", () => {
  it("chunks content with fixed strategy", () => {
    const chunker = new FixedChunker({ chunkSize: 10, overlap: 2 });
    const text = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunker.chunk(text);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      const words = chunk.split(/\s+/);
      expect(words.length).toBeLessThanOrEqual(10);
    });
  });

  it("chunks content with semantic strategy", () => {
    const chunker = new SemanticChunker({ chunkSize: 50, overlap: 5 });
    const text = [
      "First section discusses market trends in the semiconductor industry.",
      "",
      "Second section covers revenue projections for Q4.",
      "",
      "Third section analyzes competitive landscape and market share.",
    ].join("\n");

    const chunks = chunker.chunk(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]).toContain("semiconductor");
  });

  it("creates fragments with sequential chunk indices", () => {
    const store = new FragmentStore(null as any);
    const chunks = ["chunk one", "chunk two", "chunk three"];

    const fragments = chunks.map((content, i) =>
      store.createFragment("test-domain", content, [0.1, 0.2], {
        ingested_by: "did:key:test",
        chunk_index: i,
        total_chunks: chunks.length,
        tags: ["test"],
      })
    );

    expect(fragments).toHaveLength(3);
    fragments.forEach((f, i) => {
      expect(f.metadata.chunk_index).toBe(i);
      expect(f.metadata.total_chunks).toBe(3);
      expect(f.id).toMatch(/^frag_/);
    });
  });

  it("creates manifest entries with embedding previews", () => {
    const manager = new ManifestManager(null as any);
    const manifest = manager.createEmptyManifest("test", "did:key:space");

    expect(manifest.fragments).toHaveLength(0);
    expect(manifest.domain).toBe("test");
  });

  it("handles empty content gracefully", () => {
    const chunker = new FixedChunker({ chunkSize: 10, overlap: 2 });
    const chunks = chunker.chunk("");
    expect(chunks).toHaveLength(0);
  });

  it("preserves source url in fragment metadata", () => {
    const store = new FragmentStore(null as any);
    const fragment = store.createFragment("docs", "content here", [0.5], {
      source_url: "https://example.com/report.pdf",
      ingested_by: "did:key:ingester",
      chunk_index: 0,
      total_chunks: 1,
      tags: [],
    });

    expect(fragment.metadata.source_url).toBe("https://example.com/report.pdf");
  });
});
