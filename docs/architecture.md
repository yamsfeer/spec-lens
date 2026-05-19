# Specs Viewer — Architecture

**版本**: v0.2-draft
**日期**: 2026-05-18
**状态**: 设计中

---

## 1. 问题定义

Specs 文档以 Markdown 为主，混杂 SQL、TypeScript、YAML、Mermaid、ASCII 图、Design Token、状态机定义等内容。这些文档是 Spec Driven Development 的唯一事实来源，但对人来说不可读、不可导航、不可交互。需要一个工具将 Specs 文档族转化为可感知的可视化界面。

### 核心矛盾

| 面向 Agent | 面向人 |
|-----------|--------|
| Markdown / 代码 = 机器可解析 | 需要 UI 可视化 |
| 文件 = 独立单元 | 需要**跨文档导航**（API → 实体 → 表） |
| 改动 = 编辑文本 | 需要**改动的可视化影响面** |
| 结构 = 目录树 | 需要**知识图谱** |

### 文档类型全景

Specs 文档族包含以下类型，每类有专属的可视化需求：

| 文档类型 | 内容特征 | 可视化需求 |
|---------|---------|-----------|
| **PRD 产品需求** | 用户故事、验收标准、优先级 | 结构化卡片、优先级标签 |
| **Architecture 架构** | 系统分层、技术选型、ADR | 架构图、决策对比 |
| **Contract 契约** | API 端点、数据实体、SQL DDL、ViewModel | API 浏览器、类型浏览器、ER 图 |
| **Design Token** | 颜色、间距、字体、阴影等设计令牌 | 色板、排版预览、令牌浏览器 |
| **UE 交互逻辑** | 状态机定义、状态转换表、页面流 | 交互式状态图、转换路径追踪 |
| **UI 组件规范** | 组件清单、页面规格、状态覆盖 | 组件树、页面流图 |

---

## 2. 系统分层

```
┌──────────────────────────────────────────────────────────┐
│                    UI Layer (React)                       │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────────┐ │
│  │ Navigator  │ │ Viewer    │ │ Specialized Renderers  │ │
│  │ (sidebar,  │ │ (md/ast   │ │ ERD, API, TypeBrowser, │ │
│  │  search,   │ │  render)  │ │ DesignToken, StateMachine│
│  │  graph)    │ │           │ │ KnowledgeGraph         │ │
│  └───────────┘ └───────────┘ └────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│                  Data Layer (Store)                       │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────────┐ │
│  │ DocStore   │ │ RefStore  │ │ IndexStore             │ │
│  │ (AST,     │ │ (cross-   │ │ (search, symbol table, │ │
│  │  meta)    │ │  refs)    │ │  token index)          │ │
│  └───────────┘ └───────────┘ └────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│                 Parse Layer (Pipeline)                    │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────────┐ │
│  │ Markdown   │ │ Code      │ │ Relation               │ │
│  │ Parser     │ │ Block     │ │ Extractor              │ │
│  │ (unified)  │ │ Analyzers │ │ (cross-ref, FK, DT,   │ │
│  │            │ │           │ │  state transition)     │ │
│  └───────────┘ └───────────┘ └────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│                    Source Layer                           │
│           File System Watcher (chokidar)                  │
│            docs/**/*.md, *.sql, *.png                     │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Parse Layer — 解析管线

### 3.1 职责

将原始文件解析为结构化 AST + 提取语义实体，供上层消费。

### 3.2 管线设计

```
Source File
    │
    ▼
┌─────────────┐
│ File Reader  │  读取文件内容，检测编码
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Frontmatter  │  提取 YAML frontmatter（如果存在）
│ Extractor    │  → { version, date, status, layout }
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ MDAST Parser │  unified + remark-parse
│              │  → Markdown AST（heading, paragraph, code, table, link...）
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ Code Block                                            │
│ Dispatcher        ┌─ sql             → SQL Analyzer   │
│                   ├─ typescript / ts → TS Analyzer     │
│                   ├─ design-token    → DT Analyzer     │
│                   ├─ state-machine   → SM Analyzer     │
│                   ├─ mermaid         → Mermaid Extract  │
│                   ├─ yaml / json     → Config Extractor│
│                   └─ 其他            → 透传，不解析     │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ Relation     │  五类关系提取：
│ Extractor    │  1. Markdown link → 文档间引用
│              │  2. SQL FK → 表间关系
│              │  3. TS type reference → 类型间关系
│              │  4. DT token reference → 令牌间依赖
│              │  5. SM state transition → 状态机间关联
└──────┬──────┘
       │
       ▼
  ParsedDocument (结构化输出)
