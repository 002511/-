# Troubleshooting

更新时间：2026-06-18 15:55:00 +08:00

用途：常见问题与解决办法。当前事实以 `docs/CURRENT_FACTS.md` 为准。

## 问题 1：文档过时导致 Agent 判断错误

- 原因：旧 `AGENT_MEMORY.md` / `README_FIRST_VERSION.md` 仍记录 Web 原型、Tauri 后续打包、单章改写未完成等历史状态。
- 风险：新 Agent 可能重复开发已经存在的 `/rewrite-chapter`，或误以为当前没有 Windows 安装版。
- 处理规则：先读 `AGENTS.md` 和 `docs/CURRENT_FACTS.md`；旧文档只作为历史追溯。冲突内容必须标为 `已废弃`、`历史记录` 或 `待确认冲突`。

## 问题 2：WebView2 页面与原应用显示不一致

- 现象：桌面壳中布局、滚动、字体密度可能与浏览器或原 FleshOut 视觉不一致。
- 原因：当前是 C# WinForms + WebView2 载入本地 Vite 构建产物，不是原 `fleshout.exe` UI，也不是 `desktop/main.cjs`。
- 排查顺序：先确认安装版是否来自 `scripts/build-iexpress.ps1`；再检查 WebView2 窗口尺寸、CSS 响应式、是否加载 `dist/`；最后对比浏览器 dev 模式。
- 建议修复：优先修 CSS 响应式和 WebView2 窗口参数，不要通过修改原 `fleshout.exe` 解决。

## 问题 3：RewritePage 三栏布局被挤压

- 现象：WebView2 默认窗口下左侧章节导航、中间主内容、右侧统计可能互相挤压；统计卡片可能变窄或竖排。
- 当前相关样式：
  - `.rewrite-pipeline-grid`
  - `.metrics-grid`
  - `.chapter-nav-panel`
  - `.pipeline-side`
- 建议方向：
  - 当前原应用式设计优先保持三栏：左章节导航、中间阶段内容、右侧阶段统计。
  - 1366x768、1400x900、1920x1080 均应无横向滚动。
  - 左侧全局导航保持 64px 图标栏，避免挤压工作台。
  - 1180px 以下可切为单列。
  - `metrics-grid` 使用 `auto-fit + minmax`，避免统计卡片竖排。
- 当前处理：2026-06-18 原应用式 UI 重设计后，`RewritePage` 在 1366x768、1400x900、1920x1080 均保持三栏；复核产物见 `output/playwright/ui-redesign-final3-metrics.json`。

## 问题 4：`scripts/build-iexpress.ps1` 名称与实际用途不完全一致

- 当前事实：该脚本名包含 `iexpress`，但实际是自定义 C# Setup 生成流程。
- 影响：Agent 可能误以为安装包主流程是 IExpress SED。
- 处理：当前仍以 `scripts/build-iexpress.ps1` 为真实入口；后续可考虑改名为 `build-setup.ps1`，同时更新 `package.json` 和文档。

## 问题 5：递归打包整个 data 导致长路径失败

- 原因：`data/user-projects/.../.fleshout-workspace/exports/...` 路径可能过长。
- 当前策略：
  - 只携带 `data/continuations.db`。
  - 不打包用户工程缓存。
  - 安装后只创建空 `data/user-projects` 目录。

## 问题 6：原库路径在换机器或换用户时失效

