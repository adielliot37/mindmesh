import { describe, it, expect, beforeEach } from "vitest";
import { DelegationManager } from "../../src/core/delegation-manager.js";
import { AuthMiddleware, AuthorizationError } from "../../src/mcp/auth-middleware.js";
import { DelegationPolicy } from "../../src/types.js";

const policy: DelegationPolicy = {
  agents: {
    reader: {
      did: "did:key:reader",
      domains: {
        "product-docs": {
          abilities: ["space/blob/list"],
          expiration_hours: 24,
        },
      },
    },
    writer: {
      did: "did:key:writer",
      domains: {
        "product-docs": {
          abilities: ["space/blob/add", "upload/add", "space/blob/list"],
          expiration_hours: 1,
        },
      },
    },
  },
};

describe("authorization flow", () => {
  let delegationManager: DelegationManager;
  let authMiddleware: AuthMiddleware;

  beforeEach(() => {
    delegationManager = new DelegationManager();
    delegationManager.loadPolicy(policy);
    authMiddleware = new AuthMiddleware(delegationManager);
  });

  it("authenticates agents with valid delegations", () => {
    const ctx = authMiddleware.authenticate("did:key:reader");
    expect(ctx.agentDid).toBe("did:key:reader");
    expect(ctx.authorizedDomains).toContain("product-docs");
  });

  it("allows read for authorized agents", () => {
    expect(() => authMiddleware.requireRead("did:key:reader", "product-docs")).not.toThrow();
  });

  it("blocks read for unauthorized domains", () => {
    expect(() => authMiddleware.requireRead("did:key:reader", "customer-logs")).toThrow(AuthorizationError);
  });

  it("blocks write for read-only agents", () => {
    expect(() => authMiddleware.requireWrite("did:key:reader", "product-docs")).toThrow(AuthorizationError);
  });

  it("allows write for write-authorized agents", () => {
    expect(() => authMiddleware.requireWrite("did:key:writer", "product-docs")).not.toThrow();
  });

  it("blocks all access after revocation", () => {
    delegationManager.revoke("did:key:reader", "product-docs");
    expect(() => authMiddleware.requireRead("did:key:reader", "product-docs")).toThrow(AuthorizationError);
  });
});
