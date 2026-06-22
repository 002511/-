# Development Notes

更新时间：2026-06-18 15:55:00 +08:00

用途：沉淀本项目开发、调试、前端页面修改、打包安装时反复遇到的问题和可复用经验。当前事实仍以 `docs/CURRENT_FACTS.md` 为准，本文件偏实操。

## 快速接手顺序

1. 先读 `AGENTS.md`。
2. 再读 `docs/CURRENT_FACTS.md` 和 `docs/TASK_STATUS.md`。
3. 改前端页面时读本文件，再定位 `src/main.tsx` 和 `src/styles.css`。
4. 改后端、数据库、安装器时读 `docs/ARCHITECTURE_MAP.md`、`docs/QUALITY_GATES.md`、`docs/TROUBLESHOOTING.md`。
5. 旧 `AGENT_MEMORY.md`、`README_FIRST_VERSION.md` 只用于追溯，不作为当前事实。

## 路径和 PowerShell 规则

项目路径包含 `[sxsy.org]`，PowerShell 会把方括号当通配符。几乎所有命令都要使用字面路径。

推荐模板：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
```

常见坑：

- `Get-Content .\src\main.tsx` 在某些情况下会被方括号路径影响，优先用 `Get-Content -LiteralPath (Join-Path $app 'src\main.tsx')`。
- `Start-Process -WorkingDirectory $app` 可能把工作目录当通配符解析，带 `[sxsy.org]` 时容易失败；可用 `[System.Diagnostics.ProcessStartInfo]` 或先 `Set-Location -LiteralPath $app`。
- 不要用 `$pid` 作为变量名，PowerShell 内置 `$PID` 是只读变量；用 `$ownerProcessId`、`$nodePidNum`。
- 查找文件和文本优先用 `rg`，比递归 `Get-ChildItem | Select-String` 更快。

## 常用命令

开发检查：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
node --check .\server\index.js
npm run build
```

源码开发服务：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
npm run dev
```

重新生成安装包：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
npm run dist:win
```

检查安装版健康状态：

```powershell
$nodeProc = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -match 'FleshOut-Compatible-App\\runtime\\node\.exe'
} | Select-Object -First 1

$nodePidNum = [int]$nodeProc.ProcessId
Get-NetTCPConnection -OwningProcess $nodePidNum -State Listen
```

找到端口后访问：

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:<端口>/api/health'
```

## 数据边界

必须保持：

- 不修改原 `fleshout.exe`。
- 不写原 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db`。
- 原库只读打开，新增状态写入 sidecar DB 或 `.fleshout-workspace`。
- 不主动触发真实 AI 调用，除非用户明确要求或接口动作显式带 `confirmAiCall: true`。

每次安装、调试、执行阶段后，建议复核原库时间戳：

```powershell
Get-Item -LiteralPath 'C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db' |
  Select-Object FullName,LastWriteTimeUtc,Length
```

## 前端页面修改定位

当前前端主要集中在两个大文件：

- `src/main.tsx`：页面、状态、组件和大部分交互逻辑。
- `src/styles.css`：全局样式、导入向导样式、工作台样式、响应式规则。

常用定位关键词：

| 要改的区域 | `src/main.tsx` 搜索关键词 | `src/styles.css` 搜索关键词 |
|---|---|---|
| 工作台项目入口 | `function WorkbenchPage`、`project-detail-panel` | `.workbench-layout`、`.project-detail-panel` |
| 工作台项目配置弹窗 | `ProjectConfigModal`、`ProjectUpdateInput`、`updateProject` | `.project-config-shell`、`.project-config-nav` |
| 新建项目弹窗 | `function ImportTxtModal`、`steps`、`runPreview` | `.import-wizard`、`.wizard-step`、`.modal` |
| TXT 拆分预览 | `previewTxtProject`、`chapter.lineNumber` | `.chapter-preview`、`.preview` |
| AI 改写工作台 | `function RewritePage`、`visibleStage`、`SplitStageSidePanel` | `.rewrite-pipeline-grid`、`.pipeline-side`、`.split-stage-empty` |
| 内容总结审阅页 | `ChapterSummaryWorkbench`、`parseChapterSummary`、`getChapterSceneRules` | `.chapter-summary-workbench`、`.summary-rule-card` |
| 左侧图标导航 | `app-shell-compact-nav` | `.app-shell-compact-nav` |
| 阶段开始/继续按钮 | `StageActionBar`、`stageStartLabel` | `.stage-action-bar`、`.stage-run-box` |
| 提示词策略 | `PromptStrategyStep`、`identifyCategories`、`rewritePromptSummary` | `.prompt-strategy`、`.scene-rule` |
| 模型配置 | `处理模式`、`concurrency`、`expandWordCount` | `.mode-card`、`.processing-settings` |

