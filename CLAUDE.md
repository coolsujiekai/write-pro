# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

本文件为 Claude Code 在本仓库中协作时的说明；与代码不一致时以仓库为准。

## 项目概览

Write Pro 是面向中文创作者的 AI 辅助写作平台，覆盖从素材收集到多平台排版的完整流程。

- **Hermes Skill**（`hermes-skill/writing-assistant/`）— 8 阶段写作流程的规范定义
- **Web 前端**（`src/`）— Next.js 16 App Router、Tiptap 编辑器、流程 UI、多平台排版

## 开发命令

```bash
npm run dev          # next dev（端口默认 3000）
npm run build        # 生产构建
npm run start        # 生产启动
npm run lint         # ESLint
npm test             # vitest run（39 tests）
npm run test:watch   # vitest（监视模式）
npm run test:coverage # vitest + 覆盖率
```

## 技术栈

Next.js 16 (App Router) · TypeScript 5 · React 19 · Tiptap (ProseMirror) · Zustand v5 · Tailwind CSS v4 · markdown-it + juice · Vitest + jsdom

## 架构

### 页面路由

| 路由 | 文件 | 说明 |
|------|------|------|
| `/` | `src/app/page.tsx` | 文章列表（含搜索/平台筛选） |
| `/write/[id]` | `src/app/write/[id]/page.tsx` | 写作主界面（左侧编辑器 + 右侧流程面板） |
| `/format/[id]` | `src/app/format/[id]/page.tsx` | 多平台排版预览 |

### API 路由

`/api/ai` — 单一路由，通过 `action` 字段分发到 9 个 handler：

| action | 用途 | 模型 tier |
|--------|------|-----------|
| `interview` | 生成采访问题 | light |
| `suggest-theme` | 建议主题 | light |
| `generate-draft` | 生成初稿 | standard |
| `check-ai` | 检查 AI 味 | light |
| `rewrite` | 按指令改写 | standard |
| `polish-draft` | 四视角打磨（读者/编辑/风格/平台） | standard |
| `analyze-style` | 分析写作风格 | standard |
| `analyze-diff` | 对比 AI 初稿与用户修改 | standard |
| `search-materials` | 搜索互联网素材 | 无 AI（Tavily/Bocha） |

`/api/articles` — GET 列表 / POST 保存（含 `sendBeacon` 兜底）/ DELETE 删除

`/api/settings` — GET 脱敏读取 / POST 保存 AI 配置 + 搜索配置到 `src/lib/ai/config.json`

`/api/style-memory` — 风格记忆的服务端持久化

### 关键架构模式

**布局系统** — root layout (`layout.tsx`) 集成共享 Footer，各页面自行渲染 Navbar 并通过 props 传递页面特定操作（actions/backTo）。写作用页使用 `flex flex-col flex-1` 适配 sidebar + editor 的三栏布局。

**双重持久化** — 数据同时存在于 localStorage（Zustand persist）和服务端 `作品/` 目录。store 变更 1s 防抖 `POST /api/articles`。加载时按 `updatedAt` 合并。关闭标签页前 `beforeunload` → `sendBeacon` 兜底。

**内容格式二元性** — 编辑器存 HTML（Tiptap），AI 生成 Markdown。`markdownToHtml()` 做 MD→HTML 写入编辑器；排版管线 `inlineStyles(html, CSS)` 直接处理 HTML（不再经过 MD 中间层）。

**AI 多接口** — 所有 provider 统一走 OpenAI 兼容 `/chat/completions`，仅 baseUrl + model + apiKey 不同。支持流式 SSE + 指数退避重试（3 次）+ 30s 超时。并发限制 3。

**模型分级** — light（mimo-v2.5-mini / deepseek-chat / moonshot-v1-8k / gpt-4o-mini）用于简单任务；standard（mimo-v2.5-pro / deepseek-reasoner / moonshot-v1-32k / gpt-4o）用于生成和润色。

**Prompt 来源** — 去 AI 味规则从 `SKILL.md` 的 `<!-- prompt:no-ai-taste -->` 块加载。平台写作规则从 `references/platform-formats.md` 解析（`src/lib/platform-rules.ts`）。流程阶段定义从 `phases.json` 加载。

