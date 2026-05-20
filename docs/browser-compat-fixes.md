# 浏览器兼容性修复记录

## 1. ts-morph → 基于 regex 的 TS 解析器

**变更：** 移除 `ts-morph`，用纯正则手写解析器替代（`src/parse/analyzers/typescript.ts`）。

**原因：** `ts-morph` 依赖 Node.js 专属 API（`perf_hooks`、`fs` 等）。Vite 会将这些模块标记为 browser externalized，但运行时模块静默失败——`parseProject` 的 Promise 永远不会 resolve，应用卡在 "Loading specs" 页面，且无任何可见错误。

**结果：** 应用正常加载。正则解析器覆盖了 interface（含 extends/jsDoc）、type alias、enum、import，满足 spec-lens 的使用场景。代价是丧失完整语义分析（如类型推导、跨文件引用），但本项目不需要这些能力。

---

## 2. gray-matter → js-yaml 解析 frontmatter

**变更：** 移除 `gray-matter`，改用 `js-yaml` + 简单正则拆分 `---` 分隔符（`src/parse/frontmatter.ts`）。

**原因：** `gray-matter` 内部使用 `eval` 实现引擎系统，Vite 会对此发出安全警告，且在浏览器 CSP 策略下可能直接报错。`js-yaml` 已经是项目依赖，能安全处理 YAML 解析。

**结果：** Frontmatter 解析行为完全一致，同时减少了一个浏览器端依赖包。

---

## 经验

新增解析器/分析器时，务必确认该库能在浏览器中运行——避免依赖 Node.js 内置模块（`fs`、`path`、`perf_hooks`、`child_process` 等）。优先选择浏览器原生或同构（isomorphic）库。
