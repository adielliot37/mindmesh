import { KnowledgeGraphConfig } from "../types.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("domain-manager");

export interface DomainRecord {
  name: string;
  space_did: string;
  description: string;
  manifest_cid?: string;
}

export class DomainManager {
  private domains = new Map<string, DomainRecord>();

  constructor(config: KnowledgeGraphConfig) {
    for (const [name, domainConfig] of Object.entries(config.domains)) {
      this.domains.set(name, {
        name,
        space_did: domainConfig.space_did,
        description: domainConfig.description,
      });
    }
    log.info({ count: this.domains.size }, "domains loaded from config");
  }

  getDomain(name: string): DomainRecord | undefined {
    return this.domains.get(name);
  }

  listDomains(): DomainRecord[] {
    return Array.from(this.domains.values());
  }

  hasDomain(name: string): boolean {
    return this.domains.has(name);
  }

  updateManifestCid(domain: string, cid: string): void {
    const record = this.domains.get(domain);
    if (!record) throw new Error(`unknown domain: ${domain}`);
    record.manifest_cid = cid;
    log.info({ domain, cid }, "manifest cid updated");
  }

  getSpaceDid(domain: string): string {
    const record = this.domains.get(domain);
    if (!record) throw new Error(`unknown domain: ${domain}`);
    return record.space_did;
  }

  addDomain(name: string, spaceDid: string, description: string): void {
    this.domains.set(name, { name, space_did: spaceDid, description });
    log.info({ name, spaceDid }, "domain added");
  }

  removeDomain(name: string): boolean {
    const existed = this.domains.delete(name);
    if (existed) {
      log.info({ name }, "domain removed");
    }
    return existed;
  }

  getDomainsByPrefix(prefix: string): DomainRecord[] {
    return Array.from(this.domains.values()).filter((d) =>
      d.name.startsWith(prefix)
    );
  }
}
