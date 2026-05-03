import { readFile, writeFile, readdir, unlink, mkdir, access } from 'fs/promises';
import { join } from 'path';

import type { StyleAnalysisResult } from '@/lib/workflow/style-types';

export interface StoredArticle {
  id: string;
  title: string;
  content: string;
  currentPhase: number;
  platform: string;
  status: string;
  materials: { id: string; content: string; type: string; createdAt: string }[];
  interviews: { id: string; round: number; question: string; answer: string; createdAt: string }[];
  theme: { oneSentence: string; readerValue: string; coreMessage: string } | null;
  structure: unknown;
  styleAnalysis: StyleAnalysisResult | null;
  createdAt: string;
  updatedAt: string;
}

const WORKS_DIR = join(process.cwd(), '作品');

async function ensureDir() {
  try {
    await mkdir(WORKS_DIR, { recursive: true });
  } catch {
    // dir exists or can't create — handled by callers
  }
}

function fileName(article: { id: string; title: string; updatedAt: string }): string {
  const date = new Date(article.updatedAt);
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const safeTitle = (article.title || '未命名').replace(/[/\\:*?"<>|]/g, '_').slice(0, 30);
  return `${dateStr}-${safeTitle}-${article.id.slice(0, 6)}.json`;
}

export async function listArticles(): Promise<StoredArticle[]> {
  await ensureDir();
  const files = (await readdir(WORKS_DIR)).filter((f) => f.endsWith('.json'));

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const raw = await readFile(join(WORKS_DIR, file), 'utf-8');
        return JSON.parse(raw) as StoredArticle;
      } catch {
        return null;
      }
    })
  );

  return results
    .filter((a): a is StoredArticle => a !== null)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function readArticle(id: string): Promise<StoredArticle | null> {
  await ensureDir();
  const files = (await readdir(WORKS_DIR)).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    if (file.includes(id.slice(0, 6))) {
      try {
        const raw = await readFile(join(WORKS_DIR, file), 'utf-8');
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function saveArticle(article: StoredArticle): Promise<void> {
  await ensureDir();
  await deleteArticleFile(article.id);
  const name = fileName(article);
  await writeFile(join(WORKS_DIR, name), JSON.stringify(article, null, 2) + '\n');
}

export async function deleteArticleFile(id: string): Promise<void> {
  await ensureDir();
  const files = (await readdir(WORKS_DIR)).filter((f) => f.endsWith('.json'));
  await Promise.all(
    files.map(async (file) => {
      if (file.includes(id.slice(0, 6))) {
        try {
          const filePath = join(WORKS_DIR, file);
          await access(filePath);
          await unlink(filePath);
        } catch {
          // file doesn't exist or can't be removed
        }
      }
    })
  );
}
