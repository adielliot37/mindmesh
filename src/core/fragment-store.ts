import { KnowledgeFragment, FragmentMetadata } from "../types.js";
import { uploadBlob, fetchByCid } from "../utils/storacha-client.js";
import { createChildLogger } from "../utils/logger.js";
import type { Client } from "@storacha/client";

const log = createChildLogger("fragment-store");

export class FragmentStore {
  constructor(private client: Client) {}

  async store(fragment: KnowledgeFragment): Promise<string> {
    const payload = JSON.stringify(fragment);
    const data = new TextEncoder().encode(payload);
    const cid = await uploadBlob(this.client, data);
    log.info({ id: fragment.id, domain: fragment.domain, cid }, "fragment stored");
    return cid;
  }

  async storeBatch(fragments: KnowledgeFragment[]): Promise<string[]> {
    const cids: string[] = [];
    for (const fragment of fragments) {
      const cid = await this.store(fragment);
      cids.push(cid);
    }
    return cids;
  }

  async retrieve(cid: string): Promise<KnowledgeFragment> {
    const fragment = await fetchByCid<KnowledgeFragment>(cid);
    log.info({ cid, id: fragment.id }, "fragment retrieved");
    return fragment;
  }

  async retrieveBatch(cids: string[]): Promise<KnowledgeFragment[]> {
    return Promise.all(cids.map((cid) => this.retrieve(cid)));
  }

  createFragment(
    domain: string,
    content: string,
    embedding: number[],
    metadata: Omit<FragmentMetadata, "ingested_at"> & { ingested_at?: string }
  ): KnowledgeFragment {
    return {
      id: `frag_${generateId()}`,
      domain,
      content,
      embedding,
      metadata: {
        ...metadata,
        ingested_at: metadata.ingested_at || new Date().toISOString(),
      },
    };
  }
}

function generateId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}
