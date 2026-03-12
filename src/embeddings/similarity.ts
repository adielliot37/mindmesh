import { ManifestEntry, SearchResult, KnowledgeFragment } from "../types.js";

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function prefilterByPreview(
  queryEmbedding: number[],
  entries: ManifestEntry[],
  candidateMultiplier = 3
): ManifestEntry[] {
  const queryPreview: [number, number] = [queryEmbedding[0], queryEmbedding[1]];

  const scored = entries.map((entry) => ({
    entry,
    score: cosineSimilarity(queryPreview, entry.embedding_preview),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, entries.length * candidateMultiplier)
    .map((s) => s.entry);
}

export function rankFragments(
  queryEmbedding: number[],
  fragments: KnowledgeFragment[],
  topK: number,
  minScore: number
): SearchResult[] {
  const scored = fragments.map((fragment) => ({
    cid: fragment.cid || "",
    domain: fragment.domain,
    content: fragment.content,
    score: cosineSimilarity(queryEmbedding, fragment.embedding),
    metadata: fragment.metadata,
  }));

  return scored
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
