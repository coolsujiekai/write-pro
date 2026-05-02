import { markdownToHtml } from '../markdown-to-html';
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

export function formatForXiaohongshu(markdown: string): XiaohongshuOutput {
  const html = inlineStyles(markdownToHtml(markdown), XHS_CSS);

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? '';

  const tags = extractTags(markdown);

  return {
    html,
    tags,
    coverText: {
      title: title.slice(0, 20),
      keywords: tags.slice(0, 3),
      style: '简约文艺',
    },
  };
}

function extractTags(markdown: string): string[] {
  const tagRegex = /#[一-龥a-zA-Z0-9]+/g;
  return [...new Set(markdown.match(tagRegex) ?? [])];
}
