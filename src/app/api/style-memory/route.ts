import { NextResponse } from 'next/server';
import { readStyleInsights, saveStyleInsights } from '@/lib/storage/style-memory-files';
import { z } from 'zod';

const insightSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  articleTitle: z.string(),
  analyzedAt: z.string(),
  vocabProfile: z.string(),
  toneProfile: z.string(),
  rhythmProfile: z.string(),
  signaturePhrases: z.string(),
  antiPatterns: z.string(),
  summary: z.string(),
});

const styleMemorySchema = z.object({ insights: z.array(insightSchema) });

export async function GET() {
  const insights = await readStyleInsights();
  return NextResponse.json(insights);
}

export async function POST(request: Request) {
  try {
    const { insights } = styleMemorySchema.parse(await request.json());
    await saveStyleInsights(insights);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据格式错误', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
