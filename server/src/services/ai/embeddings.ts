// server/src/services/ai/embeddings.ts
import { openai, aiConfig, hasAIKey } from "./aiClient";

export async function embedText(text: string): Promise<number[] | null> {
  const input = String(text || "").trim();
  if (!input || !hasAIKey()) return null;

  try {
    const r = await openai.embeddings.create({
      model: aiConfig.embeddingModel,
      input,
    });

    const vector = r?.data?.[0]?.embedding;
    return Array.isArray(vector) ? vector : null;
  } catch (err: any) {
    console.error("Embedding error:", err?.message || err);
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
