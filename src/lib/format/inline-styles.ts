import juice from 'juice';

export function inlineStyles(html: string, css: string): string {
  return juice.inlineContent(html, css);
}