**风格学习** — 20 条加权记忆（最近 3 篇权重 1.0，衰减到 0.3），跨文章检测 ironRules（≥3 次 antiPatterns）和 hallmarks（≥3 次 signaturePhrases）。通过 `stylePrompt` 注入未来 generate-draft。

### lib 模块速查

| 路径 | 职责 |
|------|------|
| `lib/ai/client.ts` | 多接口 AI 调用（chat + chatStream + 重试） |
| `lib/ai/config-manager.ts` | config.json 读写（含旧格式迁移） |
| `lib/ai/token-utils.ts` | 动态 maxTokens 分配 |
| `lib/ai/concurrency.ts` | 服务端并发限制器（max 3） |
| `lib/ai/extract-json.ts` | 从 AI 返回中提取 JSON |
| `lib/search/search-service.ts` | Tavily/Bocha 搜索（优先 config.json → 环境变量） |
| `lib/platform-rules.ts` | 从 platform-formats.md 解析平台规则 |
| `lib/skill/prompt-loader.ts` | 从 SKILL.md 解析 prompt 块 |
| `lib/quality/metrics.ts` | 采纳率/修改率/重写率 + 趋势分析 |
| `lib/workflow/types.ts` | 全部类型定义、PHASES、getPhaseDefinition() |
| `lib/workflow/state-machine.ts` | `canTransition()` / `getNextPhase()` |
| `lib/format/` | markdown↔html、juice inline styles、三平台适配 |
| `lib/storage/` | 文章 + 风格记忆落盘（fs/promises） |

### 组件速查

| 文件 | 说明 |
|------|------|
| `workflow/MaterialIntake.tsx` | Phase 1：素材输入 + 搜索 |
| `workflow/Interview.tsx` | Phase 2：AI 采访 |
| `workflow/ThemeConfirm.tsx` | Phase 3：主题确认 |
| `workflow/StructurePlan.tsx` | Phase 4：结构规划 |
| `workflow/DraftReview.tsx` | Phase 5-6：生成/搜索/打磨/检查 |
| `workflow/FinalOutput.tsx` | Phase 7-8：定稿 + 风格分析 + 质量报告 |
| `ui/SettingsModal.tsx` | AI 配置 + 模型切换 + 搜索 Key 配置 |
| `ui/Feedback.tsx` | 👍👎 反馈组件（4 个 AI 输出点） |
| `ui/ErrorBoundary.tsx` | React 错误边界 |
| `ui/Navbar.tsx` | 共享导航栏（sticky + backdrop-blur），支持 title/actions/backTo props |
| `ui/Footer.tsx` | 共享极简 Footer（集成在 root layout） |
| `ui/PlatformSelector.tsx` | 三平台切换控件（公众号/小红书/知乎） |

## AI 配置

**默认 provider**：MiMo。可通过前端设置页切换或 `X-AI-Provider` 请求头指定。

**配置优先级**（`client.ts` 的 `resolveProvider()`）：
1. 请求指定的 provider（`X-AI-Provider` 头）
2. config.json 的 `defaultProvider`
3. 第一个已配 Key 的 provider
4. 环境变量回退（`MIMO_API_KEY` → `DEEPSEEK_API_KEY` → `KIMI_API_KEY` → `OPENAI_API_KEY`）

**搜索 Key**：在设置页配置，存入 `config.json` 的 `search` 字段。也可用环境变量 `TAVILY_API_KEY` 或 `BOCHA_API_KEY`。

**环境变量**：复制 `.env.example` 为 `.env.local`。目前仅搜索功能需要（AI Key 通过 UI 配）。

## 注意事项

- 路径别名 `@/*` → `./src/*`
- Zustand v5 API：`create` from `zustand`（非 default export）
- Tailwind CSS v4 用 CSS-based 配置（无 `tailwind.config.js`）
- `src/lib/ai/config.json` 在 `.gitignore` 中，不提交。模板在 `config.default.json`
- 存储层已全部迁移到 `fs/promises`，异步调用
- 所有 API 路由无认证，仅本地使用
- Phase 跳转：状态机定义严格顺序，但 UI 允许通过 `setPhase()` 跳过
