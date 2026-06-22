# FleshOut-Compatible-App Agent Memory

> 历史记录 / 部分过时：2026-06-18 起，新 Agent 请优先读取 `AGENTS.md`、`docs/CURRENT_FACTS.md`、`docs/TASK_STATUS.md`、`docs/ARCHITECTURE_MAP.md`、`docs/QUALITY_GATES.md`、`docs/TROUBLESHOOTING.md`。
> 本文仍可用于追溯早期 Web 原型和记忆引擎设计，但其中“先保持 Web 原型、后续 Tauri 打包”和“单章 AI 改写未完整实现”的结论已废弃。当前安装版事实以 `docs/CURRENT_FACTS.md` 为准。

更新时间：2026-06-17

本文档用于新开 Codex 对话窗口时快速接手当前项目。请优先读取本文档，再读取 `README_FIRST_VERSION.md`、`server/index.js`、`src/main.tsx`。

## 项目定位

本项目是在没有 FleshOut 原始源码的前提下，基于已逆向出来的 FleshOut 数据结构和功能形态，重新做出的第一版可运行 Web 原型。

目标不是修改原 `fleshout.exe`，而是做一个自己的应用：

- 保留原 FleshOut 的“AI改写”项目/章节/流水线概念。
- 新增“AI续写”能力。
- 引入轻量记忆引擎，借鉴 QMAI 的章节快照、上下文包、草稿确认后入记忆等优点。
- 第一版先 Web 可运行，后续再考虑 Tauri 打包。

## 关键路径

仓库/资料根目录：

```text
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件
```

当前应用目录：

```text
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App
```

逆向资料目录：

```text
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\_reverse_analysis
```

原 FleshOut 运行数据库，只读：

```text
C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db
```

本应用 sidecar 数据库，可写：

```text
FleshOut-Compatible-App\data\continuations.db
```

原 FleshOut 当前项目工作区：

```text
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\更新xs合集@温华\202605\0504\.fleshout-workspace
```

自建项目工作区：

```text
FleshOut-Compatible-App\data\user-projects\<project-id>\.fleshout-workspace
```

注意：路径中有 `[sxsy.org]`，PowerShell 必须优先使用 `Set-Location -LiteralPath` 或命令里使用绝对路径。不要用普通通配路径。

## 启动与检查

启动：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
npm run dev
```

访问：

```text
http://127.0.0.1:5178
```

构建：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
npm run build
```

后端语法检查：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
node --check "$app\server\index.js"
```

## 技术栈

- 前端：React 18 + TypeScript + Vite。
- 后端：Node HTTP server + Vite middleware。
- 数据库：`better-sqlite3`。
- 桌面：暂未接 Tauri，第一版保持 Web 原型。
- 启动端口：默认 `5178`。

## 当前左侧模块

`src/main.tsx` 中的导航模块：

- 小说改写
- 小说续写
- 记忆中心
- 模型管理
- 提示词管理

## 数据边界

已确认并必须保持：

- 不修改 `fleshout.exe`。
- 不写入原 FleshOut 数据库。
- 原数据库通过 `new Database(defaultDbPath, { readonly: true, fileMustExist: true })` 只读打开。
- 新增模型、提示词、自建项目、续写、记忆快照都写入 sidecar DB 或项目工作区文件。

## Sidecar 表

`server/index.js` 的 `ensureSidecarDb()` 会创建/迁移这些表：

- `continuation_chapters`
- `ai_models`
- `prompt_templates`
- `app_config`
- `projects`
- `chapters`
- `chapter_memory_snapshots`
- `memory_context_packs`

最近一次用 Node + better-sqlite3 读取到的 sidecar 计数：

- `ai_models`: 1
- `prompt_templates`: 1
- `projects`: 1
- `chapters`: 2
- `continuation_chapters`: 1
- `chapter_memory_snapshots`: 0
- `memory_context_packs`: 3

说明：这个计数只是 2026-06-17 当前快照，后续使用模型/导入项目后会变化。

## 已实现能力

### 项目与章节

- 读取原 FleshOut 项目。
- 读取原 FleshOut 章节。
- 读取自建 sidecar 项目。
- 支持粘贴 TXT 创建自建项目。
- 自建项目会生成 `.fleshout-workspace/chapters/`。

### 小说续写

已具备第一版闭环：

- 选择基准章节。
- 分析全书上下文。
- 生成续写大纲。
- 提取单章记忆。
- 提取最近 N 章记忆。
- 生成记忆上下文包。
- AI 生成单章续写。
- 保存续写草稿到 `continuations/`。
- 审查续写草稿。
- 将已保存续写确认为正式章节。
- 正式确认后摄取续写章节记忆。
- 导出原文 + 续写章节到 `exports/`。

相关后端函数：

- `analyzeContinuationContext`
- `generateContinuationOutline`
- `extractChapterMemorySnapshot`
- `ingestRecentChapterMemory`
- `buildMemoryContextPack`
- `generateContinuationContent`
- `reviewContinuationContent`
- `saveContinuation`
- `confirmContinuationOfficial`
- `exportProjectWithContinuations`

### 记忆中心

轻量 QMAI 风格记忆已经有雏形：

- `chapter_memory_snapshots` 存章节快照。
- `memory_context_packs` 存续写前上下文包。
- `_context/memory/context_pack_latest.md` 存最近一次上下文包。
- `_context/memory/aggregate_memory.json` 存聚合记忆。
- `_context/memory/chapter_snapshots/` 存章节快照文件。

快照字段包括：

- 摘要
- 人物
- 地点
- 组织
- 物品
- 事件
- 人物状态变化
- 关系变化
- 角色认知变化
- 伏笔变化
- 正史事实
- 时间线事件
- 冲突
- 结尾钩子

### 模型管理

- 读取原 FleshOut 模型。
- 新增 sidecar 模型。
- 编辑/删除 sidecar 模型。
- 设置默认模型。
- 测试模型连接。
- Ollama 有默认处理：provider 为 `ollama` 时，默认 Base URL 为 `http://localhost:11434`，API Key 可用占位值。

