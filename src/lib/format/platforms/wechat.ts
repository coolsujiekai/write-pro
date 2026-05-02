import { markdownToHtml } from '../markdown-to-html';
import { inlineStyles } from '../inline-styles';

const WECHAT_CSS = `
  body { font-family: "Source Han Serif SC", "Noto Serif SC", serif; color: #333; line-height: 1.8; }
  h1 { font-size: 22px; font-weight: bold; text-align: center; margin: 20px 0; color: #1a1a1a; }
  h2 { font-size: 18px; font-weight: bold; margin: 24px 0 12px; color: #1a1a1a; border-left: 4px solid #c0392b; padding-left: 12px; }
  h3 { font-size: 16px; font-weight: bold; margin: 20px 0 8px; color: #1a1a1a; }
  p { font-size: 15px; margin: 12px 0; text-align: justify; }
  blockquote { border-left: 3px solid #c0392b; padding: 8px 16px; margin: 16px 0; background: #fafafa; color: #666; font-style: italic; }
  strong { color: #c0392b; }
  em { font-style: italic; }
  img { max-width: 100%; height: auto; }
  ul, ol { padding-left: 24px; margin: 12px 0; }
  li { margin: 4px 0; }
`;

export function formatForWechat(markdown: string): string {
  const html = markdownToHtml(markdown);
  return inlineStyles(html, WECHAT_CSS);
}