```

### 3.3 Code Block Analyzers

每个 Analyzer 接收 code block 文本，输出结构化数据。

#### SQL Analyzer

输入：SQL DDL（CREATE TABLE, CREATE INDEX, CREATE TRIGGER, CREATE POLICY, CREATE TYPE）

输出：
```typescript
interface SQLParseResult {
  tables: TableDef[];
  enums: EnumDef[];
  indexes: IndexDef[];
  triggers: TriggerDef[];
  policies: PolicyDef[];
  relations: RelationDef[];  // 从 REFERENCES 提取
}

interface TableDef {
  name: string;
  schema: string;
  columns: ColumnDef[];
  constraints: ConstraintDef[];
}

interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: { table: string; column: string };  // FK 指向
}

interface RelationDef {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}
```

解析器选择：**node-sql-parser** — 支持 PostgreSQL 方言，能解析 DDL/DML，活跃维护。

#### TypeScript Analyzer

输入：TypeScript 接口/类型定义

输出：
```typescript
interface TSParseResult {
  interfaces: InterfaceDef[];
  typeAliases: TypeAliasDef[];
  enums: TSEnumDef[];
  imports: ImportDef[];
}

interface InterfaceDef {
  name: string;
  properties: PropertyDef[];
  extends?: string[];        // 继承关系
  exported: boolean;
  jsDoc?: string;
}

interface PropertyDef {
  name: string;
  type: string;              // 原始类型文本
  optional: boolean;
  jsDoc?: string;
}
```

解析器选择：**ts-morph** — 基于 TypeScript Compiler API，能完整解析 TS 语义。

#### Design Token Analyzer

输入：Design Token 定义块。Design Token 在 Markdown 中以 YAML/JSON 代码块 + `design-token` 语言标记存在。

Design Token 是设计系统的原子单位，定义颜色、间距、字体、圆角、阴影等视觉属性。业界主流格式参考 [Style Dictionary](https://amzn.github.io/style-dictionary/) 和 [Design Tokens Community Group](https://design-tokens.github.io/community-group/format/) 的规范。

**Specs 文档中的 Design Token 写法约定**：

```yaml
# ```design-token
color:
  primary:
    value: "#4F46E5"
    type: color
    description: "品牌主色，用于 CTA 按钮、链接"
  secondary:
    value: "#7C3AED"
    type: color
    description: "辅助强调色"
  background:
    base:
      value: "#FFFFFF"
      type: color
    surface:
      value: "#F9FAFB"
      type: color
spacing:
  xs: { value: "4px", type: dimension }
  sm: { value: "8px", type: dimension }
  md: { value: "16px", type: dimension }
  lg: { value: "24px", type: dimension }
  xl: { value: "32px", type: dimension }
typography:
  font-family:
    base: { value: "Inter, system-ui, sans-serif", type: fontFamily }
    mono: { value: "JetBrains Mono, monospace", type: fontFamily }
  font-size:
    xs: { value: "12px", type: dimension }
    sm: { value: "14px", type: dimension }
    base: { value: "16px", type: dimension }
    lg: { value: "18px", type: dimension }
    xl: { value: "24px", type: dimension }
  font-weight:
    normal: { value: "400", type: fontWeight }
    medium: { value: "500", type: fontWeight }
    bold: { value: "700", type: fontWeight }
border-radius:
  sm: { value: "4px", type: dimension }
  md: { value: "8px", type: dimension }
  lg: { value: "12px", type: dimension }
  full: { value: "9999px", type: dimension }
shadow:
  sm: { value: "0 1px 2px rgba(0,0,0,0.05)", type: shadow }
  md: { value: "0 4px 6px rgba(0,0,0,0.1)", type: shadow }
  lg: { value: "0 10px 15px rgba(0,0,0,0.15)", type: shadow }