### 提示词管理

- 读取原 FleshOut 提示词模板。
- 导入 sidecar 提示词模板。
- 编辑/删除 sidecar 提示词模板。
- 模板字段包括原改写字段：
  - `summary_template`
  - `rewrite_template`
  - `breakthrough_template`
  - `identify_template`
- 以及续写字段：
  - `continuation_context_template`
  - `continuation_outline_template`
  - `continuation_generate_template`
  - `continuation_review_template`

## 当前未完成/待补齐

最重要缺口：

- `小说改写` 页面目前主要是项目导入、章节查看、阶段状态和工作区统计。
- 还没有完整实现“单章 AI 改写”按钮、后端 `/rewrite-chapter` 接口、输出到 `output/` 的闭环。

建议下一步优先做：

1. 增加后端接口 `POST /api/projects/:id/rewrite-chapter`。
2. 入参：`modelId`, `chapterId`, `templateId`, `userRequirement`, `sourceMode`。
3. 读取章节正文。
4. 使用 `breakthrough_template` 作为系统/破甲提示，`rewrite_template` 作为改写规则。
5. 调模型生成改写文本。
6. 写入 `.fleshout-workspace/output/NNN_标题.txt`。
7. 写入 `ai-inputs/rewrite_chapter_NNN_timestamp.md`。
8. 对 sidecar 自建项目更新 `chapters.rewrite_status='completed'`；原 FleshOut 项目不要写原 DB。
9. 前端 `RewritePage` 增加章节选择、原文预览、要求输入、模型选择、提示词选择、生成结果区。

其他后续增强：

- 文件选择器导入 TXT，而不是只粘贴。
- 自定义拆章规则。
- Tauri 打包。
- 连续多章续写。
- 更完整的 QMAI 风格图谱/伏笔债务/角色认知视图。
- 续写草稿人工编辑后的重新审查与版本比较。

## QMAI 分析结论

已分析 `Mochocyang/QMAI`，它的核心优势是：

- 写前构建上下文包。
- 写后章节摄取。
- 结构化章节快照。
- 人物状态、角色认知、伏笔、时间线、正史事实分层记忆。
- 草稿与正式章节分离，正式确认后才入记忆。
- 审查系统防止人设、时间线、伏笔、设定崩坏。

我们项目已吸收的部分：

- 章节快照。
- 聚合记忆。
- 续写前上下文包。
- 草稿保存。
- 确认正式后才摄取记忆。
- 续写审查。

暂未做的部分：

- 图谱可视化。
- BM25/向量/图谱混合检索。
- 伏笔债务评分。
- 角色认知专门 UI。
- 多阶段深度章节生成。

## 重要文档

逆向/规划文档：

- `_reverse_analysis/PROJECT_STRUCTURE.md`
- `_reverse_analysis/FUNCTION_MAP.md`
- `_reverse_analysis/RUNTIME_DATA_MAP.md`
- `_reverse_analysis/AI_CONTINUATION_PLAN.md`
- `_reverse_analysis/MEMORY_ENGINE_PLAN.md`

应用说明：

- `FleshOut-Compatible-App/README_FIRST_VERSION.md`
- `FleshOut-Compatible-App/AGENT_MEMORY.md`

## 接手建议

新对话接手时按这个顺序：

1. 读本文档。
2. 读 `README_FIRST_VERSION.md`。
3. 跑 `node --check server/index.js`。
4. 跑 `npm run build`。
5. 如继续开发第一版，优先补齐“单章 AI 改写”。
6. 开发时继续保持原 FleshOut DB 只读，所有新增状态写 sidecar DB 或 `.fleshout-workspace` 文件。
