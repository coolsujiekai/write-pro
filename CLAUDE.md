# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

本文件为 Claude Code（claude.ai/code）及同类助手在本仓库中协作时的说明；与代码不一致时以仓库为准。

## 项目概览

Write Pro 是写作平台，包含：

1. **Hermes Agent Skill**（`hermes-skill/`）— Markdown 行为定义，覆盖 8 阶段写作流程。
2. **Web 前端**（`src/`）— Next.js 编辑器、流程 UI、多平台排版。

## 运行环境

- **推荐**：Node.js **20 LTS 及以上**（与 `@types/node` 一致）；本地开发亦可在 **23.x** 下运行。
- **包管理**：npm（`package-lock.json`）。
- **npm 镜像**：国内可使用 `https://registry.npmmirror.com`（可选，非强制）。

## 架构与目录

```
write-pro/
├── hermes-skill/                    # Hermes Skill（可与外部部署目录软链）
│   ├── DESCRIPTION.md
│   └── writing-assistant/
│       ├── SKILL.md                 # 8 阶段流程定义
│       └── references/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 首页 / 文章列表
│   │   ├── write/[id]/page.tsx      # 写作主界面（编辑器 + 流程）
│   │   ├── format/[id]/page.tsx     # 排版预览（HTML → 各平台）
│   │   └── api/
│   │       ├── ai/route.ts          # AI：采访、主题、草稿、润色等（POST JSON）
│   │       ├── articles/route.ts    # 文章 CRUD：GET 列表 / POST 保存 / DELETE
│   │       ├── articles/export/route.ts  # 导出 Markdown（POST `{ id }`）
│   │       ├── settings/route.ts    # AI 配置读写（GET 脱敏 / POST 保存）
│   │       └── style-memory/route.ts # 风格记忆持久化（GET/POST）
│   ├── components/
│   │   ├── editor/                  # Tiptap、工具栏
│   │   ├── workflow/                # 各阶段流程 UI
│   │   └── ui/                      # 设置、平台选择等
│   ├── lib/
│   │   ├── ai/                      # 多厂商 AI 客户端、config.json
│   │   ├── format/                  # Markdown → HTML、juice、各平台适配
│   │   ├── storage/article-files.ts # 文章落盘
│   │   └── workflow/                # 类型与状态机
│   └── stores/                      # Zustand
├── 作品/                            # 运行时生成：每篇文章一个 JSON（勿提交密钥）
├── package.json
├── tsconfig.json
└── next.config.ts
```

## 数据流（简要）

- **编辑器正文**：以 **HTML** 存于文章模型中的 `content`，经排版管线转为各平台格式。
- **持久化**：服务端将文章写入项目根目录下的 **`作品/`**，单文件 JSON；列表与读写走 **`/api/articles`**。
- **排版**：从写作页进入 **`/format/[id]`**，使用 `src/lib/format/` 与各 `platforms/` 实现。

## 关键架构模式

以下模式从代码中不易一眼看出，修改相关代码时需注意：

### 双重持久化

数据同时存在于 **localStorage**（Zustand persist）和**服务端文件系统**（`作品/`）。每次 store 变更会 1 秒防抖后 `POST /api/articles` 同步到服务端。加载时按 `updatedAt` 时间戳合并：服务端优先，本地更新则本地胜出。

### AI 路由分发

`/api/ai` 是单一路由，通过 `action` 字段分发到 8 个处理器（interview、suggest-theme、generate-draft、check-ai、rewrite、polish-draft、analyze-style、analyze-diff）。AI 返回的 JSON 常有格式问题，`extractJson()` 会处理 markdown 围栏、中文引号、尾逗号和花括号匹配。

### 内容格式二元性

编辑器存 **HTML**（Tiptap 输出），AI 生成 **Markdown**。草稿生成管线在写入编辑器前通过 `markdownToHtml()` 转换。导出时再用正则从 HTML 转回 Markdown。

### 风格学习闭环

Phase 8 分析 AI 草稿与用户修改的差异，构建持久化风格画像。该画像通过 `stylePrompt` 注入未来的 `generate-draft` 调用，跨文章积累写作风格。

### 平台写作规则

各平台（公众号/小红书/知乎）的 AI 写作规则硬编码在 `handleGenerateDraft` 和 `handlePolishDraft` 中，非配置化模板。

## AI 配置与环境变量

- **模板**：复制 **`.env.example`** 为 `.env.local`（勿把真实 Key 写入仓库）。
- **优先级**（与 `src/lib/ai/client.ts` 一致）：请求头 **`X-AI-Provider`** 可指定厂商；否则使用 **`src/lib/ai/config.json`** 里第一个已配置 Key 的 provider；再否则回退 **环境变量**（MiMo → Anthropic → OpenAI）。
- **MiMo**：`MIMO_API_KEY`，可选 `MIMO_BASE_URL`、`MIMO_MODEL`。
- **Anthropic**：`ANTHROPIC_API_KEY`。
- **OpenAI**：`OPENAI_API_KEY`。
- **设置 UI**：通过 **`/api/settings`** 持久化到 `src/lib/ai/config.json`；GET 仅返回是否已配置 Key（脱敏）。

未配置任何 Key 时，调用 AI 会报错提示在设置中配置。

## 技术栈

- **框架**：Next.js 16（App Router）、TypeScript、React 19。
- **编辑器**：Tiptap（ProseMirror）。
- **样式**：Tailwind CSS v4。
- **状态**：Zustand。
- **排版**：markdown-it、juice（公众号等需 inline styles）。

## 开发命令

```bash
npm run dev      # next dev
npm run build    # next build（生产构建）
npm run start    # 生产环境启动
npm run lint     # ESLint
```

当前 **未配置** `npm test`；新增测试时可在此补充命令。

## 已知问题

- 开发与构建均依赖 SWC 原生绑定（如 `@next/swc-darwin-arm64`）。若二进制损坏或架构不匹配，可删除 `node_modules` 与 npm 缓存后重装。
- `next.config.ts` 可能对 dev/prod  bundler 有约定；若 dev 与 build 表现不一致，对照官方文档与本地配置排查。
- **`src/lib/ai/config.json` 已提交到仓库**，当前包含真实的 MiMo API Key。修改 AI 配置时注意不要意外泄露。
- 所有 API 路由无认证，仅限本地开发使用。
- 存储层使用同步 `fs` 操作（`readFileSync`/`writeFileSync`），会阻塞事件循环。

## 开发提示

- 路径别名：`@/*` 映射到 `./src/*`（tsconfig.json）。
- 无测试框架：当前未配置 jest/vitest/playwright，`npm test` 不可用。
- Tailwind CSS v4 使用 CSS-based 配置，非 v3 的 `tailwind.config.js`。
- Zustand v5 API：使用 `create` from `zustand`，非旧版 default export。
- Phase 跳转：状态机定义严格顺序转换，但 UI 通过 `setPhase()` 允许跳过阶段。

## 开发注意事项

- 文案与产品语境：**中文**，面向中文内容创作者。
- **公众号**：排版依赖 **inline styles**（juice）。
- **小红书**：短文 + 标签 + 封面文案模式（见各 platform 实现）。
- **Hermes Skill**：可与仓库内 `hermes-skill/` 保持一致；对外部署时常用 **软链** 指向统一 Skill 目录。

## 与 IDE 规则的关系

仓库中无 `.cursor/rules`、`.cursorrules` 或 `.github/copilot-instructions.md`。若将来添加 IDE 专用规则，与本文件冲突时：**以可执行的代码与 `package.json` 为准**，并同步更新文档以免助手误判。