# ```
```

输出：
```typescript
interface DesignTokenParseResult {
  tokens: TokenDef[];
  groups: TokenGroupDef[];
}

interface TokenDef {
  name: string;              // 完整路径：color.primary
  value: string;             // 原始值
  type: TokenType;           // 令牌类型
  description?: string;
  references?: string[];     // 引用其他令牌，如 {color.primary.value}
}

type TokenType =
  | 'color'
  | 'dimension'            // 间距、字号、圆角等
  | 'fontFamily'
  | 'fontWeight'
  | 'shadow'
  | 'opacity'
  | 'time'                 // 动画时长
  | 'cubicBezier'          // 动画缓动
  | 'other';

interface TokenGroupDef {
  name: string;              // 分组名：color, spacing, typography...
  children: TokenGroupDef[];
  tokens: TokenDef[];        // 该组直接包含的令牌
}
```

解析策略：直接用 YAML/JSON parser 解析代码块内容，然后按 Design Token 的层级结构（`.` 分隔的路径）展平为 TokenDef 数组，同时保留树形分组。

#### State Machine Analyzer

输入：状态机定义块。在 Markdown 中以 YAML 代码块 + `state-machine` 语言标记存在。

**UE 文档的核心是状态机**。一个完善的 UE 文档应包含多个状态机（每个交互流程一个），配合文字说明。状态机定义规范：

```yaml
# ```state-machine
name: 认证流程
id: auth
initial: idle
states:
  idle:
    type: initial
    description: 用户未登录，显示登录入口
    ui: 登录页面

  email_input:
    description: 用户正在输入邮箱
    ui: 邮箱输入表单

  code_sent:
    description: 验证码已发送，等待输入
    ui: 验证码输入框

  authenticating:
    type: processing
    description: 正在验证
    ui: 加载中

  authenticated:
    type: success
    description: 登录成功
    ui: 重定向到首页

  error:
    type: error
    description: 验证失败
    ui: 错误提示，可重试

transitions:
  - from: idle
    trigger: click_login
    to: email_input
    description: 点击登录按钮

  - from: email_input
    trigger: submit_email
    to: code_sent
    guard: email_valid
    description: 提交有效邮箱

  - from: email_input
    trigger: submit_email
    to: email_input
    guard: "!email_valid"
    description: 邮箱格式错误，留在当前状态

  - from: code_sent
    trigger: submit_code
    to: authenticating
    description: 提交验证码

  - from: authenticating
    trigger: auth_success
    to: authenticated
    description: 验证通过

  - from: authenticating
    trigger: auth_failed
    to: error
    description: 验证失败

  - from: error
    trigger: retry
    to: email_input
    description: 重新输入

  - from: error
    trigger: retry_code
    to: code_sent
    description: 重新发送验证码
# ```
```

输出：
```typescript
interface StateMachineParseResult {
  machines: StateMachineDef[];
}

interface StateMachineDef {
  id: string;                // 状态机唯一标识
  name: string;              // 可读名称
  initial: string;           // 初始状态 ID
  states: StateDef[];
  transitions: TransitionDef[];
}

interface StateDef {
  id: string;
  type: StateType;
  description?: string;
  ui?: string;               // 对应的 UI 表现
  onEntry?: string;          // 进入状态的动作
  onExit?: string;           // 离开状态的动作
}

type StateType = 'initial' | 'processing' | 'waiting' | 'success' | 'error' | 'terminal' | 'default';

interface TransitionDef {
  from: string;              // 源状态 ID
  to: string;                // 目标状态 ID
  trigger: string;           // 触发事件
  guard?: string;            // 守卫条件
  description?: string;
}
```

解析策略：YAML parser 解析后校验结构完整性（必须有 initial、至少一个 initial 状态、所有 transition 的 from/to 必须指向已定义的状态）。

#### Mermaid Extractor

不做语法解析，直接提取 Mermaid 文本交给渲染层（mermaid.js）处理。

#### Config Extractor (YAML/JSON)

输入：YAML/JSON 配置块

输出：解析后的 JS 对象，用于结构化展示（如 GitHub Actions workflow 的 job/step 树）。

### 3.4 Relation Extractor — 关系提取

这是最关键的部分，它让 Specs 文档从"一堆独立文件"变成"知识图谱"。

#### 3.4.1 文档间引用

从 Markdown AST 的 link 节点提取。需要处理的问题：

- **路径解析**：相对路径 → 绝对路径（footx-app 中有大量断链，需要容错）
- **锚点解析**：`./PRD.md#section` → 定位到具体 heading
- **隐式引用**：正文中提到 "users 表" 但没有链接 → 需要做符号匹配（可选，后期增强）

