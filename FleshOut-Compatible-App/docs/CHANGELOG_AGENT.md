# Agent Changelog

用途：历史操作日志，仅追溯，不作为当前事实依据。当前事实请读 `docs/CURRENT_FACTS.md`。

## 2026-06-18 工作台编辑项目配置弹窗

### 修改内容

- 调整 `src/main.tsx`：
  - 工作台项目详情点击 `编辑` 不再打开单字段名称弹窗，改为 `ProjectConfigModal`。
  - 新弹窗按原应用结构分为 `基础设置`、`AI 模型`、`提示词策略`。
  - 基础设置展示项目名称、创建后不可修改的处理模式、并发处理数和加料字数。
  - AI 模型页展示当前模型，并通过下拉框列出已接入模型。
  - 提示词策略页复用模板解析逻辑，可切换查看 `系统破甲`、`场景识别`、`改写规则`。
  - 前端 `updateProject` 入参扩展为项目配置字段。
- 调整 `server/index.js`：
  - 自建 sidecar 项目保存 `model_id`、`template_id`、`prompt_strategy`、`user_requirement`、`concurrency`、`expand_word_count`。
  - 原 FleshOut 项目仍只保存显示名 override，不写原 `fleshout.db`。
- 调整 `src/styles.css`：
  - 新增项目配置弹窗暗色布局、左侧页签、模型卡、提示词预览和底部保存条样式。
- 同步更新 `docs/CURRENT_FACTS.md`、`docs/TASK_STATUS.md`、`docs/DEVELOPMENT_NOTES.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- Playwright + 系统 Chrome 临时端口 5219 验证：
  - 临时 TXT 项目点击 `编辑` 后出现 `项目配置` 弹窗。
  - `基础设置`、`AI 模型`、`提示词策略` 三个侧栏页签可切换。
  - AI 模型下拉列出 3 个已接入模型。
  - 提示词模板下拉列出 6 个模板；`场景识别` 与 `改写规则` 均解析 14 条。
  - 保存后临时项目 `concurrency=4`、`expand_word_count=4500`。
  - 仅出现续写列表读取请求，未触发真实 AI 生成、模型测试或阶段运行接口。
  - 临时验证项目已删除，临时服务已停止。

### 遗留问题

- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 开发经验与前端修改经验沉淀

### 修改内容

- 新增 `docs/DEVELOPMENT_NOTES.md`，整理本轮对话和开发过程中的实操经验：
  - PowerShell 在 `[sxsy.org]` 路径下的 `-LiteralPath` 规则。
  - 常用开发、构建、安装、健康检查命令。
  - 原 `fleshout.db` 只读边界和真实 AI 调用限制。
  - 前端页面修改定位表。
  - AI 改写五阶段工作台经验。
  - 新建项目弹窗和 TXT 拆分流程经验。
  - 样式和响应式检查经验。
  - Playwright 使用系统 Chrome 的验证方式。
  - 临时 TXT 项目验证和清理方法。
  - Windows 打包安装和安装成功判断方法。
  - 常见命令坑和后续拆分建议。
- 更新 `AGENTS.md`，把 `docs/DEVELOPMENT_NOTES.md` 加入新 Agent 优先读取顺序。
- 更新 `docs/ARCHITECTURE_MAP.md`，补充开发手册职责和修改 rewrite / 安装器时的优先读取入口。
- 更新 `docs/QUALITY_GATES.md`，补充 UI 修改、Playwright 和 Setup 超时后的验证要求。
- 更新 `docs/TROUBLESHOOTING.md`，补充路径通配符、`$PID`、Playwright 浏览器、Setup 超时、原应用和兼容版进程混淆等问题。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `rg` 检索确认新文档和入口文档均可检索到 `DEVELOPMENT_NOTES`。
- `docs/TROUBLESHOOTING.md` 可检索到新增问题 12-16。
- 本次仅修改文档，未触发真实 AI 调用，未写原 `fleshout.db`。

## 2026-06-18 书籍拆分页变更重新打包安装

### 修改内容

- 运行 `npm run dist:win`，重新生成 `release/FleshOut-Compatible-Setup.exe`。
- 执行新安装包，更新 `%LOCALAPPDATA%\FleshOut-Compatible-App` 下的安装版文件。
- Setup 自动启动安装版桌面窗口。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- `npm run dist:win`：通过，安装包 `LastWriteTimeUtc=2026-06-18T07:30:44Z`，大小约 78 MB。
- 安装目录 `C:\Users\Admin\AppData\Local\FleshOut-Compatible-App\FleshOut-Compatible.exe` 更新时间为 `2026-06-18 15:32:14 +08:00`。
- 桌面窗口已打开，主窗口标题为 `FleshOut Compatible`。
- 安装版 Node 子进程监听随机端口 `127.0.0.1:49448`，`GET /api/health` 返回 `ok=true`。
- WebView2 子进程存在，命令行包含 `--webview-exe-name=FleshOut-Compatible.exe`。
- 桌面快捷方式和开始菜单快捷方式存在。
- 原 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db` 安装前后时间戳保持 `2026-06-18T06:02:58.8740945Z`。

