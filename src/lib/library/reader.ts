import { readdir, readFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { createHash } from 'crypto';
import type { LibraryIndex, LibraryCategory } from './types';

const WRITING_LIBRARY_PATH = join(process.cwd(), 'writing-library', '提炼');

const CATEGORY_DIRS: { dir: string; category: LibraryCategory }[] = [
  { dir: '精读摘录', category: '精读摘录' },
  { dir: '风格手册', category: '风格手册' },
  { dir: '金句', category: '金句' },
  { dir: '故事', category: '故事' },
];

let cachedIndex: LibraryIndex[] | null = null;

// LRU cache for file content
const contentCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

function hashPath(path: string): string {
  return createHash('md5').update(path).digest('hex').slice(0, 12);
}

function parseFilename(filename: string, category: LibraryCategory): { title: string; author: string } {
  const name = basename(filename, extname(filename));

  if (category === '风格手册') {
    const match = name.match(/^(.+?)写作风格/);
    return match ? { title: `${match[1]}风格手册`, author: match[1] } : { title: name, author: '' };
  }

  if (category === '故事') {
    const match = name.match(/^(.+?)-故事切片$/);
    return match ? { title: `${match[1]}故事切片`, author: match[1] } : { title: name, author: '' };
  }

  // 精读摘录 and 金句: split by last '-'
  const lastDash = name.lastIndexOf('-');
  if (lastDash > 0) {
    const title = name.slice(0, lastDash);
    const author = name.slice(lastDash + 1);
    return { title, author };
  }

  return { title: name, author: '' };
}

export async function buildIndex(): Promise<LibraryIndex[]> {
  const items: LibraryIndex[] = [];

  for (const { dir, category } of CATEGORY_DIRS) {
    const dirPath = join(WRITING_LIBRARY_PATH, dir);
    try {
      const files = await readdir(dirPath);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const relativePath = join(dir, file);
        const { title, author } = parseFilename(file, category);
        items.push({
          id: hashPath(relativePath),
          category,
          title,
          author,
          filePath: relativePath,
        });
      }
    } catch {
      // directory doesn't exist, skip
    }
  }

  return items;
}

export async function getIndex(): Promise<LibraryIndex[]> {
  if (!cachedIndex) {
    cachedIndex = await buildIndex();
  }
  return cachedIndex;
}

export async function readContent(filePath: string): Promise<string> {
  const cached = contentCache.get(filePath);
  if (cached) return cached;

  const fullPath = join(WRITING_LIBRARY_PATH, filePath);
  const content = await readFile(fullPath, 'utf-8');

  // Evict oldest entry if cache is full
  if (contentCache.size >= MAX_CACHE_SIZE) {
    const firstKey = contentCache.keys().next().value;
    if (firstKey) contentCache.delete(firstKey);
  }
  contentCache.set(filePath, content);

  return content;
}

export function getStyleHandbookAuthors(index: LibraryIndex[]): string[] {
  return index
    .filter((item) => item.category === '风格手册' && item.author)
    .map((item) => item.author);
}

export async function getStyleHandbook(author: string): Promise<string | null> {
  const index = await getIndex();
  const item = index.find((i) => i.category === '风格手册' && i.author === author);
  if (!item) return null;
  return readContent(item.filePath);
}

/** Extract a plain-text preview (first N chars, markdown stripped) */
export function extractPreview(content: string, maxLen = 150): string {
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~\[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen);
}
