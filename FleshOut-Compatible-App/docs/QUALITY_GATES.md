# Quality Gates

更新时间：2026-06-18 15:55:00 +08:00

用途：记录每类修改后的最低验证门禁。

## 每次代码修改后

至少执行：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
node --check server/index.js
npm run build
```

## 每次安装器修改后

执行：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
npm run dist:win
```

安装器相关修改还要复核：

- `release/FleshOut-Compatible-Setup.exe` 是否生成。
- `%LOCALAPPDATA%\FleshOut-Compatible-App` 是否安装成功。
- `C:\Users\Admin\Desktop\FleshOut Compatible.lnk` 是否创建。
- 双击是否进入 WebView2 桌面窗体。
- 是否未打开外部浏览器。
- 是否不显示 localhost 地址栏。
- 是否无命令行窗口，Node 子进程保持 `CreateNoWindow=true`。
- 原 `fleshout.db` 修改时间是否未变化。

注意：工具侧等待 Setup 时可能超时，但不一定代表安装失败。若出现超时，应继续检查安装目录、桌面窗口、WebView2 子进程、Node 随机端口和 `/api/health`，不要只凭超时判定失败。

## 每次数据库路径 / 设置页修改后

至少检查：

- `node --check server/index.js`
- `npm run build`
- `GET /api/settings` 能返回当前原库路径、配置文件路径和 sidecar DB 路径。
- `PUT /api/settings` 保存存在的 `fleshout.db` 后，返回来源为 `config`。
- `PUT /api/settings` 保存不存在的路径时返回 400。
- 原 `fleshout.db` 修改时间不变化。
- 如要交付安装版，继续执行 `npm run dist:win` 并重新安装验证。

## 每次 UI 布局修改后

至少检查：

- 1366x768
- 1400x900
- 1920x1080
- 页面无横向滚动
- 统计卡片不竖排
- 左侧章节导航可读
- 右侧统计不挤压主内容
- WebView2 窗口内显示正常

如果修改 `RewritePage` 或新建项目导入向导，额外检查：

- 新建 TXT 临时项目验证后要删除，避免污染项目列表。
- 阶段 1 `书籍拆分` 不应展示改写动作按钮。
- 新建项目弹窗打开后背景页面不能跟随鼠标滚轮滚动。
- 导入向导底部按钮在 1400x900 内保持可见。
- 截图和指标优先放到 `output/playwright/`。

如果暂时不能自动化截图，必须在任务结果里标记为手工验收项。后续建议补 Playwright 视觉回归。

Playwright 如果找不到自带 Chromium，可使用系统 Chrome 的 `executablePath`。具体写法见 `docs/DEVELOPMENT_NOTES.md`。

## RewritePage / 阶段式工作台响应式验收重点

- 当前原应用式布局：1366x768、1400x900、1920x1080 应保持三栏，分别为左章节导航、中间阶段内容、右侧阶段统计。
- 窄屏：`max-width: 1180px` 以下允许切为单列。
- 左侧全局导航应保持 64px 图标栏，避免挤压工作台三栏。
- `.metrics-grid` 建议使用 `auto-fit + minmax`，避免统计卡片竖排。
- WebView2 默认窗口当前为 `1400x900`。
- 最小窗口当前为 `1280x800`。
- WebView2 `ZoomFactor` 当前显式设置为 `1.0`。
- 当前可复核产物：`output/playwright/ui-redesign-final3-metrics.json`、`ui-redesign-ai-rewrite-final-1366x768.png`、`ui-redesign-ai-rewrite-final-1400x900.png`、`ui-redesign-ai-rewrite-final-1920x1080.png`。

## 文档修改后

至少检查：

- 目标文档是否创建成功。
- 文档内路径是否正确，尤其 `[sxsy.org]` 路径是否保留。
- 是否存在明显冲突。
- 是否把旧结论标记为 `已废弃`、`历史记录` 或 `待确认冲突`。

## 真实 AI 调用限制

- 不要在验证中随意触发模型调用。
- AI 改写、续写、总结、识别、审查等调用可能消耗外部资源。
- 除用户明确要求外，测试应优先覆盖页面、接口语法、构建和非 AI 数据路径。
