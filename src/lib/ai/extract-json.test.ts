import { describe, it, expect } from 'vitest';
import { extractJson } from './extract-json';

describe('extractJson', () => {
  it('解析正常 JSON', () => {
    const result = extractJson('{"a": 1, "b": "hello"}');
    expect(result).toEqual({ a: 1, b: 'hello' });
  });

  it('解析被 markdown 代码块包裹的 JSON', () => {
    const result = extractJson('```json\n{"score": 85}\n```');
    expect(result).toEqual({ score: 85 });
  });

  it('解析没有语言标记的 markdown 代码块', () => {
    const result = extractJson('```\n{"ok": true}\n```');
    expect(result).toEqual({ ok: true });
  });

  it('解析前后有说明文字的 JSON', () => {
    const result = extractJson('这是分析结果：\n{\n  "name": "test"\n}\n以上就是全部内容。');
    expect(result).toEqual({ name: 'test' });
  });

  it('处理尾逗号', () => {
    const result = extractJson('{"a": 1, "b": 2,}');
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('处理数组中尾逗号', () => {
    const result = extractJson('{"items": [1, 2, 3,]}');
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('处理嵌套对象', () => {
    const result = extractJson('{"user": {"name": "Jack", "role": "writer"}, "score": 90}');
    expect(result).toEqual({ user: { name: 'Jack', role: 'writer' }, score: 90 });
  });

  it('空字符串返回 null', () => {
    expect(extractJson('')).toBeNull();
  });

  it('无效 JSON 返回 null', () => {
    expect(extractJson('这不是 JSON')).toBeNull();
  });

  it('没有花括号返回 null', () => {
    expect(extractJson('[1, 2, 3]')).toBeNull();
  });

  it('处理有多个对象的文本：嵌套在单一大对象中可解析', () => {
    const result = extractJson('{ "first": { "a": 1 }, "second": { "b": 2 } }');
    expect(result).toEqual({ first: { a: 1 }, second: { b: 2 } });
  });

  it('嵌套花括号的 JSON 正确解析', () => {
    const result = extractJson('{"changes": [{"type": "replace", "ai": "{旧值}", "user": "新值"}]}');
    expect(result).toEqual({ changes: [{ type: 'replace', ai: '{旧值}', user: '新值' }] });
  });

  it('整数和浮点数正确解析', () => {
    const result = extractJson('{"int": 42, "float": 3.14, "negative": -10}');
    expect(result).toEqual({ int: 42, float: 3.14, negative: -10 });
  });
});