### 备注

- 工具侧等待 Setup 进程时超时，但安装目录、桌面窗口、WebView2 子进程、Node 健康接口和快捷方式均已验证为安装成功。

## 2026-06-18 书籍拆分页对齐原应用

### 修改内容

- 调整 `src/main.tsx`：
  - AI 改写页进入后左侧应用导航在 `rewrite` 模块收缩为 64px 图标栏。
  - `RewritePage` 顶部只保留当前书名栏，不再显示项目选择器、模型提示和来源/工作区信息。
  - 第 1 步 `书籍拆分` 中间区域只显示书籍名称，不再显示书籍基本信息、文件信息、TXT 正文或额外状态文案。
  - 第 1 步右侧改为专用 `SplitStageSidePanel`，只显示 `书籍拆分` 进度条和开始/继续按钮，不再显示改写本章、查看原文、查看对比、批量改写等后续阶段动作。
- 调整 `src/styles.css`：
  - 收窄拆分页中间空态和右侧拆分面板样式。
  - 补齐 AI 改写页图标导航的收缩样式。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- Playwright + 系统 Chrome 验证：
  - 临时 TXT 项目进入 AI 改写第 1 步时，中间 `.split-stage-empty` 只包含 1 个 `STRONG` 书名，无图标和状态文案。
  - 右侧 `.split-only-side` 文本为 `书籍拆分 0 / 2 开始`，不显示书籍统计、总字数或改写动作按钮。
  - 页面不显示项目来源、源文件、运行目录、章节文件、文件大小等拆分页无关信息。
  - 左侧导航宽度为 64px，所有导航文字隐藏。
  - 验证截图和指标：`output/playwright/rewrite-split-stage-current.png`、`output/playwright/rewrite-split-stage-current-metrics.json`。
  - 临时验证项目已删除，临时端口 5201 已停止。

### 遗留问题

- 本次未触发真实 AI 调用。
- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 项目详情隐藏运行目录

### 修改内容

- 调整 `src/main.tsx`：
  - 移除 `WorkbenchPage` 书籍详情页下方的 `<WorkspacePanel project={selectedProject} />`。
  - 保留工作台阶段页里的 `WorkspacePanel`，便于后续检查 output/ 等运行产物。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- `rg` 确认 `WorkspacePanel` 仅剩阶段页调用，详情页不再调用。

### 遗留问题

- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 提示词策略页交互对齐

### 修改内容

