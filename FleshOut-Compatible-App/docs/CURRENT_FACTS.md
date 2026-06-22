# Current Facts

更新时间：2026-06-18 15:55:00 +08:00

用途：记录当前有效事实，是判断项目状态的最高可信入口。历史文档如果与本文件冲突，以本文件为准。

## 项目身份

| 事实 | 状态 | 验证方式 |
|---|---|---|
| 项目名称：`FleshOut-Compatible-App` | 有效 | 读取 `package.json` 与应用目录名 |
| 项目类型：人工智能小说 / FleshOut 兼容桌面应用 | 有效 | 读取 `src/main.tsx`、`server/index.js`、安装脚本 |
| 当前不是乡行项目 | 有效 | 任务文件明确声明 |
| 当前目标：Windows 安装版 + WebView2 桌面壳 | 有效 | 读取 `package.json` 的 `dist:win` 和 `scripts/build-iexpress.ps1` |

## 关键路径

| 路径 | 状态 | 验证方式 |
|---|---|---|
| 项目根目录：`E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件` | 有效 | 当前工作目录 |
| 应用目录：`E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App` | 有效 | 当前文件系统存在 |
| 原 FleshOut 数据库：`C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db` | 有效 | 本次文件系统复核存在，安装前后保持 `LastWriteTimeUtc=2026-06-18T06:02:58.8740945Z` |
| sidecar 数据库：`C:\Users\Admin\AppData\Local\FleshOut-Compatible-App\data\continuations.db` | 有效 | 本次文件系统复核存在 |
| 安装版配置文件：`C:\Users\Admin\AppData\Local\FleshOut-Compatible-App\config.json` | 有效 | `server/index.js` 默认使用应用根目录 `config.json`；安装版 root 是 `%LOCALAPPDATA%\FleshOut-Compatible-App` |
| 桌面快捷方式：`C:\Users\Admin\Desktop\FleshOut Compatible.lnk` | 有效 | 本次文件系统复核存在 |

## 当前有效事实

