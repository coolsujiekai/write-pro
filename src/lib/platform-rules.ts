/** 从 hermes-skill/references/platform-formats.md 解析各平台写作规则 */

import { readFile } from 'fs/promises';
import { join } from 'path';

interface PlatformRules {
  name: string;
  wordCount: string;
  style: string;
  tone: string;
  tips: string[];
}

const PLATFORM_FORMATS_PATH = join(process.cwd(), 'hermes-skill/writing-assistant/references/platform-formats.md');

let cachedRules: Record<string, PlatformRules> | null = null;

function parsePlatformRules(markdown: string): Record<string, PlatformRules> {
  const result: Record<string, PlatformRules> = {};
  // Split by ## sections (platform names)
  const sections = markdown.split(/^## /gm).slice(1);

  const platformLabelToKey: Record<string, string> = {
    '公众号': 'wechat',
    '小红书': 'xiaohongshu',
    '知乎': 'zhihu',
  };

  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines[0].trim();

    const key = platformLabelToKey[heading];
    if (!key) continue;

    const rules: PlatformRules = { name: heading, wordCount: '', style: '', tone: '', tips: [] };
    let inTips = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // 基本参数
      const wcMatch = trimmed.match(/字数[：:]\s*(.+)/);
      if (wcMatch) rules.wordCount = wcMatch[1];
      const styleMatch = trimmed.match(/风格[：:]\s*(.+)/);
      if (styleMatch) rules.style = styleMatch[1];
      const toneMatch = trimmed.match(/语气[：:]\s*(.+)/);
      if (toneMatch) rules.tone = toneMatch[1];

      // 写作要点
      if (trimmed.startsWith('### 写作要点')) {
        inTips = true;
        continue;
      }
      if (inTips && trimmed.startsWith('- ')) {
        rules.tips.push(trimmed.slice(2));
      }
      if (inTips && trimmed.startsWith('##')) break;
    }

    result[key] = rules;
  }

  return result;
}

export async function loadPlatformRules(): Promise<Record<string, PlatformRules>> {
  if (cachedRules) return cachedRules;
  try {
    const raw = await readFile(PLATFORM_FORMATS_PATH, 'utf-8');
    cachedRules = parsePlatformRules(raw);
    return cachedRules;
  } catch {
    return {};
  }
}

export function clearPlatformRulesCache() {
  cachedRules = null;
}

/** 获取指定平台的 AI 写作规则（用于 system prompt 注入） */
export async function getPlatformPrompt(platform: string): Promise<string> {
  const rules = await loadPlatformRules();
  const p = rules[platform];
  if (!p) return '';

  const lines = [
    `${p.name}文章要求：${p.wordCount}，${p.style}，${p.tone}。`,
    ...p.tips.map((t) => `- ${t}`),
  ];

  return lines.join('\n');
}
