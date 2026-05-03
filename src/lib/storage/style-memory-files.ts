import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import type { StyleInsight } from '@/lib/workflow/style-types';

const WORKS_DIR = join(process.cwd(), '作品');
const INSIGHTS_FILE = join(WORKS_DIR, 'style-insights.json');

async function ensureDir() {
  try {
    await mkdir(WORKS_DIR, { recursive: true });
  } catch {
    // dir exists
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readStyleInsights(): Promise<StyleInsight[]> {
  await ensureDir();
  if (!(await fileExists(INSIGHTS_FILE))) return [];
  try {
    const raw = await readFile(INSIGHTS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.insights) ? data.insights : [];
  } catch {
    return [];
  }
}

export async function saveStyleInsights(insights: StyleInsight[]): Promise<void> {
  await ensureDir();
  await writeFile(INSIGHTS_FILE, JSON.stringify({ insights }, null, 2) + '\n');
}
