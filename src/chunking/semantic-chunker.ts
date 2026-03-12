import { Chunker, ChunkerConfig } from "./chunker.js";

const PARAGRAPH_BREAK = /\n\s*\n/;
const SECTION_BREAK = /^#{1,6}\s+/m;

export class SemanticChunker implements Chunker {
  private maxSize: number;
  private overlap: number;

  constructor(config: ChunkerConfig = { chunkSize: 512, overlap: 128 }) {
    this.maxSize = config.chunkSize;
    this.overlap = config.overlap;
  }

  chunk(text: string): string[] {
    const sections = this.splitBySections(text);
    const chunks: string[] = [];

    for (const section of sections) {
      const paragraphs = section.split(PARAGRAPH_BREAK).filter(Boolean);
      let current = "";

      for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed) continue;

        const wordCount = this.countWords(current + " " + trimmed);

        if (wordCount <= this.maxSize) {
          current = current ? current + "\n\n" + trimmed : trimmed;
        } else {
          if (current) {
            chunks.push(current);
            const overlapText = this.getOverlapText(current);
            current = overlapText + "\n\n" + trimmed;
          } else {
            const subChunks = this.splitLargeParagraph(trimmed);
            chunks.push(...subChunks.slice(0, -1));
            current = subChunks[subChunks.length - 1] || "";
          }
        }
      }

      if (current.trim()) {
        chunks.push(current.trim());
      }
    }

    return chunks.filter(Boolean);
  }

  private splitBySections(text: string): string[] {
    const parts = text.split(SECTION_BREAK);
    return parts.filter(Boolean);
  }

  private splitLargeParagraph(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    const step = this.maxSize - this.overlap;

    for (let i = 0; i < words.length; i += step) {
      const slice = words.slice(i, i + this.maxSize);
      if (slice.length === 0) break;
      chunks.push(slice.join(" "));
      if (i + this.maxSize >= words.length) break;
    }

    return chunks;
  }

  private getOverlapText(text: string): string {
    const words = text.split(/\s+/);
    return words.slice(-this.overlap).join(" ");
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }
}
