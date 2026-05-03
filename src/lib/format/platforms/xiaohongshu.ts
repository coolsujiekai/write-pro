import { inlineStyles } from '../inline-styles';

const XHS_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #333; line-height: 1.6; }
  h1 { font-size: 18px; font-weight: bold; margin: 12px 0; }
  p { font-size: 14px; margin: 8px 0; }
  strong { color: #ff2442; }
  ul, ol { padding-left: 20px; margin: 8px 0; }
  li { margin: 4px 0; }
`;

export interface XiaohongshuOutput {
  html: string;
  tags: string[];
  coverText: {
    title: string;
    keywords: string[];
    style: string;
  };
}

/** 编辑器输出已是 HTML，跳过 MD 中间层 */
export function formatForXiaohongshu(html: string): XiaohongshuOutput {
  const styledHtml = inlineStyles(html, XHS_CSS);

  // 从 HTML 中提取 h1 作为标题
  const titleMatch = html.match(/<h1[^>]*>(.+?)<\/h1>/i);
  const title = titleMatch?.[1]?.replace(/<[^>]*>/g, '') ?? '';

  // 从 HTML 文本中提取 #tag
  const tags = extractTags(html);

  return {
    html: styledHtml,
    tags,
    coverText: {
      title: title.slice(0, 20),
      keywords: tags.slice(0, 3),
      style: '简约文艺',
    },
  };
}

function extractTags(html: string): string[] {
  const plainText = html.replace(/<[^>]*>/g, ' ');
  const tagRegex = /#[一-龥a-zA-Z0-9]+/g;
  return [...new Set(plainText.match(tagRegex) ?? [])];
}
