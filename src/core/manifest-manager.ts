import { DomainManifest, ManifestEntry } from "../types.js";
import { uploadBlob, fetchByCid } from "../utils/storacha-client.js";
import { createChildLogger } from "../utils/logger.js";
import type { Client } from "@storacha/client";

const log = createChildLogger("manifest-manager");

export class ManifestManager {
  private manifestCache = new Map<string, DomainManifest>();

  constructor(private client: Client) {}

  async getManifest(domain: string, currentCid?: string): Promise<DomainManifest> {
    if (currentCid) {
      const cached = this.manifestCache.get(currentCid);
      if (cached) return cached;

      const manifest = await fetchByCid<DomainManifest>(currentCid);
      this.manifestCache.set(currentCid, manifest);
      return manifest;
    }

    return this.createEmptyManifest(domain);
  }

  async appendEntries(
    manifest: DomainManifest,
    entries: ManifestEntry[]
  ): Promise<DomainManifest> {
    const expectedCid = manifest.manifest_cid;

    if (expectedCid) {
      const current = await this.getManifest(manifest.domain, expectedCid);
      if (current.manifest_cid !== expectedCid) {
        throw new Error(
          `manifest conflict: expected ${expectedCid}, got ${current.manifest_cid}`
        );
      }
    }

    const updated: DomainManifest = {
      ...manifest,
      updated_at: new Date().toISOString(),
      fragments: [...manifest.fragments, ...entries],
    };

    const data = new TextEncoder().encode(JSON.stringify(updated));
    const newCid = await uploadBlob(this.client, data);

    updated.manifest_cid = newCid;
    this.manifestCache.set(newCid, updated);

    log.info(
      { domain: manifest.domain, entries: entries.length, cid: newCid },
      "manifest updated"
    );

    return updated;
  }

  async getFragmentCount(domain: string, manifestCid?: string): Promise<number> {
    if (!manifestCid) return 0;
    const manifest = await this.getManifest(domain, manifestCid);
    return manifest.fragments.length;
  }

  createEmptyManifest(domain: string, spaceDid = ""): DomainManifest {
    return {
      domain,
      space_did: spaceDid,
      updated_at: new Date().toISOString(),
      fragments: [],
    };
  }

  clearCache(): void {
    this.manifestCache.clear();
  }
}
