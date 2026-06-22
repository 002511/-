# FleshOut 0.2.0 静态逆向解析摘要

## 文件

- 主程序: `_unpacked/FleshOut_0.2.0_x64_setup/fleshout.exe`
- 类型: Tauri 单文件 Windows 程序
- 安装包: NSIS，解包得到 `fleshout.exe`、`uninstall.exe`、`$PLUGINSDIR` 插件

## 前端资源

已发现内置前端资源路径 28 个，见 `assets.txt`。核心资源包括：

- `/assets/index-BJCd8mTr.js`
- `/assets/index-BgQ00rP4.js`
- `/assets/index-tAdUFASl.css`
- `/assets/Wizard-DMWAeO_F.js`
- `/assets/pipeline-CB9O-Iho.js`
- `/assets/PromptManagement-D12WuRb_.js`
- `/assets/ModelManagement-CGJkAAxC.js`

资源路径可见，但未直接还原成独立文件。当前判断更像 Rust/Tauri 静态嵌入资源，而非普通 asar/zip 目录。

## Tauri 命令

已发现 66 个命令，见 `tauri_commands_found.txt`。和开发中功能相关的关键命令：

- `create_manual_project`
- `get_manual_project_info`
- `list_manual_chapters`
- `get_book_chapter_content`
- `get_chapter_context`
- `create_conversation`
- `list_conversations`
- `load_conversation_history`
- `send_manual_message`
- `send_manual_message_stream`
- `save_manual_content`
- `restore_chapter_original`
- `export_manual_project`
- `start_pipeline`
- `resume_pipeline`
- `get_pipeline_status`
- `cancel_pipeline`
- `regenerate_summary`
- `regenerate_rewrite`

## 手动模式判断

后端不是空的。字符串中存在：

- `src\commands\manual.rs`
- `src\services\manual\agent.rs`
- `.fleshout-workspace`
- `NO_REWRITTEN_CONTENT 没有手动改写内容，无法导出`
- `[Command] send_manual_message_stream 开始`
- `[Command] 内容已实时写入文件`
- `已保存手动改写内容，共  字`
- `[Command] 更新章节 needs_rewrite 字段为 1`
- `[Command] send_manual_message_stream 完成`

推断：手动模式的 Rust 后端能力已实现较多，前端可能被禁用或未接完整流程。

## 半自动模式判断

字符串中存在：

- `semi-auto`
- `阶段  完成，等待用户确认`
- `从阶段  开始执行`
- `ExtractSummarizeIdentifyRewriteMerge`
- `start_pipeline`
- `resume_pipeline`
- `get_pipeline_status`
- `cancel_pipeline`

推断：半自动更像已有流水线支持“阶段完成后等待确认”，但前端未开放/未完成选择流程。

## 数据库结构

已发现表和索引 SQL，见 `sql_strings.txt`。核心表包括：

- `ai_models`
- `app_config`
- `projects`
- `chapters`
- `chapter_stage_status`
- `chapter_rewrite_reasons`
- `prompt_templates`
- `project_custom_prompts`
- `conversations`
- `messages`

这说明应用内部有项目、章节、阶段状态、提示词、会话历史等完整状态模型。

## API/模型

发现：

- OpenAI 兼容接口模型列表: `https://api.openai.com/v1/models`
- Ollama 默认地址: `http://localhost:11434`
- 认证头: `Authorization: Bearer ...`
- 支持 provider: `ollama`, `custom`，并可能支持 OpenAI 兼容配置

## 对补全功能的意义

如果有源码，补全两个“开发中”功能可行性较高，因为后端命令和数据库结构已经存在。

只有 exe 时，不建议直接二进制补丁。更可行的实验方向是：

1. 尝试打开 Tauri devtools 或从前端调用已存在命令，验证命令参数。
2. 找到应用数据库和 `.fleshout-workspace` 目录，观察实际项目创建后的文件结构。
3. 如果能提取/还原前端 JS，再判断是否只是按钮 disabled 或路由隐藏。
4. 最稳仍是寻找源码目录，包含 `src-tauri`, `Cargo.toml`, `package.json`, `vite.config.*` 的项目。
