import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { StyleInsight } from '@/lib/workflow/style-types';

const WORKS_DIR = join(process.cwd(), '作品');
const INSIGHTS_FILE = join(WORKS_DIR, 'style-insights.json');

function ensureDir() {
  if (!existsSync(WORKS_DIR)) {
    mkdirSync(WORKS_DIR, { recursive: true });
  }
}

export function readStyleInsights(): StyleInsight[] {
  ensureDir();
  if (!existsSync(INSIGHTS_FILE)) return [];
  try {
    const raw = readFileSync(INSIGHTS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.insights) ? data.insights : [];
  } catch {
    return [];
  }
}

export function saveStyleInsights(insights: StyleInsight[]): void {
  ensureDir();
  writeFileSync(INSIGHTS_FILE, JSON.stringify({ insights }, null, 2) + '\n');
}