| 事实 | 状态 | 验证方式 |
|---|---|---|
| 当前安装版使用 C# WinForms + WebView2 壳。 | 有效 | `scripts/build-iexpress.ps1` 内联生成 `FleshOutCompatibleLauncher.cs`，引用 `Microsoft.Web.WebView2.WinForms` |
| `desktop/main.cjs` 当前未被安装版打包链使用。 | 有效 | `scripts/build-iexpress.ps1` 仅复制 `dist`、`server`、`runtime`、`node_modules`、`package.json` 和 `data/continuations.db` |
| 当前构建命令为 `node --check server/index.js`、`npm run build`、`npm run dist:win`。 | 有效 | 读取 `package.json` 与安装脚本 |
| 当前开发经验、前端页面修改、打包安装和常见命令坑已沉淀到 `docs/DEVELOPMENT_NOTES.md`。 | 有效 | 本次新增文档并同步 `AGENTS.md`、`ARCHITECTURE_MAP.md`、`QUALITY_GATES.md`、`TROUBLESHOOTING.md` |
| 当前安装器脚本是 `scripts/build-iexpress.ps1`。 | 有效 | `package.json` 的 `dist:win` 指向该脚本 |
| 虽然脚本名包含 `iexpress`，但当前实际逻辑是自定义 C# Setup 生成流程。 | 有效 | 脚本使用 `csc.exe` 编译 launcher、uninstaller、setup；不是 IExpress SED 主流程 |
| 当前安装目录是 `%LOCALAPPDATA%\FleshOut-Compatible-App`。 | 有效 | 安装脚本 `InstallFolderName` 和本次文件系统复核 |
| 当前安装版只携带 `data/continuations.db`。 | 有效 | 安装脚本只复制 sidecar DB 到打包源 |
| 当前安装版不打包 `data/user-projects`。 | 有效 | 安装脚本没有递归复制应用目录下的 `data/user-projects`；安装后会创建空 `data/user-projects` 目录 |
| 原 `fleshout.db` 必须只读，不应被修改。 | 有效 | `server/index.js` 使用 `new Database(getOriginalDbPathInfo().dbPath, { readonly: true, fileMustExist: true })` |
| 原 FleshOut 项目允许在本应用内执行工作流操作。 | 有效 | 2026-06-18 验证原项目 `9503b307-e74a-4331-bea1-7003df22cd16` 可读取详情、同步 sidecar 状态、执行阶段 1；原库时间戳在本次安装前后保持 `2026-06-18T06:02:58.8740945Z` |
| 原 FleshOut 项目的摘要、识别、改写、合并等新增状态写入 sidecar DB 或原项目 `.fleshout-workspace`，不写回原 `fleshout.db`。 | 有效 | `project_workflow_overrides`、sidecar `chapters` / `chapter_stage_status` / `chapter_rewrite_reasons` 承载本应用工作流状态 |
| 当前主要技术栈：React 18 + TypeScript + Vite + Node HTTP server + better-sqlite3 + C# WinForms WebView2 Launcher。 | 有效 | 读取 `package.json`、`server/index.js`、`scripts/build-iexpress.ps1` |
| WebView2 桌面壳默认窗口为 `1400x900`，当前脚本最小窗口为 `1280x800`。 | 有效 | 读取 `scripts/build-iexpress.ps1`，2026-06-18 已重新执行 `npm run dist:win` |
| WebView2 当前显式设置 `ZoomFactor = 1.0`。 | 有效 | 读取 `scripts/build-iexpress.ps1` |
| 进程层使用随机 `127.0.0.1` 本地端口作为 WebView2 内部服务。 | 有效 | C# launcher 使用 `GetFreeLoopbackPort()` 并设置 `PORT` |
| Node 子进程设置 `CreateNoWindow=true`。 | 有效 | 读取 `scripts/build-iexpress.ps1` |
| 桌面 UI 不显示浏览器地址栏，也不应向用户暴露 localhost。 | 有效 | 当前安装链使用 WebView2 窗体加载内部地址 |
| 原库路径解析优先级为 `config.json` 的 `originalDbPath`，其次 `FLESHOUT_DB`，最后默认 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db`。 | 有效 | 读取 `server/index.js` 的 `getOriginalDbPathInfo()`；`/api/settings` 验证保存后来源变为 `config`；安装版 `GET /api/settings` 验证来源为 `default` |
| 设置页可读取和保存原库路径；接口为 `GET/PUT /api/settings`。 | 有效 | 读取 `src/main.tsx` 的 `SettingsPage` 与 `server/index.js` 路由；API 临时端口和安装版端口验证通过 |
| `server/index.js` sidecar DB 默认使用应用目录 `data/continuations.db`，可用 `FLESHOUT_CONTINUATION_DB` 覆盖。 | 有效 | 读取 `server/index.js` |
| `小说改写` 页面已有单章 AI 改写入口，后端已有 `POST /api/projects/:id/rewrite-chapter`。 | 有效 | 读取 `src/main.tsx` 和 `server/index.js` |
| 当前 UI 按原 FleshOut 工作流重做为“我的项目/工作台”入口 + 五阶段暗色工作台。 | 有效 | `src/main.tsx`、`src/styles.css`；项目入口可点击 `进入工作台`，工作台阶段为书籍拆分、内容总结、识别待处理、AI改写、合并输出 |
| 项目入口已移除“全部 / 最近更新 / 原 FleshOut / 自建项目”分段筛选模块。 | 有效 | 读取 `src/main.tsx` 的 `WorkbenchPage`，项目列表只保留搜索框和项目列表 |
| 工作台项目详情页不展示 `运行目录` 文件夹统计块；该统计块仍保留在需要工作区输出检查的阶段页面。 | 有效 | 读取 `src/main.tsx`：`WorkbenchPage` 已移除 `<WorkspacePanel project={selectedProject} />`，仅阶段页保留 `<WorkspacePanel project={detail.project} />` |
| 工作台项目详情点击 `编辑` 打开原应用式 `项目配置` 弹窗，不再只是编辑小说名称；弹窗包含 `基础设置`、`AI 模型`、`提示词策略` 三个侧栏页签。 | 有效 | Playwright + Chrome 临时端口 5219 验证：基础设置含项目名称、不可修改处理模式、并发处理数、加料字数；AI 模型页列出 3 个模型；提示词策略页列出 6 个模板并可切换 `系统破甲`、`场景识别`、`改写规则` |
| 自建 TXT 项目在 `项目配置` 弹窗保存时会更新 sidecar `projects` 的 `name`、`model_id`、`template_id`、`prompt_strategy`、`user_requirement`、`concurrency`、`expand_word_count`；原 FleshOut 项目仍只保存显示名 override。 | 有效 | 临时项目验证保存后 `concurrency=4`、`expand_word_count=4500`；`server/index.js` 的 `updateSidecarProject()` 写 sidecar，`updateProjectDisplayName()` 对原库项目不写原 `fleshout.db` |
| 新建项目导入向导左侧步骤栏已统一为暗色选中态，当前步骤不再显示浅色块。 | 有效 | 读取 `src/styles.css` 中 `.import-wizard-shell .wizard-step.active` / `.done` 作用域样式；`npm run build` 通过 |
| 新建项目导入向导第 1 步上传 TXT 后显示文件名卡片和项目名称确认，不再显示 TXT 正文；右下角 `下一步` 进入第 2 步 `TXT 拆分`。 | 有效 | 读取 `src/main.tsx` 的 `ImportTxtModal` 与 `src/styles.css`；Playwright 1400x900 验证上传样本后 `txtBodyVisible=false`、`下一步` 可点，点击后标题为 `TXT 拆分` |
| 新建项目导入向导第 2 步 `TXT 拆分` 点击 `预览` 后停留在当前步骤，章节表完整显示拆分结果，右侧显示标题命中行号；底部主按钮保持 `下一步`。 | 有效 | 读取 `src/main.tsx` 的 `runPreview` 和 footer 逻辑、`server/index.js` 的 `splitTxtIntoChapters` 行号输出；Playwright 验证标题仍为 `TXT 拆分`、表格含 `L1/L5/L9`、footer 为 `下一步` |
| 新建项目导入向导第 3 步 `预览信息` 的总字数按原应用风格显示为 1 位小数的 `万字`，例如 `251,558` 显示为 `25.2 万字`。 | 有效 | 读取 `src/main.tsx` 的 `formatWanWords()` 和预览信息卡片 `Info label="总字数"` |
| 新建项目导入向导第 4 步 `模型配置` 只显示 `自动模式`，并在同页提供可调 `并发处理数` 和 `加料字数`；半自动/手动模式不显示。 | 有效 | Playwright + Chrome 1400x900 验证 `hasAuto=true`、`hasSemiAuto=false`、`hasManual=false`、并发范围 `1-30`、加料字数范围 `1000-20000` |
| 新建 TXT 项目创建时会保存 `default_mode='auto'`、`concurrency` 和 `expand_word_count`；工作台阶段 2/3/4 会按项目并发数执行。 | 有效 | 临时端口 5198 API 验证导入 `concurrency=7`、`expandWordCount=6000` 后返回 `default_mode=auto`、`concurrency=7`、`expand_word_count=6000`；读取 `server/index.js` 的 `runWithConcurrency()` |
| 新建项目导入向导第 5 步 `提示词策略` 支持切换并编辑 `系统破甲`、`场景识别`、`改写规则`；场景识别可展开/收起并编辑 ID、名称、条件和提示词，改写规则可编辑通用指导和场景规则。 | 有效 | Playwright + Chrome 1450x860 验证 `场景识别` 14 条可展开、`改写规则` 14 条可见、底部 `下一步` 保持可见；截图 `output/playwright/import-wizard-prompt-identify.png`、`import-wizard-prompt-rewrite.png` |
| 新建项目导入向导中编辑提示词模板后，创建 TXT 项目会在 sidecar `prompt_templates` 克隆一份项目专属模板，并将项目 `template_id` 指向副本；不写入原 FleshOut DB。 | 有效 | 临时端口 5199 API 验证覆盖 `breakthroughTemplate`、`identifyTemplate`、`rewriteTemplate` 后返回新 `template_id`，sidecar 副本三段内容一致；验证后临时项目和模板已删除 |
| 弹窗打开时锁定页面背景滚动，鼠标滚轮不会带动上级工作台页面。 | 有效 | `Modal` 挂载时设置 `document.body.style.overflow='hidden'`；Playwright 验证 wheel 后 `window.scrollY` 不变 |
| `RewritePage` 当前采用 64px 左图标栏 + 顶部五阶段进度线 + 左章节导航 / 中央阶段内容 / 右侧阶段操作三栏布局。 | 有效 | Playwright + Chrome 验证 AI 改写页 `.app-shell` 为 `64px 1386px`，所有 `.nav-item span` 为 `display:none`；旧 1366x768、1400x900、1920x1080 视口检查仍无横向溢出 |
| 五阶段工作台第 1 步“书籍拆分”对齐原应用拆分页：中间只保留书籍名称，不展示书籍基本信息、文件信息或 TXT 正文；右侧只保留 `书籍拆分` 进度条和开始/继续按钮，不显示改写本章、查看原文、查看对比等改写动作。 | 有效 | Playwright + Chrome 临时 TXT 项目验证 `.split-stage-empty` 仅 1 个 `STRONG` 书名、`splitSvgCount=0`、`rewriteActionVisible=[]`、`splitStatsVisible=false`，截图 `output/playwright/rewrite-split-stage-current.png` |
| 五阶段工作台第 2 步“内容总结”采用原应用式启动流程：中间区域只显示当前步骤状态，不提前展示功能列表；右侧按钮未完成时显示开始，完成后显示继续下一步。 | 有效 | 读取 `src/main.tsx` 的 `StageStartPanel`、`starterStage` 和右侧阶段按钮逻辑 |
| 五阶段工作台第 2 步“内容总结”完成后会留在内容总结页展示章节审阅工作台：左侧章节导航显示 `需改写` / `无需改写` / `已总结` 标识，点击章节后中间展示情节概要、登场人物、关键事件；需改写章节下方展示由提示词模板匹配出的场景识别条件和改写规则。 | 有效 | 读取 `src/main.tsx` 的 `ChapterSummaryWorkbench`、`parseChapterSummary()`、`chapterHasRewriteMark()`、`getChapterSceneRules()`；`npm run build` 通过 |
| 五阶段工作台第 3 步之后保留阶段内容页和阶段操作条，完成后显示 `继续`，未完成时显示对应开始操作。 | 有效 | 读取 `src/main.tsx` 的 `StageActionBar` |
| 五阶段工作台执行严格顺序门禁：第 N 步只有在 1..N-1 步全部完成后才可查看和操作，已完成或当前可访问阶段可回看。 | 有效 | `src/main.tsx` 使用 `canAccessStage()` 锁定未来步骤；`server/index.js` 使用 `assertWorkflowStageAccessible()` 保护阶段运行、单章改写和标记保留接口 |
| 新上传 TXT 项目进入工作台时第 1 步“书籍拆分”初始为待处理，需完成第 1 步后才解锁“内容总结”。 | 有效 | `createSidecarTxtProject()` 初始化 `chapter_stage_status` 时不再把阶段 1 预置为 completed；临时端口 5197 API 验证新项目 stage1 pending、stage2 locked |
| 真实 AI 改写 / 总结 / 识别 / 续写调用需要显式 `confirmAiCall: true`。 | 有效 | 读取 `server/index.js` 的 `requireAiCallConfirmation()` |

## 已废弃或降权的旧结论

| 旧结论 | 状态 | 处理 |
|---|---|---|
| `AGENT_MEMORY.md` / `README_FIRST_VERSION.md` 写着“当前先保持 Web 原型，后续再考虑 Tauri 打包”。 | 已废弃 | 当前安装版目标已变为 Windows 安装版 + C# WinForms WebView2 壳 |
| `AGENT_MEMORY.md` 写着“还没有完整实现单章 AI 改写按钮和 `/rewrite-chapter` 接口”。 | 已废弃 | 当前 `src/main.tsx` 和 `server/index.js` 已实现该入口和接口 |
| `desktop/main.cjs` 的 Electron 桌面入口。 | 历史记录 | 当前安装版未使用它；不要从该文件推断安装版行为 |
| `server/index.js` 默认原库路径只能硬编码到当前用户。 | 已废弃 | 当前已支持 `config.json` 配置，其次仍保留 `FLESHOUT_DB` 和默认路径兜底 |

## 待确认冲突

当前无已知待确认冲突。原“最小窗口建议不低于 `1280x800`，但当前脚本仍为 `1080x720`”已在 2026-06-18 修复。
