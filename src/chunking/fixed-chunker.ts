import { Chunker, ChunkerConfig } from "./chunker.js";

export class FixedChunker implements Chunker {
  private chunkSize: number;
  private overlap: number;

  constructor(config: ChunkerConfig = { chunkSize: 512, overlap: 128 }) {
    this.chunkSize = config.chunkSize;
    this.overlap = config.overlap;
  }

  chunk(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    const step = this.chunkSize - this.overlap;

    for (let i = 0; i < words.length; i += step) {
      const slice = words.slice(i, i + this.chunkSize);
      if (slice.length === 0) break;
      chunks.push(slice.join(" "));
      if (i + this.chunkSize >= words.length) break;
    }

    return chunks;
  }
}
