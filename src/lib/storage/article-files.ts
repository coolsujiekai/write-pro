import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from 'fs';
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

function ensureDir() {
  if (!existsSync(WORKS_DIR)) {
    mkdirSync(WORKS_DIR, { recursive: true });
  }
}

function fileName(article: { id: string; title: string; updatedAt: string }): string {
  const date = new Date(article.updatedAt);
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const safeTitle = (article.title || '未命名').replace(/[/\\:*?"<>|]/g, '_').slice(0, 30);
  return `${dateStr}-${safeTitle}-${article.id.slice(0, 6)}.json`;
}

export function listArticles(): StoredArticle[] {
  ensureDir();
  const files = readdirSync(WORKS_DIR).filter((f) => f.endsWith('.json'));
  const articles: StoredArticle[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(join(WORKS_DIR, file), 'utf-8');
      articles.push(JSON.parse(raw));
    } catch {
      // skip corrupted files
    }
  }
  return articles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function readArticle(id: string): StoredArticle | null {
  ensureDir();
  const files = readdirSync(WORKS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    if (file.includes(id.slice(0, 6))) {
      try {
        return JSON.parse(readFileSync(join(WORKS_DIR, file), 'utf-8'));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function saveArticle(article: StoredArticle): void {
  ensureDir();
  // 先删旧文件（id 可能换了文件名）
  deleteArticleFile(article.id);
  const name = fileName(article);
  writeFileSync(join(WORKS_DIR, name), JSON.stringify(article, null, 2) + '\n');
}

export function deleteArticleFile(id: string): void {
  ensureDir();
  const files = readdirSync(WORKS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    if (file.includes(id.slice(0, 6))) {
      try {
        unlinkSync(join(WORKS_DIR, file));
      } catch {
        // ignore
      }
    }
  }
}
