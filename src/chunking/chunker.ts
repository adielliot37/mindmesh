export interface Chunker {
  chunk(text: string): string[];
}

export interface ChunkerConfig {
  chunkSize: number;
  overlap: number;
}
