import { NextRequest, NextResponse } from 'next/server';
import { getIndex, readContent, extractPreview, getStyleHandbookAuthors } from '@/lib/library/reader';
import { searchLibrary } from '@/lib/library/search';
import { recommendFromMaterials, recommendStyle, recommendStructure } from '@/lib/library/recommender';
import type { LibraryCategory } from '@/lib/library/types';
import { aiLimiter } from '@/lib/ai/concurrency';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const query = searchParams.get('q');
  const category = searchParams.get('category') as string | null;

  // GET /api/library?id=xxx → fetch content
  if (id) {
    const index = await getIndex();
    const item = index.find((i) => i.id === id);
    if (!item) {
      return NextResponse.json({ error: '未找到' }, { status: 404 });
    }
    const content = await readContent(item.filePath);
    return NextResponse.json({
      content,
      title: item.title,
      author: item.author,
    });
  }

  // GET /api/library?q=xxx&category=xxx → search
  if (query) {
    const index = await getIndex();
    const results = searchLibrary(index, {
      query,
      category: (category as LibraryCategory) || undefined,
      limit: 20,
    });
    return NextResponse.json({ items: results, total: results.length });
  }

  // GET /api/library → return style handbook authors
  const index = await getIndex();
  const authors = getStyleHandbookAuthors(index);
  return NextResponse.json({ authors });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, materials, theme, matchedItems } = body;

    await aiLimiter.acquire();
    try {
      const index = await getIndex();

      switch (action) {
        case 'recommend-materials': {
          const startTime = Date.now();
          const items = await recommendFromMaterials(materials ?? [], index);
          logger.ai('recommend-materials', { count: items.length, durationMs: Date.now() - startTime });
          return NextResponse.json({ items });
        }

        case 'recommend-style': {
          const authors = getStyleHandbookAuthors(index);
          const result = await recommendStyle(theme ?? '', materials ?? [], authors);
          if (!result) return NextResponse.json({ author: null });
          const handbook = index.find((i) => i.category === '风格手册' && i.author === result.author);
          return NextResponse.json({ ...result, handbookId: handbook?.id ?? null });
        }

        case 'recommend-structure': {
          const enriched = (matchedItems ?? []).map((m: { title: string; filePath: string }) => ({
            title: m.title,
            preview: '',
          }));
          // Load previews for matched items
          for (const item of enriched) {
            const match = index.find((i) => i.title === item.title);
            if (match) {
              try {
                const content = await readContent(match.filePath);
                item.preview = extractPreview(content);
              } catch { /* skip */ }
            }
          }
          const result = await recommendStructure(theme ?? '', materials ?? [], enriched);
          return NextResponse.json(result ?? { sections: [] });
        }

        default:
          return NextResponse.json({ error: '未知操作' }, { status: 400 });
      }
    } finally {
      aiLimiter.release();
    }
  } catch (error) {
    logger.error('library-route', error);
    const message = error instanceof Error ? error.message : '请求失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
