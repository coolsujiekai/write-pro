import { NextResponse } from 'next/server';
import { listArticles, saveArticle, deleteArticleFile } from '@/lib/storage/article-files';
import { z } from 'zod';

export async function GET() {
  const articles = await listArticles();
  return NextResponse.json(articles);
}

const articleSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  content: z.string(),
  currentPhase: z.number().int().min(1).max(8),
  platform: z.string(),
  status: z.string(),
  materials: z.array(z.any()),
  interviews: z.array(z.any()),
  theme: z.any().nullable(),
  structure: z.any().nullable(),
  styleAnalysis: z.any().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const article = articleSchema.parse(body);
    await saveArticle(article);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据格式错误', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  try {
    const { id } = deleteSchema.parse(await request.json());
    await deleteArticleFile(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '缺少文章 id' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
