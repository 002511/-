# AI 续写功能最小可行方案

生成时间：2026-06-17

目标：在不直接修改现有程序文件的前提下，基于已逆向结构设计一个可落地的 AI 续写功能。第一版只做“单章续写”，后续再扩展为连续续写。

## 1. 设计边界

### 1.1 第一版范围

第一版只支持：

- 从某个已有章节之后生成 1 个续写章节。
- 用户选择项目、基准章节、模型、续写提示词。
- 读取原章节、前后文摘要和已有改写结果作为上下文。
- 流式生成续写内容。
- 保存续写结果到独立目录和数据库表。
- 导出“原文 + 续写章节”为 TXT。

第一版暂不做：

- 多章连续自动续写。
- 与现有 5 阶段流水线混跑。
- 自动重排原有章节序号。
- 自动写回原始 `chapters/`。
- 覆盖现有 `output/` 改写结果。

### 1.2 内容边界

续写功能应作为通用文本创作能力设计。提示词模板只描述剧情、人物、风格、节奏、承接关系和安全边界，不在系统模板中写死任何特定成人内容或特定题材要求。

## 2. 已验证事实

可复用基础：

- 当前应用已有项目、章节、阶段状态、提示词、模型、对话历史等数据库模型。
- 当前工作区已有 `chapters/`、`output/`、`ai-inputs/`、`_context/` 四类目录。
- 当前存在 `conversations` / `messages` 表。
- 当前存在 `send_manual_message_stream` 命令，静态字符串显示它会读取章节、创建 ManualAgent、流式调用 AI、实时写入文件。
- 当前存在 `get_chapter_context` 命令。
- 当前存在 `export_manual_project` 命令。
- 当前模型配置支持 OpenAI 兼容 `custom` provider 和 Ollama 默认地址。

## 3. 总体入口设计

### 3.1 推荐入口

入口放在“项目详情/流水线页面”的章节列表中：

- 每个章节行增加“续写”操作。
- 只允许选择一个基准章节进入续写页。
- 若当前项目正在运行流水线，续写按钮置灰或提示先暂停/取消流水线。

理由：

- 续写天然依赖“从哪一章后面继续写”。
- 用户在章节列表中能看到章节标题、阶段状态、是否已有改写结果，最适合选择续写锚点。

### 3.2 辅助入口

可在项目卡片或项目详情顶部增加“AI 续写”入口：

- 默认选择最后一章作为基准章节。
- 进入后允许用户切换基准章节。

### 3.3 页面布局

建议第一版续写页包含：

- 左侧：章节列表/基准章节选择。
- 中间：原章节/改写章节预览。
- 右侧：续写设置与生成结果。

关键控件：

- 模型选择。
- 续写字数目标。
- 上下文范围：上一章、本章、摘要、改写版。
- 提示词模板选择。
- 生成、停止、保存、重新生成、导出。

## 4. 工作区复用方案

### 4.1 `chapters/`

用途：

- 只读读取原始拆分章节。
- 第一版以选中章节作为续写锚点。

禁止：

- 不把续写结果写入 `chapters/`。
- 不改动原有章节文件名和内容。

### 4.2 `output/`

用途：

- 如果基准章节已有改写结果，允许用户选择“用改写结果作为续写基准”。
- 导出时可选择使用原文版或改写版作为正文来源。

禁止：

- 第一版不把续写结果写入 `output/`，避免和阶段 4 产物混淆。

### 4.3 `ai-inputs/`

用途：

- 保存续写请求的调试输入。
- 建议命名：

```text
ai-inputs/continuation_{base_index}_{continuation_index}_{timestamp}.md
```

内容建议：

- 项目信息。
- 基准章节信息。
- 上下文范围。
- 系统提示词。
- 用户提示词。
- 实际发送给模型的 messages。

### 4.4 `_context/`

用途：

- 保存续写上下文缓存。
- 可存放从已有摘要中整理出的全书上下文、人物状态、伏笔、最近章节摘要。

建议第一版文件：

```text
_context/continuation_project_context.json
_context/continuation_chapter_{base_index}_context.json
```

第一版可以不强依赖 `_context/` 文件存在；若不存在，则实时从 `chapters.summary` 和相邻章节内容组装。

### 4.5 是否新增 `continuations/` 目录

建议新增。

路径：

```text
.fleshout-workspace/continuations/
```

建议文件命名：

```text
continuations/053_续写_基于第52章.txt
continuations/053_续写_基于第52章_v2.txt
```

理由：

- 续写是新章节，不是原章节，也不是原章节改写结果。
- 独立目录能避免误被现有合并输出逻辑读取。
- 方便后续连续续写扩展。

## 5. 数据库设计

### 5.1 是否新增 `continuation_chapters` 表

建议新增。

理由：

- `chapters` 表代表原书拆分章节，已有唯一索引 `(project_id, index)`，直接塞续写章节容易破坏原书语义。
- `chapter_stage_status` 是 5 阶段流水线状态，不适合表达续写草稿、生成中、已保存、已导出等状态。
- 续写需要保存基准章节、版本、提示词、模型、文件路径、导出状态等额外信息。

