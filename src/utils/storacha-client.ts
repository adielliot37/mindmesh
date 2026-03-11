import * as Client from "@storacha/client";
import { Signer } from "@storacha/client/principal/ed25519";
import * as Proof from "@storacha/client/proof";
import { StoreMemory } from "@storacha/client/stores/memory";
import { createChildLogger } from "./logger.js";

const log = createChildLogger("storacha-client");

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export async function createStorachaClient(
  privateKey: string,
  proof: string
) {
  const principal = Signer.parse(privateKey);
  const store = new StoreMemory();
  const client = await Client.create({ principal, store });

  const proofDelegation = await Proof.parse(proof);
  const space = await client.addSpace(proofDelegation);
  await client.setCurrentSpace(space.did());

  log.info({ space: space.did() }, "storacha client initialized");
  return client;
}

export async function uploadBlob(
  client: Client.Client,
  data: Uint8Array
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const cid = await client.uploadFile(
        new Blob([data], { type: "application/json" })
      );
      return cid.toString();
    } catch (err) {
      lastError = err as Error;
      log.warn({ attempt, error: lastError.message }, "upload failed, retrying");
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw new Error(`upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

export async function fetchByCid<T>(cid: string): Promise<T> {
  const url = `https://${cid}.ipfs.w3s.link`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err as Error;
      log.warn({ attempt, cid, error: lastError.message }, "fetch failed, retrying");
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw new Error(`fetch ${cid} failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
