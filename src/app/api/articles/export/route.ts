import { NextResponse } from 'next/server';
import { readArticle } from '@/lib/storage/article-files';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: '缺少文章 id' }, { status: 400 });
    }

    const article = readArticle(id);
    if (!article) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    const md = toMarkdown(article);
    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(article.title || '未命名')}.md"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '导出失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function toMarkdown(article: { title: string; content: string; theme: { oneSentence: string; coreMessage: string } | null }): string {
  // HTML → 简单 Markdown 转换
  let md = article.content;

  // 标题
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');

  // 粗体、斜体
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // 引用
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
    return content.replace(/<[^>]*>/g, '').split('\n').map((l: string) => `> ${l.trim()}`).join('\n') + '\n\n';
  });

  // 列表
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n');

  // 链接
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // 图片
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // 分割线
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n\n');

  // 段落和换行
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n');
  md = md.replace(/<br[^>]*\/?>/gi, '\n');

  // 去掉剩余 HTML 标签
  md = md.replace(/<[^>]*>/g, '');

  // HTML 实体
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');

  // 清理多余空行
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  // 加 frontmatter
  const front = [
    '---',
    `title: "${(article.title || '未命名').replace(/"/g, '\\"')}"`,
    article.theme ? `theme: "${article.theme.oneSentence.replace(/"/g, '\\"')}"` : null,
    '---',
    '',
  ].filter(Boolean).join('\n');

  return `${front}\n${md}\n`;
}
