# Memory Engine Plan

本文档记录从 QMAI 项目中可吸收的长篇小说记忆引擎设计，并给出 FleshOut-Compatible-App 第一版可落地方案。

## 已验证事实

### QMAI 的核心记忆闭环

- QMAI 是面向长篇小说的记忆型 AI 写作桌面系统。
- QMAI 的记忆系统不是单一提示词，而是由章节摄取、结构化快照、上下文包、检索、重排、图谱和审查共同组成。
- QMAI 源码中存在实际实现：
  - `src/lib/novel/chapter-ingest.ts`
  - `src/lib/novel/context-engine.ts`
  - `src/lib/novel/context-data-sources.ts`
  - `src/lib/novel/memory-rebuild.ts`
  - `src/lib/search.ts`
  - `src/lib/rerank.ts`
  - `src/lib/wiki-graph.ts`
- QMAI 的章节摄取会从正式章节中提取结构化快照，字段包括：
  - 章节摘要
  - 出场人物
  - 地点
  - 组织
  - 物品
  - 关键事件
  - 人物状态变化
  - 人物关系变化
  - 角色认知变化
  - 伏笔变化
  - 新增正史设定
  - 时间线事件
  - 冲突变化
  - 章节结尾钩子
  - 图谱节点和关系边
- QMAI 的上下文包按优先级组装写作前信息，主要包括：
  - 当前任务
  - 当前章节目标
  - 项目灵魂
  - 大纲要求
  - 禁止违背
  - 最近剧情摘要
  - 上一章结尾
  - 当前人物状态
  - 角色灵魂
  - 当前伏笔状态
  - 时间线
  - 角色认知状态
  - 相关地点/组织/物品
  - 相关记忆检索
  - 修改反馈
  - 下一章推进建议
  - 写作风格
- QMAI 区分草稿和正式章节。草稿不会进入正式记忆库，正式章节才参与后续上下文、快照、图谱和记忆检索。
- QMAI 支持 token 预算裁剪，避免上下文无限膨胀。
- QMAI 支持 embedding 和 rerank，但这些能力不是第一版必须项。

## 对当前项目的已验证事实

- 当前项目是 `FleshOut-Compatible-App`，技术栈为 React + TypeScript + Vite + Node API + better-sqlite3。
- 当前程序读取原 FleshOut 数据库为只读。
- 当前写入数据保存在 sidecar 数据库：
  - `FleshOut-Compatible-App/data/continuations.db`
- 当前工作区复用 FleshOut 目录：
  - `.fleshout-workspace/chapters/`
  - `.fleshout-workspace/output/`
  - `.fleshout-workspace/ai-inputs/`
  - `.fleshout-workspace/_context/`
  - `.fleshout-workspace/continuations/`
  - `.fleshout-workspace/exports/`
- 当前已经有 AI 续写的三个后端能力：
  - 全书上下文分析
  - 续写大纲生成
  - 单章续写生成

## 推断

- QMAI 的 Wiki 文件架构不适合直接整体搬入当前项目，因为当前项目已经围绕 FleshOut 的 SQLite 和 `.fleshout-workspace` 建立兼容层。
- 最适合吸收的是 QMAI 的记忆分层思想，而不是完整 UI、完整 Tauri 架构或完整 Wiki 系统。
- 第一版应先做轻量记忆引擎：
  - 用 sidecar 表存结构化快照和聚合记忆。
  - 用 `_context/memory/` 存 JSON 和 Markdown 调试文件。
  - 用关键词和章节顺序组装上下文。
  - 暂不做 embedding/rerank/图谱可视化。

## 第一版目标

第一版目标是让 AI 续写不再只依赖“全书分析 + 当前章正文”，而是具备可复用的长篇小说记忆包。

第一版新增能力：

1. 章节记忆提取
   - 从原章节或改写章节提取结构化快照。
   - 支持单章提取。
   - 支持按项目批量提取的后续扩展。

2. 记忆聚合
   - 汇总人物状态。
   - 汇总角色认知。
   - 汇总伏笔状态。
   - 汇总时间线。
   - 汇总正史设定。

3. 续写上下文包
   - 按 QMAI 风格组装：
     - 当前任务
     - 用户续写需求
     - 最近章节摘要
     - 上一章结尾
     - 人物状态
     - 伏笔状态
     - 时间线
     - 正史设定
     - 原全书上下文分析
     - 原续写大纲

4. 草稿隔离
   - AI 续写生成后仍然是草稿。
   - 用户点击保存后才写入 `continuations/` 和 sidecar。
   - 后续可增加“确认为正式续写并摄取记忆”。

## 第一版目录设计

在 `.fleshout-workspace/_context/` 下新增：

```text
_context/
  continuation_project_context.json
  continuation_outline.json
  memory/
    context_pack_latest.md
    aggregate_memory.json
    chapter_snapshots/
      001.snapshot.json
      001.snapshot.md
```

说明：

- `chapter_snapshots/` 保存单章提取结果。
- `aggregate_memory.json` 保存聚合记忆。
- `context_pack_latest.md` 保存最近一次续写前组装的上下文包，方便调试提示词。

## 第一版 sidecar 表设计

新增 `chapter_memory_snapshots`：

```sql
CREATE TABLE IF NOT EXISTS chapter_memory_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  source_mode TEXT NOT NULL DEFAULT 'original',
  summary TEXT,
  characters_json TEXT,
  locations_json TEXT,
  organizations_json TEXT,
  items_json TEXT,
  events_json TEXT,
  character_state_changes_json TEXT,
  relationship_changes_json TEXT,
  knowledge_changes_json TEXT,
  foreshadowing_changes_json TEXT,
  canon_facts_json TEXT,
  timeline_events_json TEXT,
  conflicts_json TEXT,
  ending_hook TEXT,
  raw_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  UNIQUE(project_id, chapter_id, source_mode)
);
```

新增 `memory_context_packs`：

```sql
CREATE TABLE IF NOT EXISTS memory_context_packs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  base_chapter_id TEXT,
  source_mode TEXT NOT NULL DEFAULT 'original',
  user_requirement TEXT,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

## 第一版 API 设计

新增接口：

```text
POST /api/projects/:id/memory/ingest-chapter
GET  /api/projects/:id/memory/snapshots
GET  /api/projects/:id/memory/context-pack
POST /api/projects/:id/memory/context-pack
```

第一版 `ingest-chapter` 输入：

```json
{
  "chapterId": "...",
  "modelId": "...",
  "sourceMode": "original"
}
```

第一版 `context-pack` 输入：

```json
{
  "baseChapterId": "...",
  "sourceMode": "original",
  "userRequirement": "...",
  "targetWordCount": 4000
}
```

## AI 续写接入方式

`continuation-generate` 应改为：

1. 读取基准章节正文。
2. 读取 `_context/continuation_project_context.json`。
3. 读取 `_context/continuation_outline.json`。
4. 调用记忆上下文包构建函数。
5. 将记忆上下文包放在章节正文前。
6. 生成正文。
7. AI 输入仍写入 `ai-inputs/` 方便调试。

## 后续增强

- 批量提取 52 章记忆。
- 正式续写章节保存后自动摄取。
- 记忆中心 UI。
- 人物状态手动编辑。
- 伏笔追踪手动标记新增/推进/回收。
- 时间线视图。
- embedding 检索。
- rerank 重排。
- 图谱可视化。
- 续写前一致性审查。

