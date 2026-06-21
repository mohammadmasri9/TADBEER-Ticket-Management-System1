import fs from "fs";
import path from "path";

type Hit = {
  file: string;
  score: number;
  snippet: string;
};

const TEXT_EXT = [".md", ".txt", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml"];

function walk(dir: string, out: string[] = []) {
  if (!fs.existsSync(dir)) return out;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      // ignore heavy folders
      if (it.name === "node_modules" || it.name === "dist" || it.name === "build" || it.name === ".git") continue;
      walk(full, out);
    } else {
      const ext = path.extname(it.name).toLowerCase();
      if (TEXT_EXT.includes(ext)) out.push(full);
    }
  }
  return out;
}

function chunkText(text: string, chunkSize = 900, overlap = 120) {
  const clean = text.replace(/\r/g, "");
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + chunkSize);
    chunks.push(clean.slice(i, end));
    if (end === clean.length) break;
    i = Math.max(0, end - overlap);
  }
  return chunks;
}

function scoreChunk(qTokens: string[], chunk: string) {
  const lower = chunk.toLowerCase();
  let score = 0;
  for (const t of qTokens) {
    if (!t) continue;
    if (lower.includes(t)) score += 2;
  }
  // bonus for code-like hits
  if (lower.includes("router") || lower.includes("controller") || lower.includes("schema")) score += 1;
  return score;
}

function tokenize(q: string) {
  return q
    .toLowerCase()
    .split(/[^a-z0-9_\/\-]+/g)
    .filter(Boolean)
    .slice(0, 30);
}

export async function searchProjectKnowledge(params: {
  query: string;
  roots: string[]; // e.g. ["docs", "src"]
  maxHits?: number;
}) {
  const { query, roots } = params;
  const maxHits = params.maxHits ?? 6;

  const qTokens = tokenize(query);
  const hits: Hit[] = [];

  for (const r of roots) {
    const absRoot = path.isAbsolute(r) ? r : path.join(process.cwd(), r);
    const files = walk(absRoot);

    for (const f of files) {
      let text = "";
      try {
        text = fs.readFileSync(f, "utf8");
      } catch {
        continue;
      }

      // skip secrets-like files
      const bn = path.basename(f).toLowerCase();
      if (bn.includes(".env")) continue;

      const chunks = chunkText(text);
      for (const c of chunks) {
        const s = scoreChunk(qTokens, c);
        if (s <= 0) continue;

        // keep a short snippet
        const snippet = c.length > 900 ? c.slice(0, 900) : c;
        hits.push({ file: path.relative(process.cwd(), f), score: s, snippet });
      }
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, maxHits);
}