修改时建议先用 `rg -n "关键词" src\main.tsx src\styles.css` 定位，再读上下 80-120 行上下文。

## AI 改写五阶段工作台经验

阶段含义：

1. `书籍拆分`
2. `内容总结`
3. `识别待处理`
4. `AI改写`
5. `合并输出`

关键变量：

- `activeStage`：当前 UI 选中阶段。
- `visibleStage`：受门禁限制后实际可见阶段。
- `maxAccessibleStage`：当前项目最多能进入的阶段。
- `starterStage`：当前用于隐藏后续改写动作的启动阶段集合。
- `activeStageSummary`：当前阶段完成/待处理/失败统计。

已确认的 UI 规则：

- 新建 TXT 项目进入工作台时，阶段 1 初始 pending。
- 未来阶段必须前置阶段完成后才解锁。
- 第 1 步 `书籍拆分` 中间只保留书名。
- 第 1 步右侧只保留拆分进度条和开始/继续按钮。
- 第 1 步不能展示 `改写本章`、`查看原文`、`查看对比`、`标记保留原文`、`批量改写待处理章节`。
- 第 2 步未完成时只显示启动状态；完成后必须留在内容总结页，不能只显示一个完成进度页。
- 第 2 步左侧章节导航应显示 `需改写` / `无需改写` / `已总结`，点击章节只切换当前总结详情。
- 第 2 步中间详情应显示 `情节概要`、`登场人物`、`关键事件`；对 `需改写` 章节下方显示 `场景识别标记`，规则内容来自提示词模板的场景识别条件和场景改写规则。
- 进入 `AI改写` 模块后，左侧全局导航收缩为 64px 图标栏。
- 后续阶段的改写动作只应出现在第 3 步之后，尤其第 4 步。

验证第 1 步时，推荐用临时 TXT 项目，不要选已经完成阶段 1 的旧项目，否则页面可能直接落到第 2 步或后续阶段。

## 新建项目弹窗经验

关键交互：

- 第 1 步上传 TXT 后只显示文件名卡片和项目名称，不显示 TXT 正文。
- 第 2 步 `TXT 拆分` 点击 `预览` 后必须停留当前页，展示章节列表，底部主按钮变成 `下一步`。
- 章节后面显示行号更接近原应用，也便于调试拆章规则。
- 第 3 步 `预览信息` 总字数显示为 `万字`，不要显示纯数字。
- 第 4 步只显示 `自动模式`，但保留并发处理数和加料字数设置。
- 第 5 步提示词策略要能切换 `系统破甲`、`场景识别`、`改写规则`，并可编辑。
- 弹窗打开时必须锁定背景滚动，避免鼠标滚轮带动工作台页面。

常见问题：

- 点击预览直接跳下一步：检查 `runPreview` 是否只设置 preview 数据，不调用 `setStep(2)` 或后续步骤。
- 预览后底部按钮消失：检查 footer 是否被滚动区域挤出，弹窗布局应是头部、内容滚动区、底部固定区。
- 背景滚动穿透：检查 `Modal` 挂载时是否设置 `document.body.style.overflow='hidden'`，卸载时是否恢复。

## 样式修改经验

本应用 UI 以工具型工作台为主，不做营销页。修改时优先：

- 信息密度适中，避免大面积空白营销布局。
- 卡片圆角保持 8px 或更小。
- 不把页面区块套成多层卡片。
- 桌面主工作台优先兼容 `1400x900`。
- 关键视口至少检查 `1366x768`、`1400x900`、`1920x1080`。
- 不用 viewport width 动态缩放字体。
- 按钮文字要能放下，避免中文被挤压。

RewritePage 当前布局：

- 外壳：`app-shell-compact-nav` 将左侧全局导航压到 64px。
- 页面：`rewrite-pipeline-grid` 三栏，左章节导航 / 中央阶段内容 / 右侧阶段操作。
- 小屏：`1180px` 以下允许单列。

如果修改色彩，注意不要让整页变成单一色系；当前原应用式暗色工作台可以保留，但按钮和状态色要有功能区分。

## Playwright / Chrome 验证经验

项目内 Playwright 包可能存在，但对应浏览器二进制不一定安装。遇到：

```text
Executable doesn't exist at ... chromium_headless_shell...
```

不要急着下载浏览器，可以使用本机 Chrome：

```js
await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox']
});
```

验证产物统一放：

```text
output/playwright/
```

建议保存：

- 截图 `.png`
- 指标 `.json`

前端验证常用指标：

