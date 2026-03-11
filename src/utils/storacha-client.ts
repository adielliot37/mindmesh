import * as Client from "@storacha/client";
import { Signer } from "@storacha/client/principal/ed25519";
import * as Proof from "@storacha/client/proof";
import { StoreMemory } from "@storacha/client/stores/memory";
import { createChildLogger } from "./logger.js";

const log = createChildLogger("storacha-client");

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

let retryConfig: RetryConfig = { ...DEFAULT_RETRY };

export function setRetryConfig(config: Partial<RetryConfig>): void {
  retryConfig = { ...retryConfig, ...config };
}

function getDelay(attempt: number): number {
  const delay = retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt);
  const jitter = delay * 0.1 * Math.random();
  return Math.min(delay + jitter, retryConfig.maxDelayMs);
}

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

  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      const cid = await client.uploadFile(
        new Blob([data], { type: "application/json" })
      );
      return cid.toString();
    } catch (err) {
      lastError = err as Error;
      log.warn({ attempt, error: lastError.message }, "upload failed, retrying");
      await sleep(getDelay(attempt));
    }
  }

  throw new Error(`upload failed after ${retryConfig.maxRetries} attempts: ${lastError?.message}`);
}

export async function fetchByCid<T>(cid: string): Promise<T> {
  const url = `https://${cid}.ipfs.w3s.link`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err as Error;
      log.warn({ attempt, cid, error: lastError.message }, "fetch failed, retrying");
      await sleep(getDelay(attempt));
    }
  }

  throw new Error(`fetch ${cid} failed after ${retryConfig.maxRetries} attempts: ${lastError?.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
