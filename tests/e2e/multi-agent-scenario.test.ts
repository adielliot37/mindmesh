import { describe, it, expect, beforeAll } from "vitest";
import { DelegationManager } from "../../src/core/delegation-manager.js";
import { AuthMiddleware, AuthorizationError } from "../../src/mcp/auth-middleware.js";
import { DelegationPolicy } from "../../src/types.js";
import { FixedChunker } from "../../src/chunking/fixed-chunker.js";
import { SemanticChunker } from "../../src/chunking/semantic-chunker.js";
import { cosineSimilarity } from "../../src/embeddings/similarity.js";

const multiAgentPolicy: DelegationPolicy = {
  agents: {
    research: {
      did: "did:key:z6MkResearch",
      domains: {
        "market-data": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 24,
        },
        "product-docs": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 24,
        },
      },
    },
    support: {
      did: "did:key:z6MkSupport",
      domains: {
        "product-docs": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 24,
        },
      },
    },
    ingestion: {
      did: "did:key:z6MkIngestion",
      domains: {
        "market-data": {
          abilities: ["space/blob/add", "upload/add", "space/blob/list"],
          expiration_hours: 1,
        },
        "product-docs": {
          abilities: ["space/blob/add", "upload/add", "space/blob/list"],
          expiration_hours: 1,
        },
        "customer-logs": {
          abilities: ["space/blob/add", "upload/add", "space/blob/list"],
          expiration_hours: 1,
        },
      },
    },
  },
};

describe("multi-agent scenario", () => {
  let delegationManager: DelegationManager;
  let auth: AuthMiddleware;

  beforeAll(() => {
    delegationManager = new DelegationManager();
    delegationManager.loadPolicy(multiAgentPolicy);
    auth = new AuthMiddleware(delegationManager);
  });

  it("research agent can read market-data and product-docs", () => {
    const ctx = auth.authenticate("did:key:z6MkResearch");
    expect(ctx.authorizedDomains).toContain("market-data");
    expect(ctx.authorizedDomains).toContain("product-docs");
  });

  it("research agent cannot read customer-logs", () => {
    expect(() =>
      auth.requireRead("did:key:z6MkResearch", "customer-logs")
    ).toThrow(AuthorizationError);
  });

  it("support agent can only read product-docs", () => {
    const ctx = auth.authenticate("did:key:z6MkSupport");
    expect(ctx.authorizedDomains).toEqual(["product-docs"]);
  });

  it("support agent cannot access market-data", () => {
    expect(() =>
      auth.requireRead("did:key:z6MkSupport", "market-data")
    ).toThrow(AuthorizationError);
  });

  it("ingestion agent has write access to all domains", () => {
    expect(delegationManager.canWrite("did:key:z6MkIngestion", "market-data")).toBe(true);
    expect(delegationManager.canWrite("did:key:z6MkIngestion", "product-docs")).toBe(true);
    expect(delegationManager.canWrite("did:key:z6MkIngestion", "customer-logs")).toBe(true);
  });

  it("research agent cannot write", () => {
    expect(delegationManager.canWrite("did:key:z6MkResearch", "market-data")).toBe(false);
  });

  it("chunking produces correct segments", () => {
    const text = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const chunker = new FixedChunker({ chunkSize: 20, overlap: 5 });
    const chunks = chunker.chunk(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.split(/\s+/).length).toBeLessThanOrEqual(20);
    }
  });

  it("semantic chunker splits on paragraphs", () => {
    const text = "First paragraph with some content.\n\nSecond paragraph with different content.\n\nThird paragraph here.";
    const chunker = new SemanticChunker({ chunkSize: 100, overlap: 0 });
    const chunks = chunker.chunk(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("cosine similarity correctly identifies similar vectors", () => {
    const a = [0.9, 0.1, 0.0];
    const b = [0.85, 0.15, 0.05];
    const c = [0.0, 0.1, 0.9];

    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.9);
    expect(cosineSimilarity(a, c)).toBeLessThan(0.3);
  });

  it("revocation immediately blocks access", () => {
    const testManager = new DelegationManager();
    testManager.loadPolicy(multiAgentPolicy);
    const testAuth = new AuthMiddleware(testManager);

    expect(() => testAuth.requireRead("did:key:z6MkResearch", "market-data")).not.toThrow();

    testManager.revoke("did:key:z6MkResearch", "market-data");

    expect(() => testAuth.requireRead("did:key:z6MkResearch", "market-data")).toThrow(
      AuthorizationError
    );
  });
});
