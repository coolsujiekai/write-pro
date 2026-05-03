import { describe, it, expect } from 'vitest';
import { markdownToHtml } from './markdown-to-html';

describe('markdownToHtml', () => {
  it('空字符串返回空', () => {
    expect(markdownToHtml('')).toBe('');
  });

  it('纯文本原样返回', () => {
    const result = markdownToHtml('你好世界');
    expect(result).toContain('你好世界');
  });

  it('标题转换', () => {
    const result = markdownToHtml('# 标题');
    expect(result).toContain('<h1>');
    expect(result).toContain('标题');
  });

  it('二级标题', () => {
    const result = markdownToHtml('## 二级');
    expect(result).toContain('<h2>');
    expect(result).toContain('二级');
  });

  it('无序列表', () => {
    const result = markdownToHtml('- 第一\n- 第二');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>第一</li>');
  });

  it('有序列表', () => {
    const result = markdownToHtml('1. 第一\n2. 第二');
    expect(result).toContain('<ol>');
  });

  it('粗体', () => {
    const result = markdownToHtml('**重要**');
    expect(result).toContain('<strong>重要</strong>');
  });

  it('链接', () => {
    const result = markdownToHtml('[链接](https://example.com)');
    expect(result).toContain('<a href="https://example.com"');
  });

  it('换行', () => {
    const result = markdownToHtml('第一行\n第二行');
    expect(result).toContain('<br>');
  });
});