- 调整 `src/main.tsx`：
  - 新建项目导入向导第 5 步 `提示词策略` 改为可点击切换 `系统破甲`、`场景识别`、`改写规则`。
  - `系统破甲` 使用可编辑 textarea。
  - `场景识别` 解析 `identify_template.categories`，支持展开/收起场景详情，并编辑 ID、场景名称、触发条件和识别提示词。
  - `改写规则` 解析 `rewrite_template.commonPrompt` 与 `categoryPrompts`，支持编辑通用指导和场景特定规则。
  - 提示词修改后，创建项目时随导入请求提交三段模板覆盖内容。
- 调整 `server/index.js`：
  - `createSidecarTxtProject()` 支持 `templateOverrides`。
  - 当覆盖内容与原模板不同，导入 TXT 项目时在 sidecar `prompt_templates` 克隆项目专属模板，并把项目 `template_id` 指向副本。
  - 原 FleshOut 数据库仍只读，不写入原库模板。
- 调整 `src/styles.css`：
  - 为导入向导内提示词编辑区补齐暗色标签、折叠规则、双栏改写规则和 textarea 样式。
  - 修正导入向导弹窗高度，底部 `下一步` 固定留在弹窗可视区域，中间内容独立滚动。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- Playwright + Chrome 1450x860 验证：
  - `场景识别` 标签可点击，显示 14 条规则，首条可展开，字段可编辑。
  - `改写规则` 标签可点击，显示 14 条场景规则，通用指导编辑器可编辑。
  - `系统破甲` 标签可点击，textarea 可编辑。
  - 底部 `下一步` 保持可见，footer 位于弹窗内，背景滚动保持锁定。
  - 产物：`output/playwright/import-wizard-prompt-strategy.png`、`import-wizard-prompt-identify.png`、`import-wizard-prompt-rewrite.png` 以及对应 metrics JSON。
- 临时端口 5199 API 验证：
  - 覆盖三段提示词后创建临时 TXT 项目，返回项目 `template_id` 为新 sidecar 模板副本。
  - sidecar 副本的 `breakthrough_template`、`identify_template`、`rewrite_template` 与覆盖内容一致。
  - 验证后已删除临时项目和临时模板副本。

### 遗留问题

- 本次未触发真实 AI 调用。
- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 模型配置页处理参数对齐

### 修改内容

- 调整 `src/main.tsx`：
  - 新建项目导入向导第 4 步 `模型配置` 下方新增处理参数区域。
  - 处理模式只显示 `自动模式`，不显示半自动/手动模式。
  - 新增 `并发处理数` 滑条，范围 `1-30`，默认 `3`。
  - 新增 `加料字数` 输入，范围 `1000-20000`，默认沿用当前 `4000`。
  - 确认创建页显示自动模式、并发处理数和加料字数。
- 调整 `server/index.js`：
  - 新建 TXT 项目保存 `default_mode='auto'`、用户设置的 `concurrency` 和 `expand_word_count`。
  - 阶段 2/3/4 增加 `runWithConcurrency()` 并发执行池，按项目并发数处理章节。
- 调整 `src/styles.css`：
  - 补齐自动模式卡片、并发滑条和带单位字数输入框的暗色样式。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- Playwright + Chrome 1400x900 验证：
  - 第 4 步标题为 `模型配置`。
  - 只显示 `自动模式`，不显示 `半自动模式` / `手动模式`。
  - 并发处理数默认 `3`，范围 `1-30`，可调到 `7`。
  - 加料字数默认 `4000`，范围 `1000-20000`，可调到 `6000`。
  - 产物：`output/playwright/import-wizard-model-config.png` 和 `output/playwright/import-wizard-model-config-metrics.json`。
- 临时端口 5198 API 验证：创建临时 TXT 项目时返回 `default_mode=auto`、`concurrency=7`、`expand_word_count=6000`，验证后已删除临时项目。

### 遗留问题

- 本次未触发真实 AI 调用。
- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 文档治理与低上下文接手优化

### 修改内容