- `document.body.scrollWidth <= window.innerWidth`
- `.app-shell` 的 `gridTemplateColumns`
- `.nav-item span` 是否 `display:none`
- 目标按钮文案是否出现或消失
- 弹窗打开时 `document.body.style.overflow`
- 临时项目验证后是否删除

## 临时项目验证经验

用 API 创建临时 TXT 项目可稳定验证新建项目和阶段 1 状态：

```http
POST /api/projects/import-txt
```

示例 payload：

```json
{
  "name": "Codex验证项目",
  "content": "第一章 临时验证\n正文...\n\n第二章 继续验证\n正文...",
  "concurrency": 2,
  "expandWordCount": 4000
}
```

验证后必须删除：

```http
DELETE /api/projects/<projectId>
```

删除只用于 `source === "sidecar"` 的自建项目；不要删除原 FleshOut 项目。

## 安装打包经验

当前安装入口：

```powershell
npm run dist:win
```

这个命令会：

- 运行 `npm run build`。
- 执行 `node --check server/index.js`。
- 复制 `dist`、`server`、`runtime`、`node_modules`、`package.json`。
- 只携带 `data/continuations.db`，不打包 `data/user-projects`。
- 生成 C# WinForms + WebView2 launcher、uninstaller 和 setup。
- 输出 `release/FleshOut-Compatible-Setup.exe`。

安装版位置：

```text
C:\Users\Admin\AppData\Local\FleshOut-Compatible-App
```

Setup 会自动启动桌面窗口。工具侧等待 Setup 时可能超时，但这不一定代表失败。判断安装成功要看：

- 安装目录文件是否更新。
- `FleshOut-Compatible.exe` 是否运行。
- 窗口标题是否为 `FleshOut Compatible`。
- `msedgewebview2.exe` 命令行是否包含 `--webview-exe-name=FleshOut-Compatible.exe`。
- 安装版 Node 是否监听随机 `127.0.0.1` 端口。
- `/api/health` 是否返回 `ok=true`。
- 桌面和开始菜单快捷方式是否存在。

不要把原 FleshOut 的 `fleshout.exe` WebView2 进程和兼容版混淆。原应用命令行里通常是：

```text
--webview-exe-name=fleshout.exe
```

兼容版应是：

```text
--webview-exe-name=FleshOut-Compatible.exe
```

## 常见命令坑和处理

| 问题 | 原因 | 处理 |
|---|---|---|
| `Get-Content` 找不到存在的文件 | 路径中 `[sxsy.org]` 被当通配符 | 用绝对路径变量 + `-LiteralPath` |
| `Start-Process -WorkingDirectory` 报通配符路径无法解析 | 工作目录未按字面路径处理 | 用 `Set-Location -LiteralPath` 后启动，或用 `.NET ProcessStartInfo` |
| `$pid` 变量不能赋值 | PowerShell 内置 `$PID` 只读 | 改名为 `$nodePidNum` / `$ownerProcessId` |
| `npx tsc --noEmit` 大量 JSX 类型错误 | 项目未安装 React 类型声明 | 以 `vite build` 为当前构建门禁，除非补齐类型依赖 |
| Playwright 找不到 Chromium | 只装了包，没装浏览器二进制 | 使用系统 Chrome `executablePath` |
| Setup 命令等待超时 | Setup 可能已安装并启动桌面版但未及时返回 | 查安装目录、窗口、WebView2、Node 健康接口 |
| 端口 5178/5201 冲突 | 可能已有 dev server 或临时验证服务 | 查 `Get-NetTCPConnection`，只停止自己启动的临时服务 |

## 文档同步规则

改代码后不要只改 changelog：

- 当前真实状态改变：更新 `docs/CURRENT_FACTS.md`。
- 当前任务和验证结果改变：更新 `docs/TASK_STATUS.md`。
- 新增经验或坑：更新本文件或 `docs/TROUBLESHOOTING.md`。
- 构建/安装门禁变化：更新 `docs/QUALITY_GATES.md`。
- 完成一组有意义操作：追加 `docs/CHANGELOG_AGENT.md`。

`docs/CHANGELOG_AGENT.md` 是历史日志，不要让它覆盖 `docs/CURRENT_FACTS.md` 的当前事实。

## 后续拆分建议

当前 `src/main.tsx` 和 `src/styles.css` 仍偏大。后续修 bug 时，不建议顺手大重构；若要拆分，建议单独开任务，顺序如下：

1. 先抽 `types`、API helper、通用小组件。
2. 再抽 `ImportTxtModal`。
3. 再抽 `RewritePage` 和 rewrite 相关组件。
4. 最后拆 CSS 为 `base/layout/rewrite/import-wizard/management` 等模块。

每次拆分都要保持 `node --check server/index.js` 和 `npm run build` 通过，并做至少一个核心页面截图验证。