### 5.2 表结构草案

```sql
CREATE TABLE continuation_chapters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    base_chapter_id TEXT NOT NULL,
    continuation_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    word_count INTEGER DEFAULT 0,
    model_id TEXT,
    prompt_template_id TEXT,
    prompt_snapshot TEXT,
    context_snapshot TEXT,
    source_mode TEXT NOT NULL DEFAULT 'original',
    version INTEGER NOT NULL DEFAULT 1,
    exported INTEGER NOT NULL DEFAULT 0,
    error_info TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(base_chapter_id) REFERENCES chapters(id)
);

CREATE INDEX idx_continuation_project ON continuation_chapters(project_id);
CREATE INDEX idx_continuation_base_chapter ON continuation_chapters(base_chapter_id);
CREATE UNIQUE INDEX idx_continuation_project_index_version
    ON continuation_chapters(project_id, continuation_index, version);
```

### 5.3 状态枚举

第一版建议：

- `draft`：已创建但未生成。
- `generating`：生成中。
- `generated`：生成完成。
- `saved`：用户确认保存。
- `exported`：已导出。
- `failed`：生成失败。
- `cancelled`：用户取消。

### 5.4 和 `conversations/messages` 的关系

建议复用：

- 每次单章续写可创建一个 conversation。
- `messages.chapter_id` 仍保存基准原文章节 ID。
- 可在 `messages.tool_calls` 或 `continuation_chapters.context_snapshot` 里保存续写参数快照。

不建议第一版强依赖 conversation：

- 续写结果的主状态应在 `continuation_chapters`。
- conversation 更适合审计和二次追问，不适合做导出主索引。

## 6. 后端命令设计

第一版建议新增命令：

### 6.1 查询类

```text
list_continuations(projectId)
get_continuation(continuationId)
get_continuation_context(projectId, baseChapterId, options)
```

说明：

- `list_continuations`：列出某项目已生成/草稿续写章节。
- `get_continuation`：读取续写记录和文件内容。
- `get_continuation_context`：预览本次续写将使用的上下文，方便用户确认。

### 6.2 生成类

```text
create_continuation(projectId, baseChapterId, title, options)
generate_continuation_stream(continuationId, options)
cancel_continuation(continuationId)
regenerate_continuation(continuationId, options)
```

说明：

- `create_continuation`：创建数据库记录，分配 `continuation_index` 和文件路径。
- `generate_continuation_stream`：复用 ManualAgent/AI client 思路，流式写入 `continuations/`。
- `cancel_continuation`：停止生成并标记状态。
- `regenerate_continuation`：创建新版本或覆盖草稿，建议默认新版本。

### 6.3 保存/编辑类

```text
save_continuation_content(continuationId, content)
delete_continuation(continuationId)
rename_continuation(continuationId, title)
```

说明：

- 用户可手动编辑生成结果后保存。
- 删除时只删除续写记录和 `continuations/` 对应文件，不影响原章节。

### 6.4 导出类

```text
export_project_with_continuations(projectId, options)
export_continuation_only(continuationId, options)
```

说明：

- `export_project_with_continuations`：导出原文或改写正文，再追加选中的续写章节。
- `export_continuation_only`：只导出某个续写章节，便于单章审阅。

## 7. 提示词模板设计

### 7.1 是否改造现有 `prompt_templates`

第一版有两种方案。

方案 A：扩展 `prompt_templates`：

```sql
ALTER TABLE prompt_templates ADD COLUMN continuation_template TEXT;
```

优点：

- 和现有提示词管理界面一致。
- 模板导入导出可继续沿用。

缺点：

- 会改动现有表结构和模板导入导出逻辑。

方案 B：新增 `continuation_prompt_templates`：

```sql
CREATE TABLE continuation_prompt_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    system_template TEXT NOT NULL,
    user_template TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

优点：

- 不污染现有总结/识别/改写模板。
- 后续可单独做续写模板市场或版本。

缺点：

- 前端要新增管理入口。

第一版建议：

- 若做外部辅助工具，直接用独立 JSON 模板文件。
- 若做源码级改造，优先方案 A，快速复用现有提示词管理。
- 若后续续写成为长期功能，再迁移到方案 B。

### 7.2 模板变量

建议支持变量：

```text
{{book_title}}
{{base_chapter_title}}
{{base_chapter_index}}
{{base_chapter_content}}
{{base_rewritten_content}}
{{previous_chapter_summary}}
{{current_chapter_summary}}
{{project_context}}
{{user_instruction}}
{{target_word_count}}
{{style_notes}}
{{continuation_title}}
```

### 7.3 系统模板草案

```text
你是一个长篇小说续写助手。请严格承接已有剧情、人物关系、叙事视角、语言风格和节奏。

要求：
1. 不复述上下文，不输出分析过程。
2. 新章节必须从基准章节之后自然接续。
3. 保持人物动机、称呼、设定和时间线一致。
4. 避免突然引入无法解释的新设定。
5. 如果上下文不足，优先写保守承接内容，不自行推翻既有设定。
6. 遵守用户给定的内容边界和平台规则。
```

### 7.4 用户模板草案

```text
书名：{{book_title}}
续写标题：{{continuation_title}}
目标字数：{{target_word_count}}

