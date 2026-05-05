import { chat } from '@/lib/ai/client';
import { extractJson } from '@/lib/ai/extract-json';
import { getMaxTokens } from '@/lib/ai/token-utils';
import type { LibraryIndex, LibraryRecommendItem } from './types';
import { searchLibrary, extractKeywords } from './search';
import { readContent, extractPreview } from './reader';

export async function recommendFromMaterials(
  materials: string[],
  libraryIndex: LibraryIndex[],
): Promise<LibraryRecommendItem[]> {
  if (materials.length === 0) return [];

  const keywords = extractKeywords(materials);
  if (keywords.length === 0) return [];

  // Step 1: keyword search to narrow down candidates
  const candidates: LibraryIndex[] = [];
  for (const kw of keywords) {
    const results = searchLibrary(libraryIndex, { query: kw, limit: 5 });
    for (const r of results) {
      if (!candidates.find((c) => c.id === r.id)) {
        candidates.push(r);
      }
    }
  }

  const topCandidates = candidates.slice(0, 20);
  if (topCandidates.length === 0) return [];

  // Step 2: load previews for candidates
  const candidatesWithPreview = await Promise.all(
    topCandidates.map(async (item) => {
      try {
        const content = await readContent(item.filePath);
        return { ...item, preview: extractPreview(content) };
      } catch {
        return { ...item, preview: '' };
      }
    }),
  );

  // Step 3: AI selects best matches
  const candidateList = candidatesWithPreview
    .map((c, i) => `${i + 1}. [${c.category}] 《${c.title}》${c.author ? ` - ${c.author}` : ''}：${c.preview}`)
    .join('\n');

  const response = await chat({
    system: `你是一位资深编辑。从候选素材中挑选最相关的条目。

规则：
- 只从候选列表中选择，不要编造
- 最多选 8 条
- 每条给出简短推荐理由（15字以内）

输出格式（严格 JSON）：
{ "items": [{ "index": 序号, "reason": "推荐理由" }] }`,
    messages: [
      {
        role: 'user',
        content: `用户正在写的素材：\n${materials.slice(0, 5).join('\n')}\n\n候选素材：\n${candidateList}\n\n请挑选最相关的条目。`,
      },
    ],
    maxTokens: getMaxTokens('interview', ''),
    tier: 'light',
  });

  const result = extractJson(response.content);
  if (!result?.items) return [];

  // Validate and map results
  return (result.items as { index: number; reason: string }[])
    .filter((r) => r.index >= 1 && r.index <= candidatesWithPreview.length)
    .map((r) => ({
      index: candidatesWithPreview[r.index - 1],
      reason: r.reason,
      preview: candidatesWithPreview[r.index - 1].preview,
    }));
}

export async function recommendStyle(
  theme: string,
  materials: string[],
  authors: string[],
): Promise<{ author: string; reason: string } | null> {
  if (authors.length === 0) return null;

  const response = await chat({
    system: `你是一位资深写作顾问。根据文章主题和素材，推荐最适合模仿的作家风格。

只从以下作家中选择：${authors.join('、')}

输出格式（严格 JSON）：
{ "author": "作家名", "reason": "推荐理由，15字以内" }`,
    messages: [
      {
        role: 'user',
        content: `主题：${theme}\n素材：${materials.slice(0, 3).join('\n')}`,
      },
    ],
    maxTokens: 200,
    tier: 'light',
  });

  const result = extractJson(response.content);
  if (!result) return null;
  const author = result.author as string | undefined;
  if (!author) return null;

  if (!authors.includes(author)) return null;

  return { author, reason: (result.reason as string) || '' };
}

export async function recommendStructure(
  theme: string,
  materials: string[],
  matchedItems: { title: string; preview: string }[],
): Promise<{ sections: { title: string; description: string }[] } | null> {
  const matchedText = matchedItems.length > 0
    ? `\n知识库参考：\n${matchedItems.map((m) => `《${m.title}》：${m.preview}`).join('\n')}`
    : '';

  const response = await chat({
    system: `你是一位资深编辑。根据主题和素材，生成最适合的文章结构。

输出格式（严格 JSON）：
{
  "sections": [
    { "title": "段落标题", "description": "这段要写什么，50字以内" }
  ]
}

规则：
- 3-6 个段落
- 结构要符合素材的内在逻辑，不要套模板
- 每段描述要具体，不要抽象`,
    messages: [
      {
        role: 'user',
        content: `主题：${theme}\n素材：${materials.slice(0, 5).join('\n')}${matchedText}\n\n请生成文章结构。`,
      },
    ],
    maxTokens: getMaxTokens('suggest-theme', ''),
    tier: 'light',
  });

  const result = extractJson(response.content);
  if (!result?.sections) return null;

  return result as { sections: { title: string; description: string }[] };
}