```typescript
interface DocRef {
  sourceDoc: string;         // 来源文档路径
  targetDoc: string;         // 目标文档路径
  targetAnchor?: string;     // 锚点
  label: string;             // 链接文本
  resolved: boolean;         // 是否能解析到目标
}
```

#### 3.4.2 数据库关系（FK → ER 图）

从 SQL Analyzer 的 `RelationDef[]` 提取，构建 ER 图所需的关系图。

#### 3.4.3 类型关系（TS extends/reference → 类型图）

从 TS Analyzer 提取 `extends` 和引用关系，构建类型依赖图。

#### 3.4.4 Design Token 依赖关系

Token 之间可以互相引用，例如：

```yaml
button:
  bg: { value: "{color.primary.value}", type: color }
  padding: { value: "{spacing.sm.value} {spacing.md.value}", type: dimension }
```

解析 `{token.path}` 引用，构建 Token 依赖图。这可以：
- 检测循环引用
- 在可视化中高亮某个 Token 的所有下游消费者
- 追踪 "如果我改了 color.primary，哪些组件会受影响"

#### 3.4.5 状态机间关联

状态机不是孤立的，它们之间有交互。例如：
- "认证" 状态机的 `authenticated` 状态 → 触发 "订单" 状态机的 `browse` 状态
- "支付" 状态机的 `payment_failed` 状态 → 可能触发 "客服" 状态机的 `ai_chat` 状态

两种关联方式：

1. **显式关联**：在 state-machine 定义中声明
```yaml
# 在 state-machine 代码块中
links:
  - state: authenticated
    targetMachine: order
    targetState: browse
    description: 登录成功后进入浏览
```

2. **隐式推断**：从文档正文中提取（Phase 3+ 增强）

```typescript
interface MachineLink {
  sourceMachine: string;     // 源状态机 ID
  sourceState: string;       // 源状态 ID
  targetMachine: string;     // 目标状态机 ID
  targetState: string;       // 目标状态 ID
  description?: string;
}
```

---

## 4. Data Layer — 数据层

### 4.1 数据模型

```typescript
// 项目 = 一个 Specs 文档族
interface Project {
  rootDir: string;
  documents: Map<string, ParsedDocument>;   // path → document
  relations: ProjectRelations;
  index: SearchIndex;
}

interface ParsedDocument {
  path: string;                             // 相对于 rootDir
  category: DocCategory;
  frontmatter?: Frontmatter;
  ast: Root;                                // MDAST Root node
  meta: DocMeta;
  codeBlocks: CodeBlockResult[];            // 各 Analyzer 的输出
}

type DocCategory = 'prd' | 'uiux' | 'architecture' | 'contract' | 'other';

interface Frontmatter {
  version?: string;
  date?: string;
  status?: string;
  layout?: string;
  [key: string]: unknown;
}

interface DocMeta {
  title: string;                            // 从 H1 或 frontmatter 提取
  headings: HeadingDef[];
  wordCount: number;
  lastModified: Date;
}

interface ProjectRelations {
  docRefs: DocRef[];                        // 文档间引用
  erRelations: RelationDef[];               // ER 关系
  typeRelations: TypeRelation[];            // TS 类型关系
  tokenRelations: TokenRelation[];          // Design Token 依赖
  machineLinks: MachineLink[];              // 状态机间关联
}

interface TypeRelation {
  from: string;    // 接口名
  to: string;      // 接口名
  type: 'extends' | 'references' | 'composition';
}

interface TokenRelation {
  from: string;    // 令牌路径，如 button.bg
  to: string;      // 令牌路径，如 color.primary
}
```

### 4.2 状态管理

选择：**Zustand**

理由：
- 轻量，无 boilerplate
- 支持订阅选择器，渲染层只订阅需要的切片
- 解析结果是静态的（文件不变则数据不变），不需要复杂的异步状态机

