# FleshOut 项目结构沉淀

生成时间：2026-06-17

本文只整理当前已逆向/已观察到的文件、运行数据和工作区结构，不修改程序文件。

## 1. 已验证事实

### 1.1 安装包与程序形态

- 安装包文件：`2-AI小说加料软件FleshOut_0.2.0_x64-setup.exe`
- 安装包类型：NSIS
- 解包目录：`_unpacked/FleshOut_0.2.0_x64_setup`
- 解包目录中可见 `fleshout.exe`、`uninstall.exe`、`$PLUGINSDIR` 等 NSIS 相关文件。
- 当前运行程序：`E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\FleshOut\fleshout.exe`
- 当前运行程序文件存在，大小约 26.9 MB，最后修改时间为 2026-01-29。

### 1.2 Tauri 单文件程序

- `reverse_summary.md` 已记录主程序为 Tauri 单文件 Windows 程序。
- 静态字符串和资源索引中可见 Tauri 权限、窗口、WebView、文件系统、shell、path、dialog 等插件能力。
- 未发现公开源码目录；当前材料主要来自 exe 静态字符串、内置资源路径、运行时数据库和工作区观察。

### 1.3 已生成逆向资料

当前 `_reverse_analysis` 目录下已有资料：

- `assets.txt`：内置前端资源路径清单。
- `tauri_commands_found.txt`：已发现 Tauri 命令清单，共 66 个。
- `sql_strings.txt`：从程序中提取到的 SQL 字符串。
- `urls.txt`：从程序中提取到的 URL/疑似 URL 字符串。
- `manual_semiauto_hits.txt`：手动模式、半自动模式相关命中。
- `reverse_summary.md`：静态逆向摘要。
- `fleshout.backup.db`：运行时数据库备份，大小 471040 字节。
- `fleshout.snapshot.db`：运行时数据库快照，大小 454656 字节。
- `snippet_*.txt`：围绕关键字符串截取出的二进制文本片段。

### 1.4 前端资源路径

`assets.txt` 中发现 28 个内置前端资源路径，核心资源包括：

- `/assets/index-BJCd8mTr.js`
- `/assets/index-BgQ00rP4.js`
- `/assets/index-tAdUFASl.css`
- `/assets/Wizard-DMWAeO_F.js`
- `/assets/pipeline-CB9O-Iho.js`
- `/assets/PromptManagement-D12WuRb_.js`
- `/assets/ModelManagement-CGJkAAxC.js`
- `/assets/ProjectList-R3GfWTol.js`
- `/assets/ProjectEditDialog-HBPVTwhR.js`
- `/assets/PromptRewriteEditor-DSPe_4lF.js`

### 1.5 运行时数据位置

- 数据库：`C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db`
- 日志：`C:\Users\Admin\AppData\Local\com.fleshout.app\logs\FleshOut.log`
- 两个文件均已在本机确认存在。

### 1.6 当前项目与工作区

数据库备份中当前只有 1 个项目：

- 项目 ID：`9b95a7a7-0ab7-4cc7-be16-69bcf403cd18`
- 输入格式：`txt`
- `current_stage`：4
- `status`：`pending`
- `default_mode`：`auto`
- `concurrency`：3
- `expand_word_count`：4000
- 章节数：52
- 总字数：193013

项目输入文件与输出根目录：

- `book_path`：`E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\更新xs合集@温华\202605\0504\开局一座破庙，信徒全靠全靠骗炮_1-48正文.txt`
- `output_path`：`E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\更新xs合集@温华\202605\0504`

当前工作目录：

```text
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\更新xs合集@温华\202605\0504\.fleshout-workspace
```

目录结构：

```text
.fleshout-workspace/
  chapters/     原始拆分章节，当前 52 个文件
  output/       已改写章节，当前 5 个文件
  ai-inputs/    AI 输入调试文件，当前 1 个文件
  _context/     上下文目录，当前 0 个文件
```

## 2. 数据库结构概览

`fleshout.backup.db` 中已验证存在以下表：

- `projects`
- `chapters`
- `book_metadata`
- `chapter_stage_status`
- `chapter_rewrite_reasons`
- `project_errors`
- `chapter_errors`
- `ai_models`
- `app_config`
- `prompt_templates`
- `project_custom_prompts`
- `conversations`
- `messages`
- `txt_split_rules`

关键字段摘录：

- `projects`：项目路径、输出路径、模型、当前阶段、状态、默认模式、并发、扩写字数等。
- `chapters`：项目 ID、章节序号、标题、原始 href、字数、摘要、是否需要改写等。
- `chapter_stage_status`：每章每阶段的状态、忽略标记、错误信息。
- `prompt_templates`：总结、改写、识别、破甲提示词模板。
- `conversations` / `messages`：手动对话与消息历史。

## 3. 推断

- 前端资源是 Tauri/Rust 静态嵌入资源，不是普通 asar 或 zip 目录。
- 程序内部已有较完整的“项目 - 章节 - 阶段 - 提示词 - 会话”状态模型。
- `conversations` / `messages` 与手动命令共同说明应用设计上预留了交互式 AI 对话能力。
- `.fleshout-workspace/_context` 当前为空，但从命名和命令 `get_chapter_context` 看，适合承载跨章节摘要、人物设定、续写上下文等派生材料。

## 4. 文档维护建议

- 若后续能拿到源码，应在本文补充真实源码目录结构，例如 `src-tauri`、前端路由、Rust command 模块。
- 若后续能直接调用 Tauri 命令，应把命令参数和返回结构补到 `FUNCTION_MAP.md`。
- 若后续新增 AI 续写功能，应优先追加新的运行时目录与表结构到 `RUNTIME_DATA_MAP.md`，避免只在计划文档中描述。