- 新增 `AGENTS.md` 作为 Codex / Agent 入口规则。
- 新增 `docs/CURRENT_FACTS.md`，建立当前事实最高可信入口。
- 新增 `docs/TASK_STATUS.md`，记录当前验证、UI 优化进展、待验证项和遗留问题。
- 新增 `docs/ARCHITECTURE_MAP.md`，沉淀文件职责和优先读取路径。
- 新增 `docs/QUALITY_GATES.md`，沉淀代码、安装器、UI、文档门禁。
- 新增 `docs/TROUBLESHOOTING.md`，沉淀常见问题与处理规则。
- 新增 `docs/ARCHIVE/README.md`，保留后续归档入口。
- 标记旧 `AGENT_MEMORY.md` 和 `README_FIRST_VERSION.md` 为历史记录 / 部分过时。

### 验证结果

- 已读取任务要求指定的 `AGENT_MEMORY.md`、`README_FIRST_VERSION.md`、`package.json`、`src/main.tsx`、`src/styles.css`、`scripts/build-iexpress.ps1`、`server/index.js`。
- 已复核安装目录、桌面快捷方式、安装版 sidecar DB、原 `fleshout.db` 文件属性。
- 本次未修改业务代码，未触发真实 AI 调用。
- `node --check server/index.js` 已执行通过。
- `npm run build` 已执行通过，Vite 构建成功。
- `npm run dist:win` 本次不执行，因为未修改安装器脚本。

### 遗留问题

- RewritePage 响应式布局仍需实测与修复。
- `server/index.js` 默认原库路径仍硬编码到当前用户。
- `scripts/build-iexpress.ps1` 名称与实际 C# Setup 流程不完全一致。
- `src/main.tsx` 和 `src/styles.css` 仍偏大，后续可分阶段拆分。

### 下一步建议

1. 做 RewritePage 响应式修复并补 Playwright 视觉回归。
2. 做原 FleshOut DB 路径首次启动配置。
3. 分阶段拆分前端页面、状态和样式文件。

## 2026-06-18 RewritePage 响应式修复与 WebView2 窗口参数对齐

### 修改内容

- 调整 `src/styles.css`：
  - 取消 `body min-width: 1080px`。
  - `RewritePage` 在 `max-width: 1500px` 下切为两栏，并将右侧统计区下移。
  - `RewritePage` 在 `max-width: 1180px` 下切为单列。
  - `.metrics-grid` 与 `.side-stat-grid` 改为 `auto-fit + minmax`。
- 调整 `scripts/build-iexpress.ps1`：
  - WebView2 默认窗口改为 `1400x900`。
  - 最小窗口改为 `1280x800`。
  - 显式设置 `webView.ZoomFactor = 1.0`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- `npm run dist:win`：通过，重新生成 `release/FleshOut-Compatible-Setup.exe`。
- Playwright CLI + Chrome channel 复核：
  - 1366x768：无横向滚动，两栏，右侧统计下移，主内容宽度 808px。
  - 1400x900：无横向滚动，两栏，右侧统计下移，主内容宽度 842px。
  - 1920x1080：无横向滚动，保持三栏。
- 验收产物：
  - `output/playwright/rewrite-responsive-metrics.json`
  - `output/playwright/rewrite-responsive-1366x768.png`
  - `output/playwright/rewrite-responsive-1400x900.png`
  - `output/playwright/rewrite-responsive-1920x1080.png`
- 原 `fleshout.db` 修改时间保持 `2026-06-16T09:54:00.7274080Z`。

### 遗留问题

- 本次未重新运行最新 Setup 并人工双击桌面快捷方式验收安装后行为。
- `server/index.js` 默认原库路径仍硬编码到当前用户。
- `src/main.tsx` 和 `src/styles.css` 仍偏大，后续可分阶段拆分。

### 下一步建议

1. 重新安装最新 Setup 并做桌面快捷方式验收。
2. 做原 FleshOut DB 路径首次启动配置。
3. 分阶段拆分前端页面、状态和样式文件。

