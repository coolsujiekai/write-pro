import { inlineStyles } from '../inline-styles';

const ZHIHU_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1a1a1a; line-height: 1.75; }
  h1 { font-size: 24px; font-weight: bold; margin: 24px 0 16px; }
  h2 { font-size: 20px; font-weight: bold; margin: 20px 0 12px; color: #1a1a1a; }
  h3 { font-size: 17px; font-weight: bold; margin: 16px 0 8px; }
  p { font-size: 15px; margin: 10px 0; }
  blockquote { border-left: 3px solid #0066ff; padding: 8px 16px; margin: 16px 0; background: #f6f6f6; color: #555; }
  strong { font-weight: bold; }
  img { max-width: 100%; height: auto; border-radius: 4px; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
  pre { background: #f6f6f6; padding: 16px; border-radius: 6px; overflow-x: auto; }
`;

/** 编辑器输出已是 HTML，直接用 juice inline styles */
export function formatForZhihu(html: string): string {
  return inlineStyles(html, ZHIHU_CSS);
}
