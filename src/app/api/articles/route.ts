import { NextResponse } from 'next/server';
import { listArticles, saveArticle, deleteArticleFile, type StoredArticle } from '@/lib/storage/article-files';

export async function GET() {
  const articles = listArticles();
  return NextResponse.json(articles);
}

export async function POST(request: Request) {
  try {
    const article: StoredArticle = await request.json();
    if (!article.id) {
      return NextResponse.json({ error: '缺少文章 id' }, { status: 400 });
    }
    saveArticle(article);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: '缺少文章 id' }, { status: 400 });
    }
    deleteArticleFile(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