## 2026-06-18 安装版验收补齐与原库路径配置化

### 修改内容

- 重新运行最新 `release/FleshOut-Compatible-Setup.exe`，补齐安装后桌面行为验收。
- 新增服务端本地配置能力：
  - `config.json` 保存 `originalDbPath`。
  - 原库路径解析顺序为 `config.json`、`FLESHOUT_DB`、默认路径。
  - 新增 `GET/PUT /api/settings`。
  - 原库继续通过 `readonly: true` 和 `fileMustExist: true` 打开。
- 更新设置页，支持查看和保存原 FleshOut `fleshout.db` 路径。
- 更新 `src/styles.css`，补充设置页路径表单和信息区响应式样式。
- 同步更新 `docs/CURRENT_FACTS.md`、`docs/TASK_STATUS.md`、`docs/ARCHITECTURE_MAP.md`、`docs/QUALITY_GATES.md`、`docs/TROUBLESHOOTING.md`。

### 验证结果

- 最新 Setup 退出码 0。
- 安装目录 `%LOCALAPPDATA%\FleshOut-Compatible-App`、桌面快捷方式、开始菜单快捷方式、sidecar DB 均存在。
- `FleshOut-Compatible.exe` 主窗口标题为 `FleshOut Compatible`。
- WebView2 子进程以 `--webview-exe-name=FleshOut-Compatible.exe` 运行。
- Node 子进程监听随机 `127.0.0.1:57409`。
- 未发现 Chrome / Edge 外部浏览器窗口暴露 FleshOut、localhost 或 127.0.0.1。
- 原 `fleshout.db` 修改时间保持 `2026-06-16T09:54:00.7274080Z`。
- `node --check server/index.js`：通过。
- `npm run build`：通过。
- `npm run dist:win`：通过，重新生成包含配置化能力的安装包。
- 重新安装后，安装版 `GET /api/settings` 返回配置路径 `%LOCALAPPDATA%\FleshOut-Compatible-App\config.json`，当前随机端口为 `127.0.0.1:53767`。
- 桌面快捷方式启动验证通过，窗口标题 `FleshOut Compatible`，快捷方式启动端口为 `127.0.0.1:56184`。
- `GET/PUT /api/settings` 临时端口验证通过：保存存在路径后来源为 `config`，无效路径返回 400。

### 遗留问题

- Computer Use 插件初始化失败，报 `@oai/sky` exports 子路径错误；本次改用进程、窗口句柄和端口层面验收。
- `src/main.tsx` 和 `src/styles.css` 仍偏大，后续可分阶段拆分。

### 下一步建议

1. 在 WebView2 窗口内可视验收设置页。
2. 开始分阶段拆分前端页面和样式文件。
3. 后续如修改安装器脚本，可考虑把 `scripts/build-iexpress.ps1` 改名为 `build-setup.ps1` 并同步 `package.json`。

## 2026-06-18 旧源码路径自建项目删除失败修复

### 修改内容

- 修复 `deleteSidecarProject()` 的安全路径判断：允许当前运行目录、`process.cwd()` 和路径中 `FleshOut-Compatible-App` 标记对应的 `data/user-projects\<id>`。
- 保留删除保护：仍拒绝删除 `data/user-projects` 根目录本身或任意外部路径。
- 工作台中原 FleshOut 项目不再渲染真正的删除按钮；删除按钮只对自建 sidecar 项目显示。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- 使用安装版 sidecar DB 验证删除旧源码路径项目 `fc2aa4ee-53fa-45e6-a88a-51a64b2b293c` 成功。
- 删除后项目目录不存在，项目列表中不再返回该项目。
- 原 `fleshout.db` 修改时间保持 `2026-06-16T09:54:00.7274080Z`。
- `npm run dist:win`：通过，重新生成 `release/FleshOut-Compatible-Setup.exe`。

### 遗留问题

