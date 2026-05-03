/** 中文按字符数 * 0.5 估算 token（粗略但实用） */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // 中文字符 ≈ 1 token/字，英文 ≈ 1 token/3-4 字符
  // 简单取字符数 * 0.6 作为近似
  return Math.ceil(text.length * 0.6);
}

/** 各 action 的动态 maxTokens */
export function getMaxTokens(action: string, inputLength: number | string, platform?: string): number {
  const inputTokens = estimateTokens(typeof inputLength === 'string' ? inputLength : '');

  switch (action) {
    case 'interview':
      return 500;
    case 'suggest-theme':
      return 800;
    case 'generate-draft':
      if (platform === 'xiaohongshu') return 1500;
      if (platform === 'zhihu') return 4000;
      return 4000; // 公众号默认
    case 'check-ai':
      return 2000;
    case 'rewrite':
      return Math.max(inputTokens, 2000);
    case 'polish-draft':
      return Math.max(Math.ceil(inputTokens * 1.3), 2000);
    case 'analyze-style':
      return 3000;
    case 'analyze-diff':
      return 3000;
    default:
      return 4000;
  }
}

/** 检查输入是否超出模型上下文上限的警告比例 */
export function checkContextLimit(inputTokens: number, limit = 16000): { ok: boolean; warning?: string } {
  const ratio = inputTokens / limit;
  if (ratio > 0.8) {
    return { ok: false, warning: `输入内容过长（约 ${inputTokens} tokens），可能超出模型上下文限制，部分内容将被裁剪` };
  }
  return { ok: true };
}

/** 简单裁剪文本到指定 token 数 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) return text;
  const ratio = maxTokens / estimated;
  const targetLen = Math.floor(text.length * ratio);
  return text.slice(0, targetLen) + '…';
}