- 影响：换机器或换用户可能失效。
- 当前事实：原库路径解析顺序为 `config.json` 的 `originalDbPath`、`FLESHOUT_DB`、默认 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db`。
- 配置位置：安装版保存到 `%LOCALAPPDATA%\FleshOut-Compatible-App\config.json`；源码运行时默认保存到项目根目录 `config.json`。
- 处理方法：
  - 在设置页“原 FleshOut 数据库”中保存新的 `fleshout.db` 路径。
  - 或临时设置 `FLESHOUT_DB` 环境变量。
  - 保存前接口只校验文件存在；真正读取仍使用 `readonly: true` 和 `fileMustExist: true`。
  - 如果 `config.json` 损坏，`/api/settings` 会返回 `CONFIG_READ_FAILED`，需修复 JSON 后重试。

## 问题 7：`desktop/main.cjs` 未被安装版使用

- 影响：该文件里的 Electron 窗口、固定端口 `5178`、启动逻辑不会影响当前安装版。
- 当前事实：安装版使用 C# WinForms + WebView2 壳，由 `scripts/build-iexpress.ps1` 内联生成。
- 处理：调试安装版时优先读安装脚本，不要优先改 `desktop/main.cjs`。

## 问题 8：localhost 暴露问题

- 当前事实：UI 不显示 localhost 地址栏。
- 进程层：使用随机 `127.0.0.1` 本地端口作为 WebView2 内部服务。
- 排查：如果用户看到 localhost，先确认是否误开了 `npm run dev` 浏览器页面，而不是安装版 WebView2。

## 问题 9：命令行窗口显示问题

- 要求：Node 子进程必须 `CreateNoWindow=true`。
- 当前事实：安装脚本内联 C# launcher 已设置 `CreateNoWindow=true`。
- 排查：如果启动时看到命令行窗口，检查是否从源码脚本或 `npm run dev` 启动，而不是桌面快捷方式。

## 问题 10：WebView2 最小窗口建议与当前脚本不一致

- 历史现象：文档建议最小窗口不低于 `1280x800`，但旧脚本设置为 `1080x720`。
- 当前状态：已修复。
- 当前处理：2026-06-18 已把默认窗口改为 `1400x900`，最小窗口改为 `1280x800`，并设置 `ZoomFactor=1.0`。

## 问题 11：删除自建项目时报“项目目录不在 data/user-projects 下”

- 现象：安装版中删除旧自建项目时，提示“项目目录不在 data/user-projects 下，已阻止删除”。
- 原因：旧项目记录可能来自源码运行阶段，`output_path` 指向源码目录的 `FleshOut-Compatible-App\data\user-projects\<id>`；安装版运行根目录是 `%LOCALAPPDATA%\FleshOut-Compatible-App`，旧安全判断只允许当前运行根目录下的 `data/user-projects`。
- 当前处理：删除安全判断已兼容当前运行目录、`process.cwd()` 和路径中 `FleshOut-Compatible-App` 标记对应的源码目录；仍然只允许删除 `data/user-projects\<id>` 下的自建项目目录。
- UI 处理：原 FleshOut 项目只读，不再渲染真正的删除按钮；删除按钮只对 `source === "sidecar"` 的自建项目显示。
- 验证：2026-06-18 已用安装版 sidecar DB 中的旧源码路径项目 `fc2aa4ee-53fa-45e6-a88a-51a64b2b293c` 验证删除成功，项目目录和 sidecar 记录均移除，原 `fleshout.db` 时间戳不变。

## 问题 12：PowerShell 在 `[sxsy.org]` 路径下误判文件不存在

- 现象：文件实际存在，但 `Get-Content .\src\main.tsx` 或 `Start-Process -WorkingDirectory $app` 报路径找不到或通配符无法解析。
- 原因：PowerShell 把路径中的方括号当成通配符字符。
- 处理：
  - 进入项目必须用 `Set-Location -LiteralPath $app`。
  - 读写文件优先用 `-LiteralPath (Join-Path $app '相对路径')`。
  - 后台启动服务时如果 `Start-Process -WorkingDirectory` 出错，可用 `.NET ProcessStartInfo`。

## 问题 13：PowerShell `$pid` 变量无法赋值

- 现象：脚本报 `Cannot overwrite variable PID because it is read-only or constant.`
- 原因：PowerShell 内置 `$PID` 是当前 PowerShell 进程 ID，只读；变量名大小写不敏感。
- 处理：不要写 `$pid = ...`，改用 `$nodePidNum`、`$ownerProcessId`、`$targetProcessId`。

## 问题 14：Playwright 报 Chromium 可执行文件不存在

- 现象：`browserType.launch: Executable doesn't exist ... chromium_headless_shell...`
- 原因：项目安装了 Playwright 包，但没有下载 Playwright 自带浏览器。
- 处理：
  - 优先使用系统 Chrome：`executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'`。
  - 验证产物仍放到 `output/playwright/`。
  - 只有确实需要 Playwright 自带浏览器时再考虑 `npx playwright install`。

## 问题 15：Setup 命令超时但安装实际成功

- 现象：执行 `FleshOut-Compatible-Setup.exe` 的工具等待超时。
- 可能原因：Setup 写入安装目录并自动启动桌面版后，外层等待没有及时返回。
- 判断安装是否成功：
  - `%LOCALAPPDATA%\FleshOut-Compatible-App\FleshOut-Compatible.exe` 更新时间已更新。
  - 存在窗口标题 `FleshOut Compatible`。
  - 存在安装版 Node 子进程 `...\FleshOut-Compatible-App\runtime\node.exe`。
  - 该 Node 监听随机 `127.0.0.1` 端口，`/api/health` 返回 `ok=true`。
  - WebView2 子进程命令行包含 `--webview-exe-name=FleshOut-Compatible.exe`。
  - 桌面快捷方式和开始菜单快捷方式存在。

## 问题 16：混淆原 FleshOut 和兼容版 WebView2 进程

- 原 FleshOut 进程特征：WebView2 命令行通常包含 `--webview-exe-name=fleshout.exe`，用户数据目录在 `com.fleshout.app`。
- 兼容版进程特征：WebView2 命令行包含 `--webview-exe-name=FleshOut-Compatible.exe`，用户数据目录在 `FleshOut-Compatible-App`。
- 处理：验收兼容版时只看 `FleshOut-Compatible.exe` 及其 Node/WebView2 子进程，不要误杀原 FleshOut 进程。