- 已删除 `Codex自建测试小说` 这个旧测试项目；这是本次验证对象。
- 后续仍建议把删除确认文案区分为“删除当前安装版项目”和“删除旧源码目录项目”。

## 2026-06-18 原 FleshOut 页面风格 UI 重设计

### 修改内容

- 调整 `src/main.tsx`：
  - 左侧导航中 `工作台` 改为 `我的项目`，保留项目列表入口。
  - `RewritePage` 改为原应用式五阶段工作台：书籍拆分、内容总结、识别待处理、AI改写、合并输出。
  - 新增 `PipelineStageShell` 的 `footer` 支持和 `StageActionBar`，每个阶段底部显示进度与 `开始/继续`。
  - 修正右侧阶段统计中 `继续下一步` 的点击逻辑，完成阶段时切换到下一阶段，而不是再次执行当前阶段。
  - AI改写阶段保留单章 `重新改写`、`查看原文`、`查看对比`、标记保留、失败重试和批量改写入口。
- 调整 `src/styles.css`：
  - 全局界面切换为贴近原应用截图的暗色桌面工具风格。
  - 左侧导航收为 64px 图标栏，并为图标按钮保留 `title` / `aria-label`。
  - 工作台保持左章节导航、中间阶段内容、右侧阶段统计三栏；顶部阶段线和阶段底部操作条视觉对齐原应用。
  - 补齐项目入口、阶段卡片、提示词规则预览、单章改写区域和工作区目录的暗色样式。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- Playwright + Chrome channel 复核：
  - 1366x768：64px 左图标栏，三栏工作台，无横向滚动。
  - 1400x900：64px 左图标栏，三栏工作台，无横向滚动。
  - 1920x1080：三栏工作台，无横向滚动。
- 验收产物：
  - `output/playwright/ui-redesign-final3-metrics.json`
  - `output/playwright/ui-redesign-projects-final3-1400x900.png`
  - `output/playwright/ui-redesign-ai-rewrite-final-1366x768.png`
  - `output/playwright/ui-redesign-ai-rewrite-final-1400x900.png`
  - `output/playwright/ui-redesign-ai-rewrite-final-1920x1080.png`

### 遗留问题

- 本次没有运行 `npm run dist:win`，因为未修改安装器脚本。
- 本次没有触发真实 AI 调用；所有 AI 执行动作仍需 UI 确认或接口 `confirmAiCall: true`。
## 2026-06-18 移除项目筛选模块并开放原项目工作流操作

### 修改内容

- 调整 `src/main.tsx`：
  - 移除项目入口中 `全部 / 最近更新 / 原 FleshOut / 自建项目` 分段筛选模块。
  - 项目入口保留搜索框、项目列表和项目详情。
  - 原 FleshOut 项目不再禁用五阶段工作台操作、单章改写、标记保留和批量处理按钮。
  - 原 FleshOut 项目允许编辑本应用内显示名；删除按钮仍只对自建 sidecar 项目显示。
- 调整 `server/index.js`：
  - 新增 `project_workflow_overrides`，用于记录原项目在本应用内的显示名和工作流阶段状态。
  - 原 FleshOut 项目首次读取或执行工作流时，将章节元信息同步到 sidecar 的 `chapters`、`chapter_stage_status`、`chapter_rewrite_reasons`。
  - 五阶段工作流改为可作用于原项目和自建项目；新增状态写 sidecar 或 `.fleshout-workspace`，不写原 `fleshout.db`。
  - 阶段 1 改为复用现有章节文件前缀匹配；找不到章节文件时才从源书 TXT 拆分补齐到 `.fleshout-workspace/chapters`。
