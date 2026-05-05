import type { LibraryIndex, LibraryCategory } from './types';

interface SearchOptions {
  query: string;
  category?: LibraryCategory;
  limit?: number;
}

export function searchLibrary(index: LibraryIndex[], options: SearchOptions): LibraryIndex[] {
  const { query, category, limit = 20 } = options;
  const q = query.trim().toLowerCase();
  if (!q) return [];

  let candidates = index;
  if (category) {
    candidates = candidates.filter((item) => item.category === category);
  }

  const scored: { item: LibraryIndex; score: number }[] = [];

  for (const item of candidates) {
    const titleMatch = item.title.toLowerCase().includes(q);
    const authorMatch = item.author.toLowerCase().includes(q);

    if (!titleMatch && !authorMatch) continue;

    const score = (titleMatch ? 3 : 0) + (authorMatch ? 2 : 0);
    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.item);
}

/** Extract keywords from text for search */
export function extractKeywords(texts: string[]): string[] {
  const combined = texts.join(' ');
  // Split by common separators, filter short tokens
  const words = combined
    .replace(/[，。！？、；：""''（）《》\n\r]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  // Deduplicate
  return [...new Set(words)].slice(0, 10);
}
