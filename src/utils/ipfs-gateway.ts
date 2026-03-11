import { createChildLogger } from "./logger.js";

const log = createChildLogger("ipfs-gateway");

const GATEWAY_URLS = [
  "https://{cid}.ipfs.w3s.link",
  "https://ipfs.io/ipfs/{cid}",
  "https://dweb.link/ipfs/{cid}",
];

export async function fetchFromGateway<T>(
  cid: string,
  timeoutMs = 10000
): Promise<T> {
  for (const template of GATEWAY_URLS) {
    const url = template.replace("{cid}", cid);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch (err) {
      log.debug({ url, error: (err as Error).message }, "gateway attempt failed");
    }
  }

  throw new Error(`all gateways failed for CID: ${cid}`);
}

export function cidToUrl(cid: string): string {
  return `https://${cid}.ipfs.w3s.link`;
}
