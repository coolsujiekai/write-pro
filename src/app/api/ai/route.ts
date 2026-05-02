import { NextRequest, NextResponse } from 'next/server';
import { chat, type AIProvider } from '@/lib/ai/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;
    const provider = (request.headers.get('X-AI-Provider') ?? undefined) as AIProvider | undefined;

    switch (action) {
      case 'interview':
        return handleInterview(data, provider);
      case 'suggest-theme':
        return handleSuggestTheme(data, provider);
      case 'generate-draft':
        return handleGenerateDraft(data, provider);
      case 'check-ai':
        return handleCheckAI(data, provider);
      case 'rewrite':
        return handleRewrite(data, provider);
      case 'polish-draft':
        return handlePolishDraft(data, provider);
      case 'analyze-style':
        return handleAnalyzeStyle(data, provider);
      case 'analyze-diff':
        return handleAnalyzeDiff(data, provider);
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 请求失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleInterview(data: { materials: string[]; previousAnswers: string[]; round: number }, provider?: AIProvider) {
  const { materials, previousAnswers, round } = data;

  const system = `你是一位资深编辑，正在采访一位作者。你的目标是帮他找到最值得写的故事和观点。

采访规则：
- 一次只问一个问题
- 问题要具体，不要抽象
- 根据对方的回答追问细节
- 用感官追问法：什么时候、在哪里、什么感觉
- 语气亲切自然，像朋友聊天

第 ${round} 轮采访，${round === 1 ? '打开话题' : round === 2 ? '追问细节' : round === 3 ? '挖深度' : '定位'}。`;

  const materialsText = materials.length > 0
    ? `\n\n作者提供的素材：\n${materials.join('\n---\n')}`
    : '\n\n作者没有提供素材，请从开放性问题开始。';

  const previousText = previousAnswers.length > 0
    ? `\n\n之前的对话：\n${previousAnswers.join('\n')}`
    : '';

  const response = await chat({
    system,
    messages: [
      { role: 'user', content: `请根据以下信息，问一个最能挖掘故事的问题。${materialsText}${previousText}` },
    ],
    maxTokens: 1000,
    provider,
  });

  return NextResponse.json({ question: response.content });
}

async function handleSuggestTheme(data: { materials: string[]; interviews: { q: string; a: string }[] }, provider?: AIProvider) {
  const { materials, interviews } = data;

  const system = `你是一位资深编辑。根据作者提供的素材和采访记录，帮他确定文章主题。

输出格式（严格 JSON）：
{
  "oneSentence": "一句话主题",
  "readerValue": "读者价值",
  "coreMessage": "核心信息"
}`;

  const interviewText = interviews.map((i) => `Q: ${i.q}\nA: ${i.a}`).join('\n\n');

  const response = await chat({
    system,
    messages: [
      {
        role: 'user',
        content: `素材：\n${materials.join('\n---\n')}\n\n采访记录：\n${interviewText}\n\n请确定文章主题。`,
      },
    ],
    maxTokens: 1500,
    provider,
  });

  try {
    const theme = JSON.parse(response.content);
    return NextResponse.json({ theme });
  } catch {
    return NextResponse.json({ theme: { oneSentence: response.content, readerValue: '', coreMessage: '' } });
  }
}

async function handleGenerateDraft(data: {
  title: string;
  theme: { oneSentence: string; readerValue: string; coreMessage: string };
  materials: string[];
  interviews: { q: string; a: string }[];
  structure: string;
  platform: string;
  stylePrompt?: string;
}, provider?: AIProvider) {
  const { title, theme, materials, interviews, structure, platform, stylePrompt } = data;

  const platformRules = platform === 'wechat'
    ? '公众号文章要求：1500-3000字，短段落（3-5句一段），每500字至少一个金句，结尾不要总结要留白。'
    : platform === 'xiaohongshu'
      ? '小红书文章要求：300-800字，口语化，适当emoji，结尾留互动钩子。'
      : '知乎文章要求：逻辑清晰，有论据支撑，可以适当引用数据。';

  const system = `你是一位资深写作助手。根据以下信息生成一篇文章初稿。

写作规则：
- 像说话一样写，不要AI味
- 禁止使用：首先其次最后、值得一提的是、在这个快节奏的时代、综上所述
- 短句为主，一句话不超过30个字
- 具体不要抽象
- 保持作者的语气，不要改成你的风格
${platformRules}
${stylePrompt ? `\n${stylePrompt}` : ''}

直接输出文章正文，不要加任何说明。标题用 # 标记。`;

  const interviewText = interviews.map((i) => `Q: ${i.q}\nA: ${i.a}`).join('\n\n');

  const response = await chat({
    system,
    messages: [
      {
        role: 'user',
        content: `主题：${theme.oneSentence}
核心信息：${theme.coreMessage}
读者价值：${theme.readerValue}

素材：
${materials.join('\n---\n')}

采访记录：
${interviewText}

结构要求：
${structure}

请生成初稿。`,
      },
    ],
    maxTokens: 4000,
    provider,
  });

  return NextResponse.json({ draft: response.content });
}

async function handleCheckAI(data: { content: string }, provider?: AIProvider) {
  const { content } = data;

  const system = `你是一位文章审查专家。检查文章是否有AI味，找出所有问题并给出修改建议。

输出格式（严格 JSON）：
{
  "score": 0-100,
  "issues": [
    {"text": "问题文本", "suggestion": "修改建议"}
  ],
  "summary": "总体评价"
}`;

  const response = await chat({
    system,
    messages: [
      { role: 'user', content: `请检查以下文章：\n\n${content}` },
    ],
    maxTokens: 2000,
    provider,
  });

  try {
    const result = JSON.parse(response.content);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ score: 50, issues: [], summary: response.content });
  }
}

