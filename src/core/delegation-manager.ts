import { DelegationPolicy, AgentPolicy, DomainAccess } from "../types.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("delegation-manager");

export interface ActiveDelegation {
  agentDid: string;
  domain: string;
  abilities: string[];
  expires: Date;
  revoked: boolean;
}

export class DelegationManager {
  private delegations = new Map<string, ActiveDelegation[]>();
  private revocations = new Set<string>();

  loadPolicy(policy: DelegationPolicy): void {
    this.delegations.clear();

    for (const [agentName, agentPolicy] of Object.entries(policy.agents)) {
      const agentDelegations: ActiveDelegation[] = [];

      for (const [domain, access] of Object.entries(agentPolicy.domains)) {
        const delegation: ActiveDelegation = {
          agentDid: agentPolicy.did,
          domain,
          abilities: access.abilities,
          expires: new Date(
            Date.now() + access.expiration_hours * 60 * 60 * 1000
          ),
          revoked: false,
        };
        agentDelegations.push(delegation);
      }

      this.delegations.set(agentPolicy.did, agentDelegations);
      log.info(
        { agent: agentName, did: agentPolicy.did, domains: Object.keys(agentPolicy.domains) },
        "delegations loaded"
      );
    }
  }

  canAccess(agentDid: string, domain: string): boolean {
    const delegations = this.getDelegationsForAgent(agentDid);
    return delegations.some(
      (d) => d.domain === domain && !d.revoked && d.expires > new Date()
    );
  }

  canWrite(agentDid: string, domain: string): boolean {
    const delegations = this.getDelegationsForAgent(agentDid);
    return delegations.some(
      (d) =>
        d.domain === domain &&
        !d.revoked &&
        d.expires > new Date() &&
        d.abilities.some((a) => a.includes("add"))
    );
  }

  getAccessLevel(
    agentDid: string,
    domain: string
  ): "read" | "write" | "none" {
    if (this.canWrite(agentDid, domain)) return "write";
    if (this.canAccess(agentDid, domain)) return "read";
    return "none";
  }

  getAuthorizedDomains(agentDid: string): string[] {
    const delegations = this.getDelegationsForAgent(agentDid);
    return delegations
      .filter((d) => !d.revoked && d.expires > new Date())
      .map((d) => d.domain);
  }

  revoke(agentDid: string, domain: string): void {
    const delegations = this.getDelegationsForAgent(agentDid);
    for (const d of delegations) {
      if (d.domain === domain) {
        d.revoked = true;
        this.revocations.add(`${agentDid}:${domain}`);
      }
    }
    log.info({ agentDid, domain }, "delegation revoked");
  }

  getDelegationExpiry(agentDid: string, domain: string): string {
    const delegations = this.getDelegationsForAgent(agentDid);
    const match = delegations.find(
      (d) => d.domain === domain && !d.revoked
    );
    return match ? match.expires.toISOString() : "";
  }

  private getDelegationsForAgent(agentDid: string): ActiveDelegation[] {
    return this.delegations.get(agentDid) || [];
  }
}