```typescript
type ViewMode = 'doc' | 'erd' | 'api' | 'graph' | 'design-tokens' | 'state-machines';

interface SpecStore {
  // 数据
  project: Project | null;

  // UI 状态
  activeDoc: string | null;                 // 当前查看的文档路径
  activeSection: string | null;             // 当前滚动到的 heading
  sidebarOpen: boolean;
  viewMode: ViewMode;

  // Actions
  loadProject(rootDir: string): Promise<void>;
  setActiveDoc(path: string): void;
  setViewMode(mode: ViewMode): void;
}
```

### 4.3 文件监听

开发时需要实时反映 Specs 文档的修改。

选择：**chokidar**

- 监听 `docs/` 目录下的文件变化
- 文件变更 → 重新解析该文件 → 更新 Store → UI 自动刷新
- 支持增量解析，不需要全量重建

---

## 5. UI Layer — 渲染层

### 5.1 页面结构

```
┌──────────────────────────────────────────────────────────┐
│  Top Bar: 项目名 | 搜索 | 视图切换 | 主题                 │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ Sidebar  │              Content Area                     │
│          │                                               │
│ ┌──────┐ │  ┌─────────────────────────────────────────┐  │
│ │ PRD  │ │  │                                         │  │
│ │  ├   │ │  │    Document View / Specialized View     │  │
│ │ UIUX │ │  │                                         │  │
│ │  ├   │ │  │                                         │  │
│ │ Arch │ │  │                                         │  │
│ │  ├   │ │  │                                         │  │
│ │ Contr│ │  │                                         │  │
│ └──────┘ │  └─────────────────────────────────────────┘  │
│          │                                               │
│ ──────── │  ──────────────────────────────────────────── │
│ Relations│  Breadcrumb: PRD > PRD.md                      │
│ Panel    │                                               │
├──────────┴───────────────────────────────────────────────┤
│  Status Bar: 解析状态 | 文档数 | 关系数 | 上次更新         │
└──────────────────────────────────────────────────────────┘
```

### 5.2 视图模式

#### A. Document View — 文档视图（默认）

Markdown 渲染 + 增强渲染。这是最主要的视图，一篇文档一个页面。

**Markdown 基础渲染**：使用 **react-markdown** + remark/rehype 插件生态。

**增强渲染** — 根据代码块语言替换为专用组件：

| 代码块语言 | 增强渲染组件 | 说明 |
|-----------|------------|------|
| `sql` (DDL) | `<ERTableCard>` | 表结构卡片，可展开/折叠，FK 可点击跳转 |
| `sql` (整体) | `<ERDiagram>` | 全局 ER 图视图，用 React Flow 渲染 |
| `typescript` / `ts` | `<TypeBrowser>` | 接口/类型可折叠浏览器，属性有类型高亮 |
| `design-token` | `<DesignTokenViewer>` | 色板预览、排版预览、令牌浏览器 |
| `state-machine` | `<StateMachineDiagram>` | 交互式状态机图，可模拟状态转换 |
| `mermaid` | `<MermaidDiagram>` | mermaid.js 渲染 |
| `yaml` | `<YAMLViewer>` | 结构化树形展示，可折叠 |
| `json` | `<JSONViewer>` | 同上 |
| 普通代码 | `<CodeBlock>` | 语法高亮（Shiki） |

#### B. ER Diagram View — 全局 ER 图

将所有文档中的 SQL DDL 汇总，渲染一张完整的 ER 关系图。

- 使用 **React Flow** 渲染
- 节点 = 表（TableDef），边 = FK 关系（RelationDef）
- 布局：dagre 自动布局
- 交互：点击表 → 弹出表结构卡片；点击边 → 高亮关联；缩放/平移；按 category 分组

#### C. API Browser View — API 浏览器

将 `api-contract.md` 中的所有端点汇总为可浏览的 API 列表。

- 左侧：按模块分组的端点列表
- 右侧：端点详情（method, path, request/response type, error codes）
- 点击 TS 类型 → 跳转到 TypeBrowser 或 data-entities.md 对应位置

#### D. Design Token View — 令牌浏览器

将所有文档中的 Design Token 汇总，提供多维度浏览。

