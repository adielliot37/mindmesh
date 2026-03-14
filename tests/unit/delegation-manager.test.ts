import { describe, it, expect, beforeEach } from "vitest";
import { DelegationManager } from "../../src/core/delegation-manager.js";
import { DelegationPolicy } from "../../src/types.js";

const testPolicy: DelegationPolicy = {
  agents: {
    research: {
      did: "did:key:research",
      domains: {
        "market-data": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 24,
        },
      },
    },
    ingestion: {
      did: "did:key:ingestion",
      domains: {
        "market-data": {
          abilities: ["space/blob/add", "upload/add", "space/blob/list"],
          expiration_hours: 1,
        },
      },
    },
  },
};

describe("DelegationManager", () => {
  let manager: DelegationManager;

  beforeEach(() => {
    manager = new DelegationManager();
    manager.loadPolicy(testPolicy);
  });

  it("grants read access to authorized domains", () => {
    expect(manager.canAccess("did:key:research", "market-data")).toBe(true);
  });

  it("denies access to unauthorized domains", () => {
    expect(manager.canAccess("did:key:research", "customer-logs")).toBe(false);
  });

  it("denies write for read-only agents", () => {
    expect(manager.canWrite("did:key:research", "market-data")).toBe(false);
  });

  it("grants write for agents with add abilities", () => {
    expect(manager.canWrite("did:key:ingestion", "market-data")).toBe(true);
  });

  it("returns correct access level", () => {
    expect(manager.getAccessLevel("did:key:research", "market-data")).toBe("read");
    expect(manager.getAccessLevel("did:key:ingestion", "market-data")).toBe("write");
    expect(manager.getAccessLevel("did:key:research", "unknown")).toBe("none");
  });

  it("lists authorized domains", () => {
    const domains = manager.getAuthorizedDomains("did:key:research");
    expect(domains).toContain("market-data");
    expect(domains).not.toContain("customer-logs");
  });

  it("revokes delegations", () => {
    manager.revoke("did:key:research", "market-data");
    expect(manager.canAccess("did:key:research", "market-data")).toBe(false);
  });

  it("returns empty for unknown agents", () => {
    expect(manager.getAuthorizedDomains("did:key:unknown")).toEqual([]);
  });
});
