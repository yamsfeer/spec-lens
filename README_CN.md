# SpecLens

规格文档族的交互式查看器 — 将散落的 Markdown 规格文档转化为可导航、可交互的可视化知识库。

## 为什么需要 SpecLens？

Spec-Driven Development 团队用 Markdown 编写规格文档，其中混合了 SQL DDL、TypeScript 接口、Mermaid 图表、状态机定义和设计令牌。这些文档是唯一的事实来源 — 但它们难以阅读、难以导航、难以跨文档引用。

SpecLens 在机器可解析的规格文档和人友好的可视化界面之间架起桥梁。

## 功能特性

- **Markdown 渲染** — 完整 GFM 支持，Shiki 语法高亮
- **ER 图** — SQL DDL 代码块变为交互式表结构卡片和全局 ER 关系图（React Flow）
- **类型浏览器** — TypeScript 接口渲染为可折叠、语法高亮的类型查看器
- **状态机图** — YAML 定义的状态机渲染为交互式流程图，支持模拟执行
- **Mermaid 图表** — Mermaid.js 原生渲染
- **设计令牌查看器** — 色板、排版预览、间距标尺、阴影预览和依赖关系图
- **跨文档导航** — 点击链接、外键引用、类型引用和状态机关联，在文档间跳转
- **知识图谱** — 查看完整的关系网络：文档引用、ER 关系、类型依赖、令牌引用和状态机关联
- **全文搜索** — 基于 FlexSearch 的搜索，覆盖标题、正文和代码块
- **实时刷新** — 通过 chokidar 监听文件变化，SSE 推送浏览器刷新

## 架构

```
┌──────────────────────────────────────────────────┐
│                  UI 层 (React)                    │
│  导航器 │ 查看器 │ 专用渲染器                      │
├──────────────────────────────────────────────────┤
│              数据层 (Zustand)                      │
│  文档存储 │ 引用存储 │ 索引存储                     │
├──────────────────────────────────────────────────┤
│            解析层 (Pipeline)                       │
│  Markdown │ 代码块分析器 │ 关系提取器               │
├──────────────────────────────────────────────────┤
│               源文件层                             │
│          文件系统监听 (chokidar)                    │
└──────────────────────────────────────────────────┘
```

## 快速开始

### 前置条件

- Node.js >= 18
- pnpm

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/yamsfeer/spec-lens.git
cd spec-lens

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev:full
```

### CLI 使用

```bash
# 添加项目（指向你的文档目录）
spec-lens add ./path/to/specs

# 启动查看器
spec-lens serve --port 3100 --open

# 列出已注册的项目
spec-lens list

# 移除项目
spec-lens remove <slug>
```

## 规格文档约定

SpecLens 识别特殊的代码块语言标记，提供增强渲染：

| 代码块语言 | 渲染效果 |
|---|---|
| `sql` | 表结构卡片、全局 ER 图 |
| `typescript` / `ts` | 可折叠属性的类型浏览器 |
| `design-token` | 色板、排版预览、间距标尺 |
| `state-machine` | 可交互、可模拟的状态机图 |
| `mermaid` | Mermaid.js 图表渲染 |
| `yaml` / `json` | 可折叠的结构化树视图 |

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | React 19 + Vite |
| 语言 | TypeScript |
| Markdown 解析 | unified + remark-parse |
| SQL 解析 | node-sql-parser |
| TS 解析 | ts-morph |
| Markdown 渲染 | react-markdown + rehype |
| 代码高亮 | Shiki |
| 图渲染 | React Flow + dagre |
| Mermaid | mermaid.js |
| 状态管理 | Zustand |
| 搜索 | FlexSearch |
| 文件监听 | chokidar |
| 样式 | Tailwind CSS v4 |
| 路由 | React Router v7 |

## 许可证

MIT