**视图面板**：

| 面板 | 内容 | 交互 |
|------|------|------|
| **色板** | 所有 `type: color` 的令牌，按分组排列 | 实际颜色块 + hex 值，点击复制 |
| **排版预览** | 字体、字号、字重的组合预览 | 用真实文本渲染出效果 |
| **间距标尺** | 所有 `type: dimension` 的令牌 | 可视化间距大小对比 |
| **阴影预览** | 所有 `type: shadow` 的令牌 | 在卡片上实际渲染阴影效果 |
| **令牌树** | 完整的层级结构（树形） | 可折叠，搜索，按类型过滤 |
| **依赖图** | Token 间的引用关系 | 高亮某个 Token 的上游/下游 |

**关键交互**：
- 点击令牌 → 高亮所有引用该令牌的下游令牌
- 搜索：按名称、值、描述搜索
- 分组过滤：只看颜色 / 只看间距 / 只看排版
- 嵌入文档中：`design-token` 代码块直接渲染为内联色板/排版预览

#### E. State Machine View — 状态机浏览器

将所有文档中的状态机定义汇总，提供交互式浏览。

**全局视图**：
- 左侧：状态机列表，按文档分组
- 右侧：选中状态机的交互式图

**单个状态机图**（使用 React Flow 渲染）：
- 节点 = 状态（StateDef），不同 StateType 用不同颜色/形状
  - initial → 实心圆点
  - processing → 蓝色圆角矩形
  - waiting → 黄色圆角矩形
  - success → 绿色圆角矩形
  - error → 红色圆角矩形
  - terminal → 双圈
  - default → 灰色圆角矩形
- 边 = 转换（TransitionDef），标注 trigger 和 guard
- 交互：
  - **模拟执行**：点击 trigger → 状态从 current 转到 target，高亮路径
  - **路径追踪**：选择两个状态 → 显示所有可达路径
  - **状态详情**：点击节点 → 弹出面板显示 description、ui、onEntry/onExit
  - **转换详情**：点击边 → 弹出面板显示 trigger、guard、description
  - **关联跳转**：如果状态声明了 `targetMachine`，点击可跳转到目标状态机

**多状态机关联图**：
- 在知识图谱视图中，状态机之间通过 `MachineLink` 连接
- 可以看到"认证 → 订单 → 支付 → 客服"的完整用户旅程

#### F. Knowledge Graph View — 知识图谱

将文档间引用、ER 关系、类型关系、Token 依赖、状态机关联全部渲染为一张图。

- 使用 **React Flow** 或 **sigma.js**（如果节点多）
- 节点类型：文档、表、接口、令牌、状态机
- 边类型：引用、FK、extends、token-ref、machine-link
- 交互：点击节点 → 跳转；高亮某节点的所有关联；按类型过滤节点

### 5.3 导航

#### Sidebar — 文档树

按目录结构展示，每个分类可折叠。图标区分文档类型。

#### 搜索

- 全文搜索：**FlexSearch**（轻量，纯前端）
- 搜索范围：heading、正文、代码块内容
- 搜索结果按文档分组，显示匹配上下文

#### Breadcrumb

显示当前文档在文档族中的位置，可点击跳转到上级。

#### Cross-reference — 跨文档跳转

这是区别于普通文档站的核心能力：

- 渲染 Markdown link 时，解析目标路径，生成应用内路由（而非 `<a href>`）
- 断链检测：标记无法解析的链接（红色虚线），footx-app 中有大量此类链接
- 符号跳转：在 ER 图中点击 FK → 跳转到目标表的文档位置；在类型浏览器中点击引用类型 → 跳转到定义；在状态机中点击关联状态 → 跳转到目标状态机

---

## 6. 技术选型

