/** 从 AI 返回文本中鲁棒提取 JSON 对象 */
export function extractJson(text: string): Record<string, unknown> | null {
  // 1. 去掉 markdown 代码块
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  // 2. 找到第一个 { 和最后一个 }，截取 JSON 对象
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  // 3. 替换中文引号为标准双引号
  cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");

  // 4. 去掉尾逗号（, } 或 , ]）
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  // 5. 尝试解析
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