上一阶段上下文：
{{project_context}}

基准章节标题：
{{base_chapter_title}}

基准章节内容：
{{base_chapter_content}}

本章摘要：
{{current_chapter_summary}}

用户补充要求：
{{user_instruction}}

请直接输出续写章节正文。
```

## 8. 导出方案

### 8.1 第一版导出目标

导出一个 TXT：

```text
原文第1章
原文第2章
...
原文第N章
续写第N+1章
```

如果用户选择“使用改写正文优先”：

```text
若 output/ 中存在该章改写结果，则使用 output/
否则回退到 chapters/
最后追加 continuations/
```

### 8.2 导出选项

第一版建议：

- `sourceMode = original`：只用 `chapters/` 原文。
- `sourceMode = rewritten_preferred`：优先 `output/`，缺失则回退 `chapters/`。
- `includeContinuationIds`：导出哪些续写章节。
- `separator`：章节之间空行格式。
- `fileName`：输出文件名。

### 8.3 输出文件位置

建议默认：

```text
{project.output_path}/{book_name}_with_continuation.txt
```

或：

```text
{project.output_path}/exports/{book_name}_with_continuation_{timestamp}.txt
```

更推荐第二种，因为不会污染原书目录根部，也方便多次导出。

## 9. 单章 MVP 执行流程

### 9.1 用户流程

1. 进入项目详情。
2. 在章节列表选择某一章，点击“续写”。
3. 页面展示基准章节、摘要、可用上下文。
4. 用户选择模型、目标字数、提示词模板，填写补充要求。
5. 点击“生成”。
6. 后端创建续写记录并流式写入 `continuations/`。
7. 用户审阅、编辑、保存。
8. 用户点击“导出原文 + 续写”。

### 9.2 后端流程

```text
create_continuation
  -> 校验 project/chapter/model
  -> 创建 .fleshout-workspace/continuations/
  -> 插入 continuation_chapters(status='draft')

generate_continuation_stream
  -> status='generating'
  -> 读取 chapters/ 基准章节
  -> 可选读取 output/ 改写章节
  -> 读取 chapters.summary 和 _context 缓存
  -> 组装 prompt
  -> 写入 ai-inputs/continuation_*.md
  -> 流式调用 AI
  -> 实时写入 continuations/*.txt
  -> status='generated'

save_continuation_content
  -> 覆盖 continuations/*.txt
  -> 更新 word_count/status/updated_at

export_project_with_continuations
  -> 按 sourceMode 读取 chapters/output
  -> 按 continuation_index 追加 continuations
  -> 写入 exports/*.txt
  -> 标记 exported=1
```

## 10. 后续连续续写扩展

第二阶段再做：

- 连续生成多章。
- 续写章节之间互相作为上下文。
- `base_chapter_id` 可指向原文章节，另加 `previous_continuation_id` 指向上一续写章节。
- 批量生成计划表，例如 `continuation_jobs`。
- 每章生成后自动更新 `_context/continuation_project_context.json`。

建议扩展字段：

```sql
ALTER TABLE continuation_chapters ADD COLUMN previous_continuation_id TEXT;
ALTER TABLE continuation_chapters ADD COLUMN outline TEXT;
```

可新增任务表：

```sql
CREATE TABLE continuation_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    start_chapter_id TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    options_json TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

## 11. 风险与验证清单

### 11.1 风险

- 原 exe 无源码，不建议直接二进制补丁。
- 现有 `send_manual_message_stream` 参数和返回结构未实际调用验证。
- 默认模型配置可能存在历史 ID 不一致问题。
- 续写如果混入 `chapters/` 或 `output/`，容易破坏现有流水线和导出逻辑。
- 连续续写容易积累设定偏差，必须等单章流程稳定后再做。

### 11.2 验证清单

第一轮只验证：

- 能从数据库找到项目、章节、模型。
- 能正确读取 `.fleshout-workspace/chapters/` 中的基准章节。
- 能创建 `continuations/` 并写入一个续写文件。
- 能保存一条 `continuation_chapters` 记录。
- 能导出原文 + 该续写文件。

第二轮再验证：

- 复用现有 AI client 是否可行。
- 流式生成中断和重试。
- 前端页面状态。
- 多版本续写。
- 与手动会话历史联动。

## 12. 推荐下一步

建议下一步先做“外部原型”，不动 `fleshout.exe`：

1. 复制 `fleshout.db` 为实验库。
2. 在实验库创建 `continuation_chapters` 表。
3. 在当前项目工作区手动创建 `continuations/` 和 `exports/`。
4. 写一个小脚本读取项目、章节、模型配置，生成一份 `ai-inputs/continuation_*.md`。
5. 先不接真实 AI，手工写入一段占位续写，验证保存和导出链路。
6. 链路通了以后，再接 OpenAI 兼容接口做单章流式生成。