| 层 | 技术 | 理由 |
|----|------|------|
| **框架** | React 19 + Vite | 生态成熟，组件库丰富，Vite 开发体验好 |
| **语言** | TypeScript | 全栈类型安全，与 Specs 中的 TS 代码同语言 |
| **Markdown 解析** | unified + remark-parse | MDAST 标准生态，插件丰富，可扩展 |
| **SQL 解析** | node-sql-parser | 支持 PostgreSQL，活跃维护 |
| **TS 解析** | ts-morph | 基于 TS Compiler API，完整语义 |
| **Design Token 解析** | js-yaml + 自定义校验 | YAML 解析后按 DT 规范校验结构 |
| **State Machine 解析** | js-yaml + 自定义校验 | YAML 解析后校验状态机完整性 |
| **Markdown 渲染** | react-markdown + rehype | 与 unified 生态无缝衔接 |
| **代码高亮** | Shiki | VSCode 级别高亮，支持 VSCode 主题 |
| **ER 图 / 状态机 / 图谱** | React Flow | 可交互节点图，支持自定义节点/边，社区活跃 |
| **Mermaid 渲染** | mermaid.js | 业界标准 |
| **状态管理** | Zustand | 轻量，无 boilerplate |
| **全文搜索** | FlexSearch | 纯前端，高性能 |
| **文件监听** | chokidar | Node.js 文件监听标准库 |
| **样式** | Tailwind CSS v4 | 快速开发，与 React 组件配合好 |
| **路由** | React Router v7 | 标准选择 |
| **包管理** | pnpm | 快速，磁盘高效 |

---

## 7. 项目结构

```
specs-viewer/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── src/
│   ├── main.tsx                         # 入口
│   ├── App.tsx                          # 根组件 + 路由
│   │
│   ├── parse/                           # Parse Layer
│   │   ├── pipeline.ts                  # 解析管线编排
│   │   ├── frontmatter.ts               # YAML frontmatter 提取
│   │   ├── markdown.ts                  # unified + remark-parse
│   │   ├── analyzers/
│   │   │   ├── sql.ts                   # SQL Analyzer (node-sql-parser)
│   │   │   ├── typescript.ts            # TS Analyzer (ts-morph)
│   │   │   ├── design-token.ts          # Design Token Analyzer
│   │   │   ├── state-machine.ts         # State Machine Analyzer
│   │   │   ├── mermaid.ts               # Mermaid 文本提取
│   │   │   └── config.ts               # YAML/JSON 解析
│   │   ├── relations/
│   │   │   ├── doc-refs.ts              # 文档间引用提取
│   │   │   ├── er-relations.ts          # ER 关系提取
│   │   │   ├── type-relations.ts        # TS 类型关系提取
│   │   │   ├── token-relations.ts       # Token 依赖关系提取
│   │   │   └── machine-links.ts         # 状态机间关联提取
│   │   └── types.ts                     # 解析层类型定义
│   │
│   ├── store/                           # Data Layer
│   │   ├── spec-store.ts                # Zustand store
│   │   ├── watcher.ts                   # chokidar 文件监听
│   │   └── search-index.ts              # FlexSearch 索引
│   │
│   ├── components/                      # UI Layer
│   │   ├── layout/
│   │   │   ├── AppShell.tsx             # 整体布局
│   │   │   ├── Sidebar.tsx              # 侧边栏
│   │   │   ├── TopBar.tsx               # 顶栏
│   │   │   └── StatusBar.tsx            # 底部状态栏
│   │   ├── doc-view/
│   │   │   ├── DocumentView.tsx         # 文档视图主组件
│   │   │   ├── MarkdownRenderer.tsx     # Markdown 渲染器
│   │   │   ├── CodeBlock.tsx            # 通用代码块
│   │   │   └── HeadingAnchor.tsx        # 标题锚点
│   │   ├── enhanced/                    # 增强渲染组件
│   │   │   ├── ERTableCard.tsx          # 表结构卡片
│   │   │   ├── ERDiagram.tsx            # 全局 ER 图
│   │   │   ├── TypeBrowser.tsx          # TS 类型浏览器
│   │   │   ├── APIBrowser.tsx           # API 端点浏览器
│   │   │   ├── DesignTokenViewer.tsx    # Design Token 令牌浏览器
│   │   │   ├── DesignTokenSwatch.tsx    # 色板组件
│   │   │   ├── DesignTokenTypography.tsx# 排版预览组件
│   │   │   ├── DesignTokenSpacing.tsx   # 间距标尺组件
│   │   │   ├── DesignTokenShadow.tsx    # 阴影预览组件
│   │   │   ├── StateMachineDiagram.tsx  # 状态机交互图
│   │   │   ├── StateMachineSimulator.tsx# 状态机模拟执行器
│   │   │   ├── MermaidDiagram.tsx       # Mermaid 渲染
│   │   │   ├── YAMLViewer.tsx           # YAML 结构化展示
│   │   │   └── JSONViewer.tsx           # JSON 结构化展示
│   │   ├── navigation/
│   │   │   ├── SearchDialog.tsx         # 搜索弹窗
│   │   │   ├── Breadcrumb.tsx           # 面包屑
│   │   │   └── CrossRefLink.tsx         # 跨文档链接
│   │   └── graph/
│   │       └── KnowledgeGraph.tsx       # 知识图谱视图
│   │
│   ├── pages/                           # 页面级组件
│   │   ├── DocPage.tsx                  # /doc/:path*
│   │   ├── ERDPage.tsx                  # /erd
│   │   ├── APIPage.tsx                  # /api
│   │   ├── DesignTokenPage.tsx          # /design-tokens
│   │   ├── StateMachinePage.tsx         # /state-machines
│   │   └── GraphPage.tsx               # /graph
│   │
│   └── lib/                             # 工具函数
│       ├── path-resolver.ts             # 路径解析（处理断链）
│       └── category-detector.ts         # 文档分类检测
│
└── docs/                                # 本项目自身的 Specs
    └── architecture.md                  # 就是本文档
```