- 调整 `src/styles.css`：
  - 清理项目入口分段筛选控件的专用样式。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- 临时端口 `5197` 验证：
  - `GET /api/health` 返回原库 `readonly: true`。
  - 原项目 `9503b307-e74a-4331-bea1-7003df22cd16` 详情返回 25 章和 sidecar 阶段统计。
  - `POST /api/projects/:id/stages/1/run`：25 章完成、0 失败。
  - 原 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db` 修改时间保持 `2026-06-16T09:54:00.7274080Z`。
- 测试中临时写入的原项目显示名覆盖已清除，项目名恢复为原应用名称。

### 遗留问题

- 本次没有触发真实 AI 调用；AI 总结、识别、改写仍需要界面确认后才会调用模型。
- 本次未重新打包安装器；当前修改已通过源码构建，安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 五阶段工作台顺序门禁

### 修改内容

- 调整 `src/main.tsx`：
  - 新增阶段可访问性判断，顶部五阶段步骤卡按前置步骤完成情况逐步解锁。
  - 未解锁步骤显示锁定态且不可点击，当前阶段会被自动限制在已解锁范围内。
  - 单章改写、批量改写、失败重试、标记保留和右侧阶段操作按钮同步遵守阶段门禁。
- 调整 `src/styles.css`：
  - 为锁定步骤补充不可点击和弱化显示样式。
- 调整 `server/index.js`：
  - 新上传 TXT 项目的阶段 1 初始为 `pending`，需要在工作台完成“书籍拆分”后才解锁“内容总结”。
  - 新增 `assertWorkflowStageAccessible()`，在阶段运行、单章改写和标记保留接口前校验前置步骤是否完成。
  - 直接绕过 UI 调用未解锁阶段时返回 `WORKFLOW_STAGE_LOCKED` 和中文提示。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- `npx tsc --noEmit`：未通过，原因为项目未安装 React 类型声明（`@types/react` / `@types/react-dom`），属于既有项目配置问题；实际 Vite 构建已通过。
- 临时端口 `5197` API 验证：
  - 新建临时 TXT 项目后，阶段 1 初始为 pending。
  - 未完成阶段 1 时直接执行阶段 2 返回 `WORKFLOW_STAGE_LOCKED`。
  - 完成阶段 1 后，阶段 3 / 阶段 4 仍因阶段 2 未完成返回 `WORKFLOW_STAGE_LOCKED`。
  - 完成阶段 1 后执行阶段 2 不再被门禁锁定，而是进入原有 `AI_CALL_CONFIRMATION_REQUIRED` 保护。
  - 两个临时测试项目均已通过删除接口清理。
- 原 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db` 修改时间保持不变。

### 遗留问题

- 本次未触发真实 AI 调用。
- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 内容总结页对齐原应用章节审阅

### 修改内容

- 调整 `server/index.js`：
  - 原 FleshOut 项目读取章节时带出原库 `summary`。
  - 同步原项目到 sidecar 时回填章节总结，并同步 `chapter_rewrite_reasons`。
  - 阶段状态允许 `completed` 覆盖 `pending`，避免原应用已有结果在本应用里被降级。
- 调整 `src/main.tsx`：
  - 第 2 步“内容总结”完成后渲染章节审阅工作台，而不是只显示完成进度页。
  - 左侧章节导航展示字数和 `需改写` / `无需改写` / `已总结` 标识。
  - 点击章节后中间展示情节概要、登场人物、关键事件。
  - 需改写章节下方展示 `场景识别标记`，并把同一场景的提示词识别条件与改写规则合并展示。
  - 支持解析总结 JSON 的 `summary`、`overview`、`plot`、`characters`、`events`、`keyEvents` 等字段，避免把 JSON 原文直接显示成概要。
  - 标题显示使用 `formatChapterHeading()`，避免出现“第2章 第2章 ...”。
- 调整 `src/styles.css`：
  - 新增内容总结审阅页、概要卡片、人物/事件列表和场景规则卡片样式。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- 本次未触发真实 AI 调用。

### 遗留问题

- 本次只更新源码开发版；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 书籍拆分与内容总结启动页收敛

### 修改内容

