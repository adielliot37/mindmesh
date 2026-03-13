import { DelegationManager } from "../core/delegation-manager.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("auth-middleware");

export interface AuthContext {
  agentDid: string;
  authorizedDomains: string[];
}

export class AuthMiddleware {
  constructor(private delegationManager: DelegationManager) {}

  authenticate(agentDid: string): AuthContext {
    const domains = this.delegationManager.getAuthorizedDomains(agentDid);

    if (domains.length === 0) {
      log.warn({ agentDid }, "no active delegations");
    }

    return { agentDid, authorizedDomains: domains };
  }

  requireRead(agentDid: string, domain: string): void {
    if (!this.delegationManager.canAccess(agentDid, domain)) {
      throw new AuthorizationError(
        `agent ${agentDid} is not authorized to read from ${domain}`
      );
    }
  }

  requireWrite(agentDid: string, domain: string): void {
    if (!this.delegationManager.canWrite(agentDid, domain)) {
      throw new AuthorizationError(
        `agent ${agentDid} is not authorized to write to ${domain}`
      );
    }
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}