async function handleRewrite(data: { content: string; instruction: string }, provider?: AIProvider) {
  const { content, instruction } = data;

  const system = `你是一位写作助手。根据用户的修改指令，改写文章。

规则：
- 只修改用户要求的部分，不要改其他内容
- 保持原文的语气和风格
- 不要加任何说明，直接输出改写后的文章`;

  const response = await chat({
    system,
    messages: [
      { role: 'user', content: `原文：\n${content}\n\n修改指令：${instruction}` },
    ],
    maxTokens: 4000,
    provider,
  });

  return NextResponse.json({ content: response.content });
}

async function handlePolishDraft(data: { content: string; platform: string }, provider?: AIProvider) {
  const { content, platform } = data;

  const platformHint = platform === 'xiaohongshu'
    ? '这是小红书文章，保持口语化和 emoji。'
    : platform === 'wechat'
      ? '这是公众号文章，保持短段落和金句。'
      : '';

  const system = `你是一位资深编辑，专门去除文章的 AI 味道。

你的任务：
1. 找出文章中所有不自然的 AI 表达
2. 直接修改文章，不要只列问题
3. 修改后的文章必须保持原文的结构、观点和信息量
4. 让文章读起来像一个真人在说话

修改规则：
- "首先...其次...最后..." → 改成自然过渡
- "值得一提的是" → 直接删掉，换自然衔接
- "在这个快节奏的时代" → 换成具体场景
- "综上所述" → 直接删掉
- "不可否认" → 删掉
- "众所周知" → 删掉或换成具体事实
- 过于工整的排比句 → 打散，长短不一
- 太抽象的表达 → 换成具体画面
- 一句话超过 30 个字 → 拆成短句
- 保持作者的语气，不要改成你的风格
${platformHint}

直接输出修改后的完整文章，不要加任何说明、不要加前后缀。标题用 # 标记。`;

  const response = await chat({
    system,
    messages: [
      { role: 'user', content: `请修改以下文章：\n\n${content}` },
    ],
    maxTokens: 4000,
    provider,
  });

  return NextResponse.json({ draft: response.content });
}

