# FleshOut 功能地图

生成时间：2026-06-17

本文将当前可见功能、数据库支撑表、Tauri 命令和推断中的隐藏能力分层整理。所有“已验证事实”来自当前逆向文件、数据库备份和工作区观察；“推断”单独标注。

## 1. 已验证事实

### 1.1 当前主流程

当前应用围绕小说改写流水线运行，已确认流水线阶段为：

1. 书籍拆分
2. 内容总结
3. 识别待处理
4. AI 改写
5. 合并输出

当前项目状态：

- 阶段 1：52 章 completed
- 阶段 2：52 章 completed
- 阶段 3：52 章 completed
- 阶段 4：5 章 completed，47 章 pending
- 阶段 5：52 章 pending

### 1.2 工作台/项目管理

已发现相关命令：

- `list_projects`
- `get_project`
- `create_project`
- `update_project`
- `delete_project`
- `open_path`
- `show_in_folder`

数据库支撑：

- `projects`
- `book_metadata`
- `chapters`
- `chapter_stage_status`
- `project_errors`
- `chapter_errors`

已验证能力：

- 数据库中保存项目名、原书路径、输出路径、输入格式、模型 ID、当前阶段、运行状态、并发、扩写字数等信息。
- `book_metadata` 保存标题、作者、章节数、总字数、文件大小等元数据。

### 1.3 新建项目向导/导入与拆分

已发现相关命令：

- `parse_book`
- `parse_project_book`
- `preview_txt_chapters`
- `get_txt_split_rules`
- `save_txt_split_rules`
- `get_book_metadata`
- `get_book_chapters`
- `get_book_chapter_content`
- `get_book_cover`

数据库支撑：

- `txt_split_rules`
- `book_metadata`
- `chapters`

已验证能力：

- 当前项目 `source_format` 为 `txt`。
- 工作区 `chapters/` 中已生成 52 个拆分章节文件。
- `chapters.original_href` 保存类似 `chapter1.txt` 的原始章节引用。

### 1.4 模型管理

已发现相关命令：

- `list_ai_models`
- `create_ai_model`
- `update_ai_model`
- `delete_ai_model`
- `set_default_ai_model`
- `test_ai_connection`
- `ai_chat_with_model`

数据库支撑：

- `ai_models`
- `app_config`

已验证能力：

- 当前库中有 2 个模型配置。
- 支持 `custom` provider。
- 模型配置字段包括 `api_key`、`base_url`、`model`、`temperature`、`max_tokens`、`timeout`。
- 字符串中发现 OpenAI 兼容接口模型列表地址 `https://api.openai.com/v1/models`。
- 字符串中发现 Ollama 默认地址 `http://localhost:11434`。
- `app_config` 中存在 `ai_settings`，用于保存默认模型 ID。

### 1.5 提示词管理

已发现相关命令：

- `list_prompt_templates`
- `get_prompt_template`
- `create_prompt_template`
- `update_prompt_template`
- `delete_prompt_template`
- `import_prompt_template`
- `export_prompt_template`

数据库支撑：

- `prompt_templates`
- `project_custom_prompts`

已验证能力：

- 当前库中有 3 个提示词模板。
- 模板字段包括：
  - `summary_template`
  - `rewrite_template`
  - `breakthrough_template`
  - `identify_template`
- `projects.custom_prompts_id` 可关联项目自定义提示词。

### 1.6 流水线控制

已发现相关命令：

- `start_pipeline`
- `resume_pipeline`
- `get_pipeline_status`
- `cancel_pipeline`
- `goto_stage`
- `cleanup_current_stage`
- `cleanup_after_stage`
- `start_rewrite_stage`
- `regenerate_summary`
- `regenerate_rewrite`
- `export_chapter_summary`
- `save_rewritten_content`
- `update_chapter`
- `update_chapter_stage_status`
- `get_chapter`
- `get_chapter_original_content`
- `get_chapter_stage_status`
- `get_chapters_by_stage`
- `list_chapters`

数据库支撑：

- `chapters`
- `chapter_stage_status`
- `chapter_rewrite_reasons`
- `project_errors`
- `chapter_errors`

已验证能力：

- 每章有 1 到 5 阶段状态记录，当前 52 章共 260 条阶段记录。
- `chapter_rewrite_reasons` 当前有 34 条记录，说明阶段 3 已产生待改写原因。
- `chapters.needs_rewrite` 当前求和为 34，和待改写原因数量一致。

### 1.7 手动/对话能力

已发现相关命令：

- `create_manual_project`
- `get_manual_project_info`
- `list_manual_chapters`
- `get_chapter_context`
- `create_conversation`
- `list_conversations`
- `load_conversation_history`
- `delete_conversation`
- `send_manual_message`
- `send_manual_message_stream`
- `save_manual_content`
- `restore_chapter_original`
- `export_manual_project`

数据库支撑：

- `conversations`
- `messages`
- `chapters`

静态字符串证据：

- `src\commands\manual.rs`
- `src\services\manual\agent.rs`
- `.fleshout-workspace`
- `[Command] send_manual_message_stream 开始`
- `[Command] workspace_path:`
- `[Command] 读取当前章节内容`
- `[Command] 创建 ManualAgent`
- `[Command] 内容已实时写入文件`
- `已保存手动改写内容，共  字`
- `[Command] 更新章节 needs_rewrite 字段为 1`
- `NO_REWRITTEN_CONTENT 没有手动改写内容，无法导出`

已验证能力：

- 数据库 schema 中存在会话和消息表，但当前库中 `conversations` 与 `messages` 均为 0 条。
- 手动流式命令会读取当前章节、创建 ManualAgent、流式调用 AI，并把内容实时写入文件。

## 2. 推断

### 2.1 半自动模式

字符串中存在：

- `semi-auto`
- `阶段  完成，等待用户确认`
- `从阶段  开始执行`
- `ExtractSummarizeIdentifyRewriteMerge`

推断：

- 后端流水线可能支持阶段完成后等待用户确认。
- 当前前端可能没有完整开放半自动入口，或入口处于隐藏/未完成状态。

### 2.2 手动模式

从命令和字符串看，手动模式后端能力不是空壳。

推断：

- `create_manual_project` 可能绕过自动流水线，直接建立可人工选择章节、和 AI 对话、保存结果、导出的项目。
- `send_manual_message_stream` 更接近“章节级交互式改写/续写”的可复用基础。
- `save_manual_content` 与 `export_manual_project` 可作为未来“AI 续写”保存和导出的参照。

### 2.3 前端缺口

推断：

- 当前新增功能优先难点不一定在 AI 客户端，而在前端入口、状态管理和导出语义。
- 如果无法修改原 exe，新增功能应先以外部辅助工具或源码级重建方式验证设计。

## 3. AI 续写可复用能力

可直接复用的现有能力：

- 项目与章节索引：`projects`、`chapters`
- 模型配置：`ai_models`、`app_config.ai_settings`
- 提示词管理框架：`prompt_templates` / `project_custom_prompts`
- 工作区目录：`chapters/`、`output/`、`ai-inputs/`、`_context/`
- 对话历史模型：`conversations`、`messages`
- 手动流式调用思路：`send_manual_message_stream`
- 导出思路：`export_manual_project`

建议新增而不是强行复用的能力：

- 新增续写章节表，用于把“原文章节”和“续写章节”分开。
- 新增 `continuations/` 文件目录，用于存放 AI 续写结果。
- 新增续写专用提示词字段或独立表，避免污染现有“总结/识别/改写”模板。
