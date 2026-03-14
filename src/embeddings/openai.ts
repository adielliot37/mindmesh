import OpenAI from "openai";
import { EmbeddingProvider } from "./provider.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("openai-embeddings");

const BATCH_LIMIT = 2048;

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model: string;
  readonly dimensions: number;
  private cache = new Map<string, CacheEntry>();
  private cacheTtlMs: number;

  constructor(
    apiKey: string,
    model = "text-embedding-3-small",
    dimensions = 1536,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS
  ) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.dimensions = dimensions;
    this.cacheTtlMs = cacheTtlMs;
  }

  clearCache(): void {
    this.cache.clear();
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  async embed(text: string): Promise<number[]> {
    const cached = this.getFromCache(text);
    if (cached) return cached;

    const result = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimensions,
    });

    const embedding = result.data[0].embedding;
    this.setCache(text, embedding);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_LIMIT) {
      const batch = texts.slice(i, i + BATCH_LIMIT);

      const uncached: { text: string; index: number }[] = [];
      const batchResults = new Array<number[]>(batch.length);

      for (let j = 0; j < batch.length; j++) {
        const cached = this.getFromCache(batch[j]);
        if (cached) {
          batchResults[j] = cached;
        } else {
          uncached.push({ text: batch[j], index: j });
        }
      }

      if (uncached.length > 0) {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: uncached.map((u) => u.text),
          dimensions: this.dimensions,
        });

        for (let k = 0; k < uncached.length; k++) {
          const embedding = response.data[k].embedding;
          batchResults[uncached[k].index] = embedding;
          this.setCache(uncached[k].text, embedding);
        }

        log.debug({ batch_size: uncached.length }, "embeddings generated");
      }

      results.push(...batchResults);
    }

    return results;
  }

  private getFromCache(key: string): number[] | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.embedding;
  }

  private setCache(key: string, embedding: number[]): void {
    this.cache.set(key, { embedding, timestamp: Date.now() });
  }
}
