# Architecture Map

更新时间：2026-06-18 15:55:00 +08:00

用途：文件职责地图，减少新 Agent 低上下文接手时乱读或误读。

## 文件职责

| 文件 / 目录 | 职责 |
|---|---|
| `src/main.tsx` | 当前前端主入口，包含多数页面和状态逻辑，文件较大，修改需谨慎 |
| `src/styles.css` | 当前全局样式和页面样式，包含 rewrite 页面布局 |
| `server/index.js` | Node API、数据库、AI 调用、原库只读、sidecar 写入 |
| `config.json` | 本应用本地配置文件；安装版位于 `%LOCALAPPDATA%\FleshOut-Compatible-App\config.json`，用于保存原库路径等非密钥设置 |
| `scripts/build-iexpress.ps1` | Windows Setup 构建脚本，实际生成 C# WinForms + WebView2 安装器 |
| `package.json` | 构建命令入口 |
| `data/continuations.db` | sidecar 数据库 |
| `dist/` | 前端构建产物 |
| `desktop/main.cjs` | 历史 Electron 桌面入口；当前安装版未使用 |
| `runtime/` | Windows 安装版携带的 Node runtime |
| `release/` | 安装包输出目录 |
| `docs/` | 当前权威接手文档 |
| `docs/DEVELOPMENT_NOTES.md` | 开发、前端页面修改、打包安装、Playwright 验证和常见命令坑的实操手册 |
| `docs/ARCHIVE/` | 后续归档废弃文档或长历史说明 |

## 修改小说改写页面时，优先读

- `docs/DEVELOPMENT_NOTES.md` 中“前端页面修改定位”和“AI 改写五阶段工作台经验”。
- `src/main.tsx` 中 `RewritePage` 相关区域。
- `src/main.tsx` 中 `generateRewriteChapter`、`runStage`、`RewriteContentViewer`、`ChapterTable`。
- `server/index.js` 中 `rewriteChapterContent`、`POST /api/projects/:id/rewrite-chapter`、阶段 4 相关逻辑。
- `src/styles.css` 中：
  - `.rewrite-pipeline-grid`
  - `.metrics-grid`
  - `.chapter-nav-panel`
  - `.pipeline-side`

## 修改小说续写页面时，优先读

- `src/main.tsx` 中 `ContinuationPage` 相关区域。
- `src/main.tsx` 中 `ContinuationList`、续写动作函数。
- `server/index.js` 中 `continuation-context`、`continuation-outline`、`continuation-generate`、`continuation-review`、`continuations` 相关接口。
- `src/styles.css` 中 continuation 相关样式。

## 修改 WebView2 安装器时，优先读

- `docs/DEVELOPMENT_NOTES.md` 中“安装打包经验”。
- `scripts/build-iexpress.ps1`
- `package.json`
- `docs/CURRENT_FACTS.md`
- `docs/QUALITY_GATES.md`
- 如存在 `docs/BUILD_AND_PACKAGE.md`，也要读取。

注意：当前安装版由 `scripts/build-iexpress.ps1` 内联 C# 代码生成 launcher / setup / uninstaller，不走 `desktop/main.cjs`。

## 修改数据库路径时，优先读

- `server/index.js`
- `src/main.tsx` 中 `SettingsPage`
- `docs/CURRENT_FACTS.md`
- `docs/TROUBLESHOOTING.md`

当前规则：原库路径优先读取 `config.json` 的 `originalDbPath`，其次读取 `FLESHOUT_DB`，最后使用默认 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db`。配置接口为 `GET/PUT /api/settings`，保存前只校验文件存在；原库打开仍必须只读。

## 修改模型 / 提示词时，优先读

- `src/main.tsx` 中 `ModelsPage` / `PromptsPage`。
- `server/index.js` 中 models / prompt_templates 相关接口。
- `docs/QUALITY_GATES.md` 中真实 AI 调用限制。

## 后续结构优化建议

当前 `src/main.tsx` 文件过大，后续建议分阶段拆分，降低 Codex 上下文读取量。建议结构：

```text
src/
  main.tsx
  app/
    App.tsx
    api.ts
    types.ts
    state.ts
  pages/
    RewritePage.tsx
    ContinuationPage.tsx
    MemoryPage.tsx
    ModelsPage.tsx
    PromptsPage.tsx
    SettingsPage.tsx
  components/
    PageHeader.tsx
    Metric.tsx
    ProjectSelector.tsx
    WorkspacePanel.tsx
    Modal.tsx
  features/
    rewrite/
      rewriteTypes.ts
      rewriteUtils.ts
      RewriteChapterList.tsx
      RewritePipeline.tsx
  features/
    continuation/
      continuationTypes.ts
      continuationUtils.ts
  styles/
    base.css
    layout.css
    rewrite.css
    continuation.css
    management.css
```

本建议仅用于后续任务规划；本次文档治理不直接执行大规模重构。