- 调整 `src/main.tsx`：
  - 第 1 步“书籍拆分”和第 2 步“内容总结”改为原应用式启动流程。
  - 两步的中间区域只显示当前步骤状态和进度，不再提前展示章节表、总结列表或后续功能页面。
  - 第 1/2 步右侧只保留当前阶段开始/继续按钮；后续改写相关统计和操作按钮从这两步隐藏。
  - 新增 `StageStartPanel` 作为前两步的简化状态面板。
- 调整 `src/styles.css`：
  - 新增 `stage-start-panel` 相关样式，保持暗色工作台风格。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。

### 遗留问题

- 本次未触发真实 AI 调用。
- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 TXT 拆分预览与弹窗滚动修复

### 修改内容

- 调整 `src/main.tsx`：
  - `TXT 拆分` 页点击 `预览` 后只刷新章节预览结果，不再自动跳转到“预览信息”。
  - 底部主按钮在 `TXT 拆分` 页保持 `下一步`，预览完成后点击才进入下一页。
  - 章节预览表右侧改为显示标题命中行号。
  - `Modal` 打开时锁定 `body` 滚动，关闭时恢复，避免鼠标滚轮带动上级工作台页面。
- 调整 `server/index.js`：
  - `splitTxtIntoChapters()` 记录章节标题命中的行号。
  - `previewTxtProject()` 返回完整章节预览列表和 `lineNumber`。
- 调整 `src/styles.css`：
  - 章节预览表增加内部滚动区域，行号列右对齐。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- Playwright 1400x900 验证：
  - 点击 `预览` 后标题仍为 `TXT 拆分`。
  - 底部按钮为 `下一步`。
  - 章节表显示 `L1/L5/L9` 行号，不再显示字数列。
  - 弹窗打开时 `bodyOverflow=hidden`，wheel 前后 `window.scrollY` 不变。

### 遗留问题

- 本次未触发真实 AI 调用。
- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 新建项目上传第一步对齐原应用

### 修改内容

- 调整 `src/main.tsx`：
  - 新建项目导入向导第 1 步上传 TXT 后显示文件名卡片和项目名称确认。
  - 第 1 步不再渲染 TXT 正文输入框，正文只保存在状态中供后续 TXT 拆分预览和创建项目使用。
  - 上传新文件时项目名称自动更新为文件名，右下角 `下一步` 进入第 2 步 `TXT 拆分`。
- 调整 `src/styles.css`：
  - 新增上传后文件名卡片、文件类型标记和第一步上传区域样式。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- Playwright 1400x900 验证：
  - 打开新建项目向导后，未上传时 `下一步` 禁用。
  - 上传 `output/playwright/import-wizard-sample.txt` 后，文件名和项目名显示。
  - TXT 正文未显示在页面文本中。
  - `下一步` 可点击，点击后进入 `TXT 拆分`，底部主按钮为 `预览`。
- 原 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db` 修改时间保持 `2026-06-16T09:54:00.7274080Z`。

### 遗留问题

- 本次未触发真实 AI 调用。
- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。

## 2026-06-18 新建项目导入向导左侧颜色修正

### 修改内容

- 调整 `src/styles.css`：
  - 将新建项目导入向导左侧当前步骤改为暗色选中态，保留绿色圆点作为高亮。
  - 为已完成步骤补充导入向导作用域内的暗色样式，避免被通用 wizard 浅色样式影响。
  - 补齐当前步骤和已完成步骤的小字颜色，保持弹窗左侧黑灰区域视觉一致。
- 同步更新 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。

### 验证结果

- `node --check server/index.js`：通过。
- `npm run build`：通过。
- 原 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db` 修改时间保持 `2026-06-16T09:54:00.7274080Z`。

### 遗留问题

- 本次只修改前端样式，未触发真实 AI 调用。
- 本次未重新打包安装器；安装版需后续运行 `npm run dist:win` 后才包含此变更。