async function handleAnalyzeStyle(data: { content: string; title: string }, provider?: AIProvider) {
  const { content, title } = data;

  const system = `你是一位写作风格分析师。你的任务是从文章中精准提取作者的用词、语气、节奏特征，让另一个 AI 能模仿这个风格写作。

分析维度：

1. vocabProfile（用词画像）：
   - 偏口语还是书面？用大词还是小词？
   - 爱用哪类词？（比喻、成语、网络语、方言、专业术语）
   - 有没有反复出现的词或词组？
   - 20 字以内

2. toneProfile（语气画像）：
   - 冷静还是热情？严肃还是幽默？
   - 像谁在说话？（老师、朋友、记者、自言自语）
   - 有没有口头禅或语气词？
   - 20 字以内

3. rhythmProfile（节奏画像）：
   - 长句多还是短句多？比例大概多少？
   - 段落是密还是疏？
   - 读起来快还是慢？有没有停顿感？
   - 20 字以内

4. signaturePhrases（标志性表达）：
   - 从文章中提取 3-5 个最能代表作者风格的词句或句式
   - 用顿号分隔

5. antiPatterns（作者不用什么）：
   - 这篇文章绝对不会出现的表达类型
   - 比如：不用排比、不用成语、不用感叹号
   - 用顿号分隔

6. summary（风格标签）：
   - 一句话，像给人贴标签一样概括这个作者的风格
   - 10 字以内

输出格式（严格 JSON）：
{
  "vocabProfile": "用词画像",
  "toneProfile": "语气画像",
  "rhythmProfile": "节奏画像",
  "signaturePhrases": "标志表达1、标志表达2、标志表达3",
  "antiPatterns": "不用什么1、不用什么2",
  "summary": "风格标签"
}`;

  const plainText = content.replace(/<[^>]*>/g, '').slice(0, 3000);

  const response = await chat({
    system,
    messages: [
      { role: 'user', content: `请分析以下文章的写作风格：\n\n标题：${title}\n\n${plainText}` },
    ],
    maxTokens: 3000,
    provider,
  });

  try {
    // 处理 AI 返回的 markdown 代码块包裹的 JSON
    let text = response.content.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      vocabProfile: '未能解析',
      toneProfile: '未能解析',
      rhythmProfile: '未能解析',
      signaturePhrases: '',
      antiPatterns: '',
      summary: response.content.slice(0, 100),
    });
  }
}

async function handleAnalyzeDiff(data: { aiDraft: string; userVersion: string; title: string }, provider?: AIProvider) {
  const { aiDraft, userVersion, title } = data;

  const system = `你是一位写作风格分析师。你的任务是对比 AI 初稿和用户修改后的版本，找出用户改了什么，从而精准提炼用户的写作风格。

分析方法：
1. 逐段对比，找出用户修改的具体词句
2. 分类统计：删了什么、加了什么、替换了什么
3. 从修改中提炼风格信号

输出格式（严格 JSON）：
{
  "changes": [
    {"type": "replace", "ai": "AI写的", "user": "用户改成的"},
    {"type": "delete", "ai": "用户删掉的内容", "user": ""},
    {"type": "add", "ai": "", "user": "用户自己加的内容"}
  ],
  "vocabInsight": "从修改中看出的用词偏好，20字以内",
  "toneInsight": "从修改中看出的语气偏好，20字以内",
  "rhythmInsight": "从修改中看出的节奏偏好，20字以内",
  "signaturePhrases": "用户反复使用的表达，用顿号分隔",
  "antiPatterns": "用户不用什么，用顿号分隔",
  "summary": "一句话总结用户风格"
}

重点：
- 只列有代表性的修改（最多 8 条），不要列无意义的微调
- 关注用户"主动改了什么"，而不是格式调整
- 如果用户删掉了 AI 味表达（如"首先其次最后"），这是重要信号`;

  const aiPlain = aiDraft.replace(/<[^>]*>/g, '').slice(0, 2000);
  const userPlain = userVersion.replace(/<[^>]*>/g, '').slice(0, 2000);

  const response = await chat({
    system,
    messages: [
      { role: 'user', content: `标题：${title}\n\n## AI 初稿\n${aiPlain}\n\n## 用户修改后\n${userPlain}` },
    ],
    maxTokens: 3000,
    provider,
  });

  try {
    let text = response.content.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      changes: [],
      vocabInsight: '未能解析',
      toneInsight: '未能解析',
      rhythmInsight: '未能解析',
      signaturePhrases: '',
      antiPatterns: '',
      summary: response.content.slice(0, 100),
    });
  }
}
