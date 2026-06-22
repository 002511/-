# FleshOut 运行时数据地图

生成时间：2026-06-17

本文描述 FleshOut 当前运行时数据、数据库、日志、工作区目录，以及这些数据之间的关系。

## 1. 已验证事实

### 1.1 应用级运行数据

数据库位置：

```text
C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db
```

日志位置：

```text
C:\Users\Admin\AppData\Local\com.fleshout.app\logs\FleshOut.log
```

已验证：

- `fleshout.db` 存在，大小 471040 字节，最后修改时间 2026-06-16 17:54。
- `FleshOut.log` 存在，大小 82963 字节，最后修改时间 2026-06-16 17:53。
- `_reverse_analysis/fleshout.backup.db` 与当前运行库大小一致，适合作为当前分析基准。

### 1.2 应用配置

`app_config` 当前记录数：5。

已验证配置键：

- `db_version`：当前为 `3`
- `output_settings`：输出目录、命名方式、自定义后缀等 JSON 配置
- `ui_settings`：主题、语言等 JSON 配置
- `ai_settings`：默认模型 ID 等 JSON 配置
- `window_state`：窗口位置和尺寸 JSON 配置

注意：

- `app_config.ai_settings` 中的默认模型 ID 与当前 `ai_models` 表里的部分记录可能不一致。该现象需要运行程序内再确认，可能来自旧配置、删除模型或备份时点差异。

### 1.3 当前项目记录

`projects` 当前记录数：1。

核心字段：

| 字段 | 当前值 |
| --- | --- |
| `id` | `9b95a7a7-0ab7-4cc7-be16-69bcf403cd18` |
| `source_format` | `txt` |
| `status` | `pending` |
| `current_stage` | `4` |
| `default_mode` | `auto` |
| `concurrency` | `3` |
| `expand_word_count` | `4000` |
| `created_at` | `2026-06-16 16:55:35` |
| `updated_at` | `2026-06-16 17:43:07` |

输入输出路径：

- `book_path`：原 TXT 文件。
- `output_path`：原 TXT 所在父目录。

### 1.4 书籍元数据

`book_metadata` 当前记录数：1。

核心字段：

- `total_chapters`：52
- `total_words`：193013
- `file_size`：625652
- `author`：空
- `description`：空

### 1.5 章节数据

`chapters` 当前记录数：52。

字段含义：

- `id`：章节 ID。
- `project_id`：所属项目 ID。
- `index`：章节序号，从 1 开始。
- `title`：章节标题。
- `original_href`：原始章节引用，如 `chapter1.txt`。
- `word_count`：章节字数。
- `summary`：阶段 2 产生的章节摘要，当前为 JSON 风格文本。
- `needs_rewrite`：是否需要改写，0/1。

当前聚合：

- 章节总数：52
- 章节总字数：193013
- `needs_rewrite = 1` 的章节数：34

### 1.6 阶段状态

`chapter_stage_status` 当前记录数：260。

每章 5 个阶段，共 52 章，所以 260 条记录和章节数吻合。

阶段统计：

| 阶段 | 状态 | 数量 |
| --- | --- | ---: |
| 1 | completed | 52 |
| 2 | completed | 52 |
| 3 | completed | 52 |
| 4 | completed | 5 |
| 4 | pending | 47 |
| 5 | pending | 52 |

### 1.7 改写原因

`chapter_rewrite_reasons` 当前记录数：34。

已验证：

- 改写原因数量与 `chapters.needs_rewrite = 1` 数量一致。
- `type` 字段中存在 `cat_new_01`、`cat_1772426227957` 等分类 ID。

### 1.8 模型配置

`ai_models` 当前记录数：2。

已验证字段：

- `name`
- `provider`
- `api_key`
- `base_url`
- `model`
- `temperature`
- `max_tokens`
- `timeout`

当前 provider 均为 `custom`，base URL 为 OpenAI 兼容接口风格。

### 1.9 提示词模板

`prompt_templates` 当前记录数：3。

当前模板名：

- `加料模板_全面增强版`
- `FleshOut_全面增强版`
- `加料模板1.0`

字段：

- `summary_template`
- `rewrite_template`
- `breakthrough_template`
- `identify_template`

### 1.10 手动对话数据

`conversations` 当前记录数：0。

`messages` 当前记录数：0。

表结构已验证存在：

- `conversations`：`id`、`project_id`、`name`、`created_at`、`updated_at`
- `messages`：`id`、`conversation_id`、`role`、`content`、`chapter_id`、`timestamp`、`tool_calls`

### 1.11 工作区目录

当前工作区：

```text
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\更新xs合集@温华\202605\0504\.fleshout-workspace
```

已验证目录统计：

| 目录 | 文件数 | 字节数 | 作用 |
| --- | ---: | ---: | --- |
| `chapters/` | 52 | 622398 | 原始拆分章节 |
| `output/` | 5 | 121685 | 已改写章节 |
| `ai-inputs/` | 1 | 20704 | AI 输入调试文件 |
| `_context/` | 0 | 0 | 上下文目录，当前为空 |

## 2. 数据流关系

### 2.1 自动流水线

已验证数据流：

```text
原始 TXT
  -> parse / split
  -> .fleshout-workspace/chapters/
  -> chapters 表
  -> stage 1 completed
  -> AI 总结
  -> chapters.summary
  -> stage 2 completed
  -> AI 识别
  -> chapters.needs_rewrite + chapter_rewrite_reasons
  -> stage 3 completed
  -> AI 改写
  -> .fleshout-workspace/output/
  -> stage 4 completed
  -> 合并输出
  -> stage 5 completed
```

### 2.2 手动流式写入

静态字符串显示 `send_manual_message_stream` 会：

```text
项目 + 当前章节 + 模型配置
  -> 读取工作区章节内容
  -> 创建 ManualAgent
  -> 流式调用 AI
  -> 实时写入 output/
  -> 保存手动改写内容
  -> 更新 chapters.needs_rewrite
```

该流程来自字符串证据，尚未通过实际命令调用验证参数和返回结构。

## 3. 推断

### 3.1 工作区路径推断

项目 `output_path` 指向原书父目录，工作区实际位于：

```text
{output_path}\.fleshout-workspace
```

该推断与当前项目实际目录一致。

### 3.2 文件命名推断

- `chapters/` 使用带序号和章节标题的 `.txt` 文件名。
- `output/` 使用类似同名章节 `.txt` 文件保存改写结果。
- `ai-inputs/` 使用 `chapter_序号_标题.md` 保存某次 AI 输入调试内容。

具体命名规则应以后端源码或更多样本为准。

### 3.3 `_context/` 用途推断

`_context/` 当前为空，但结合 `get_chapter_context` 命令，推断用途可能包括：

- 保存章节上下文窗口。
- 保存全书摘要、人物设定、世界观设定。
- 保存手动对话或续写所需的派生上下文。

## 4. 新功能落地时的数据原则

- 不直接覆盖 `chapters/` 原始拆分章节。
- 不把续写结果混入 `output/`，除非用户明确选择“作为改写结果导出”。
- 续写应有独立文件目录和数据库状态，避免和自动改写流水线阶段混淆。
- 导出时再把“原文/改写结果/续写章节”按策略合并。
