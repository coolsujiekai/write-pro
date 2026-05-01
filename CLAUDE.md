# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Write Pro 是一个 Hermes Agent Skill，为用户提供从素材到定稿的完整写作流程。不是传统代码项目，而是 Hermes Agent 的行为定义文件（Markdown）。

## 架构

```
hermes-skill/
├── DESCRIPTION.md                    # Skill 分类描述
└── writing-assistant/
    ├── SKILL.md                      # 核心行为定义（8阶段写作流程）
    └── references/
        ├── interview-guide.md        # 采访技巧参考
        └── platform-formats.md       # 公众号/小红书格式规范
```

- `SKILL.md` 是核心，定义了 Hermes Agent 在写作场景下的完整行为
- `references/` 是参考资料，SKILL.md 中引用但不直接加载到对话上下文
- 通过软链接部署到 `~/.hermes/skills/writing/writing-assistant`

## 开发注意事项

- Skill 文件是 Markdown + YAML frontmatter，不是代码
- 修改 SKILL.md 后，Hermes 会实时加载新版本，无需重启
- 版本号在 SKILL.md 的 frontmatter 中管理
- 项目使用中文写作，面向中文内容创作者
- 输出文件到 `~/Desktop/`，用户用 Cursor 编辑后反馈

## 部署

```bash
# 软链接到 Hermes skills 目录
ln -s ~/write-pro/hermes-skill/writing-assistant ~/.hermes/skills/writing/writing-assistant

# 验证
ls -la ~/.hermes/skills/writing/writing-assistant
```

## 测试

在 Hermes CLI 中输入 `/writing-assistant` 触发 Skill，验证完整 8 阶段流程。