---

## 8. 路由设计

```
/                       → 重定向到第一个文档
/doc/:path*             → 文档视图（默认）
/erd                    → 全局 ER 图
/api                    → API 浏览器
/design-tokens          → Design Token 浏览器
/state-machines         → 状态机浏览器
/graph                  → 知识图谱
```

`/doc/` 路由示例：
- `/doc/PRD/PRD.md` → 渲染 PRD.md
- `/doc/contract/database-schema.md` → 渲染 database-schema.md，SQL 代码块增强为表结构卡片
- `/doc/UIUX/state-machine-design.md` → 渲染状态机文档，`state-machine` 代码块增强为交互式状态图

---

## 9. 开发阶段

### Phase 1: 最小可用 — 文档阅读器

目标：能打开一个 Specs 目录，浏览 Markdown 文档，代码块有语法高亮。

- 文件读取 + Markdown 解析
- react-markdown 渲染 + Shiki 高亮
- Sidebar 文档树
- 基础路由

### Phase 2: 增强渲染 — 代码块语义化

目标：SQL → 表结构卡片，TS → 类型浏览器，Mermaid → 图表渲染，Design Token → 令牌浏览器，State Machine → 状态机图。

- SQL Analyzer + ERTableCard
- TS Analyzer + TypeBrowser
- Design Token Analyzer + DesignTokenViewer（色板、排版、间距、阴影）
- State Machine Analyzer + StateMachineDiagram（交互式状态图）
- Mermaid 渲染
- YAML/JSON 结构化展示

### Phase 3: 关系与导航 — 跨文档跳转

目标：文档间链接可点击跳转，断链检测，全文搜索，跨类型跳转。

- 文档间引用提取 + CrossRefLink
- 路径解析器（处理断链）
- FlexSearch 全文搜索
- Token 依赖关系提取 + 依赖图
- 状态机间关联提取 + 关联跳转

### Phase 4: 全局视图 — 汇总浏览器

目标：超越单文档视角，看到整个 Specs 的关系全貌。

- ER Diagram View
- API Browser View
- Design Token View（全局令牌浏览器 + 依赖图）
- State Machine View（多状态机一览 + 模拟执行 + 用户旅程）
- Knowledge Graph View（全类型关系图谱）

### Phase 5: 实时与工程化

目标：文件监听实时刷新，生产部署。

- chokidar 文件监听
- 增量解析
- 生产构建 + 部署方案

---

## 10. 已决定的开放问题

1. **ASCII 图处理策略**：Phase 1 原样展示在代码块中，后续可考虑让用户手动标注为 Mermaid 替代。
2. **多项目支持**：Phase 1 只支持单项目，通过配置文件指定 `rootDir`。
3. **编辑能力**：先只做只读查看器，编辑回到 IDE。
4. **部署形态**：先做 Vite dev server，后续可考虑 Electron。
