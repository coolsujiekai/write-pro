# CLAUDE.md

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
│   │       └── settings/route.ts    # AI 配置读写（GET 脱敏 / POST 保存）
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

## 开发注意事项

- 文案与产品语境：**中文**，面向中文内容创作者。
- **公众号**：排版依赖 **inline styles**（juice）。
- **小红书**：短文 + 标签 + 封面文案模式（见各 platform 实现）。
- **Hermes Skill**：可与仓库内 `hermes-skill/` 保持一致；对外部署时常用 **软链** 指向统一 Skill 目录。

## 与 Cursor 规则的关系

若仓库中存在 `.cursor/rules` 等 IDE 专用规则，与本文件冲突时：**以可执行的代码与 `package.json` 为准**，并同步更新文档以免助手误判。
