import { readFile } from 'fs/promises';
import { join } from 'path';

/** 从 SKILL.md 中提取的 prompt 块 */
interface PromptBlocks {
  [name: string]: string;
}

let cachedBlocks: PromptBlocks | null = null;

const SKILL_PATH = join(process.cwd(), 'hermes-skill/writing-assistant/SKILL.md');

/** 解析 SKILL.md 中的 <!-- prompt:NAME --> ... <!-- /prompt --> 标记块 */
function parseBlocks(markdown: string): PromptBlocks {
  const blocks: PromptBlocks = {};
  const regex = /<!-- prompt:(\S+) -->\n([\s\S]*?)<!-- \/prompt -->/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks[match[1]] = match[2].trim();
  }
  return blocks;
}

/** 加载 SKILL.md 并提取 prompt 块（带缓存） */
export async function loadPromptBlocks(): Promise<PromptBlocks> {
  if (cachedBlocks) return cachedBlocks;

  try {
    const raw = await readFile(SKILL_PATH, 'utf-8');
    cachedBlocks = parseBlocks(raw);
    return cachedBlocks;
  } catch {
    return {};
  }
}

/** 清除缓存（开发时修改 SKILL.md 后调用） */
export function clearPromptCache() {
  cachedBlocks = null;
}

/** 获取去 AI 味规则（共享块） */
export async function getNoAITasteRules(): Promise<string> {
  const blocks = await loadPromptBlocks();
  return blocks['no-ai-taste'] ?? '';
}

/** 构建写作 system prompt 的公共部分 */
export async function getSharedWritingRules(): Promise<string> {
  const rules = await getNoAITasteRules();
  if (!rules) {
    // 回退：硬编码的核心规则
    return `写作规则：
- 像说话一样写，不要AI味
- 禁止使用：首先其次最后、值得一提的是、在这个快节奏的时代、综上所述
- 短句为主，一句话不超过30个字
- 具体不要抽象
- 保持作者的语气，不要改成你的风格`;
  }

  // 从 SKILL.md 中提取核心规则（精简版）
  const lines = rules.split('\n');
  const coreRules: string[] = [];
  let inRules = false;

  for (const line of lines) {
    if (line.includes('### 必须做到的')) {
      inRules = true;
      continue;
    }
    if (line.includes('### 检查方法')) {
      break;
    }
    if (inRules && line.startsWith('- **')) {
      // 提取核心要求：去掉 markdown 标记
      const cleaned = line.replace(/^- \*\*/, '').replace(/\*\* — /, '：');
      coreRules.push(cleaned);
    }
  }

  if (coreRules.length === 0) return rules.slice(0, 200);
  return `写作规则：\n${coreRules.map((r) => `- ${r}`).join('\n')}`;
}

/** 获取禁止表达的列表 */
export async function getForbiddenExpressions(): Promise<string[]> {
  const rules = await getNoAITasteRules();
  const forbidden: string[] = [];
  const lines = rules.split('\n');
  let inForbidden = false;

  for (const line of lines) {
    if (line.includes('### 绝对禁止的表达')) {
      inForbidden = true;
      continue;
    }
    if (line.includes('### 必须做到的')) {
      break;
    }
    if (inForbidden && line.startsWith('- "')) {
      const match = line.match(/"(.+?)"/);
      if (match) forbidden.push(match[1]);
    }
  }

  return forbidden;
}
