# Codex 任务提示词：FleshOut-Compatible-App 文档治理与低上下文接手优化

> 用途：把本文件内容作为 Codex 本次任务说明。  
> 项目：FleshOut-Compatible-App / 人工智能小说项目。  
> 注意：本项目不是乡行项目。

---

## 0. 项目路径

项目根目录：

```powershell
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件
```

应用目录：

```powershell
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App
```

PowerShell 进入目录时必须使用：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
```

原因：路径中包含 `[sxsy.org]`，不能用普通通配路径。

---

## 1. 本次任务目标

请根据当前真实项目状态，建立一套让 Codex / Agent 新窗口低上下文快速接手的操作文档体系，并治理过时记录，避免后续 Agent 读取旧文档后误判。

重点不是堆历史日志，而是建立：

1. 当前事实单一入口
2. 文件职责地图
3. 当前任务状态
4. 质量门禁
5. 常见问题与解决办法
6. 历史记录降权规则

本次任务主要是文档治理和上下文优化，不要擅自大规模重构业务代码。

---

## 2. 请先读取这些文件

进入应用目录后，先读取：

1. `AGENT_MEMORY.md`
2. `README_FIRST_VERSION.md`
3. `package.json`
4. `src/main.tsx`
5. `src/styles.css`
6. `scripts/build-iexpress.ps1`
7. `server/index.js`

读取后请判断哪些文档内容已经过时，不要直接相信旧记录。

---

## 3. 请创建或更新这些文档

如果文件已存在，请先读取原文，再增量修改。  
不要粗暴覆盖已有历史。  
如果发现冲突，保留历史，并新增「待确认冲突」说明。

建议创建在应用目录下：

```text
FleshOut-Compatible-App/
  AGENTS.md
  docs/
    CURRENT_FACTS.md
    TASK_STATUS.md
    ARCHITECTURE_MAP.md
    QUALITY_GATES.md
    TROUBLESHOOTING.md
    CHANGELOG_AGENT.md
    ARCHIVE/
```

---

## 4. AGENTS.md 要求

用途：Codex / Agent 项目入口规则。

必须写入：

### 4.1 每次进入项目优先读取顺序

1. `AGENTS.md`
2. `docs/CURRENT_FACTS.md`
3. `docs/TASK_STATUS.md`
4. `docs/ARCHITECTURE_MAP.md`
5. `docs/QUALITY_GATES.md`
6. `docs/TROUBLESHOOTING.md`

### 4.2 文档可信度规则

- 判断当前项目状态，以 `docs/CURRENT_FACTS.md` 为最高优先级。
- `docs/CHANGELOG_AGENT.md` 仅用于历史追溯，不得覆盖当前事实。
- 旧 README、旧 Agent Memory、历史日志中的内容，如果和 `CURRENT_FACTS.md` 冲突，以 `CURRENT_FACTS.md` 为准。
- 不允许只追加新结论而不处理旧结论。
- 旧结论必须标记为：
  - 已废弃
  - 历史记录
  - 待确认冲突

### 4.3 修改同步规则

- 修改代码后必须同步更新对应文档。
- 当前事实变化 → 更新 `docs/CURRENT_FACTS.md`。
- 当前任务进度变化 → 更新 `docs/TASK_STATUS.md`。
- 构建 / 安装器流程变化 → 更新 `docs/QUALITY_GATES.md` 和相关说明。
- 新增问题或解决方案 → 更新 `docs/TROUBLESHOOTING.md`。
- 重要操作完成后 → 追加 `docs/CHANGELOG_AGENT.md`。

### 4.4 安全规则

- 不要写入 token、cookie、password、secret。
- 修改文档前先读取原文，优先增量修改。
- 不确定的信息标记为 `[待确认]`。

---

## 5. docs/CURRENT_FACTS.md 要求

用途：当前有效事实，最高可信。

必须记录以下内容，并给关键事实增加：

- 状态：有效 / 已废弃 / 待确认
- 更新时间
- 验证方式

必须包含：

```text
项目名称：FleshOut-Compatible-App
项目类型：人工智能小说 / FleshOut 兼容桌面应用
当前不是乡行项目
当前目标：Windows 安装版 + WebView2 桌面壳
```

当前有效事实：

- 当前安装版使用 C# WinForms + WebView2 壳。
- `desktop/main.cjs` 当前未被安装版打包链使用。
- 当前构建命令：
  - `node --check server/index.js`
  - `npm run build`
  - `npm run dist:win`
- 当前安装器脚本：`scripts/build-iexpress.ps1`
- 注意：虽然脚本名包含 `iexpress`，但当前实际逻辑是自定义 C# Setup 生成流程。
- 当前安装目录：`%LOCALAPPDATA%\FleshOut-Compatible-App`
- 桌面快捷方式：`C:\Users\Admin\Desktop\FleshOut Compatible.lnk`
- sidecar 数据库路径：`C:\Users\Admin\AppData\Local\FleshOut-Compatible-App\data\continuations.db`
- 原 FleshOut 数据库路径：`C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db`
- 原 `fleshout.db` 必须只读，不应被修改。
- 当前安装版只携带 `data/continuations.db`。
- 当前安装版不打包 `data/user-projects`。
- 当前主要技术栈：React 18 + TypeScript + Vite + Node HTTP server + better-sqlite3 + C# WinForms WebView2 Launcher。

---

## 6. docs/TASK_STATUS.md 要求

用途：记录当前任务和进度。

必须记录当前已通过的验证：

- `node --check`：通过
- `npm run build`：通过
- `npm run dist:win`：通过
- Windows 安装包生成：通过
- 桌面快捷方式创建：通过
- 双击启动：通过
- 未打开外部浏览器：通过
- UI 运行在 WebView2 桌面窗体内：通过
- 不显示 localhost 地址栏：通过
- UI 不暴露 localhost：通过
- 进程层使用随机 `127.0.0.1` 本地端口作为 WebView2 内部服务
- 命令行窗口未显示：通过，Node 子进程 `CreateNoWindow=true`
- 原 `fleshout.db` 修改时间未变：`2026-06-16T09:54:00.7274080Z`

还要记录：

- 当前 UI 优化进展
- 当前待验证项
- 当前遗留问题
- 下一步建议

---

## 7. docs/ARCHITECTURE_MAP.md 要求

用途：文件职责地图，减少 Agent 乱读上下文。

必须包含：

| 文件 / 目录 | 职责 |
|---|---|
| `src/main.tsx` | 当前前端主入口，包含多数页面和状态逻辑，文件较大，修改需谨慎 |
| `src/styles.css` | 当前全局样式和页面样式，包含 rewrite 页面布局 |
| `server/index.js` | Node API、数据库、AI 调用、原库只读、sidecar 写入 |
| `scripts/build-iexpress.ps1` | Windows Setup 构建脚本，实际生成 C# WinForms + WebView2 安装器 |
| `package.json` | 构建命令入口 |
| `data/continuations.db` | sidecar 数据库 |
| `dist/` | 前端构建产物 |

并写明：

### 修改小说改写页面时，优先读

- `src/main.tsx` 中 `RewritePage` 相关区域
- `src/styles.css` 中：
  - `.rewrite-pipeline-grid`
  - `.metrics-grid`
  - `.chapter-nav-panel`
  - `.pipeline-side`

### 修改小说续写页面时，优先读

- `src/main.tsx` 中 `ContinuationPage` 相关区域
- `src/styles.css` 中 continuation 相关样式

### 修改 WebView2 安装器时，优先读

- `scripts/build-iexpress.ps1`
- `package.json`
- `docs/QUALITY_GATES.md`
- 如存在 `docs/BUILD_AND_PACKAGE.md`，也要读取

### 修改数据库路径时，优先读

- `server/index.js`
- `docs/CURRENT_FACTS.md`
- `docs/TROUBLESHOOTING.md`

### 修改模型 / 提示词时，优先读

- `src/main.tsx` 中 `ModelsPage` / `PromptsPage`
- `server/index.js` 中 models / prompt_templates 相关接口

---

## 8. docs/QUALITY_GATES.md 要求

用途：质量门禁。

每次代码修改后至少执行：

```powershell
node --check server/index.js
npm run build
```

每次安装器修改后执行：

```powershell
npm run dist:win
```

每次 UI 布局修改后至少检查：

- 1366×768
- 1400×900
- 1920×1080
- 页面无横向滚动
- 统计卡片不竖排
- 左侧章节导航可读
- 右侧统计不挤压主内容
- WebView2 窗口内显示正常

如果暂时不能自动化截图，请在文档中标记为手工验收项。  
后续建议补 Playwright 视觉回归。

---

## 9. docs/TROUBLESHOOTING.md 要求

用途：常见问题与解决办法。

至少沉淀以下问题：

### 问题 1：文档过时导致 Agent 判断错误

需要写清：

- 原因
- 风险
- 处理规则

### 问题 2：WebView2 页面与原应用显示不一致

需要写清：

- 现象
- 原因
- 排查顺序
- 建议修复

### 问题 3：RewritePage 三栏布局被挤压

需要写清：

- 现象
- 当前相关样式：
  - `.rewrite-pipeline-grid`
  - `.metrics-grid`
  - `.chapter-nav-panel`
  - `.pipeline-side`
- 建议方向：
  - 大屏三栏
  - 中屏两栏，右侧统计下移
  - 小屏单列
  - `metrics-grid` 使用 `auto-fit + minmax`，避免统计卡片竖排

### 问题 4：scripts/build-iexpress.ps1 名称与实际用途不完全一致

需要说明：

- 当前实际是自定义 C# Setup 生成流程
- 后续可考虑改名为 `build-setup.ps1`

### 问题 5：递归打包整个 data 导致长路径失败

需要写清：

- 原因：`data/user-projects/.../.fleshout-workspace/exports/...` 路径过长
- 当前策略：
  - 只携带 `data/continuations.db`
  - 不打包用户工程缓存

### 问题 6：server/index.js 默认原库路径硬编码到当前用户 fleshout.db

需要写清：

- 影响：换机器或换用户可能失效
- 建议：
  - 后续做成首次启动配置项
  - 保存到 `%LOCALAPPDATA%\FleshOut-Compatible-App\config.json`

### 问题 7：desktop/main.cjs 未被安装版使用

需要写清：

- 影响：原桌面入口逻辑没有生效
- 当前事实：安装版使用 C# WinForms + WebView2 壳

### 问题 8：localhost 暴露问题

需要写清：

- UI 不显示 localhost
- 进程层使用随机 `127.0.0.1` 本地端口作为 WebView2 内部服务

### 问题 9：命令行窗口显示问题

需要写清：

- Node 子进程必须 `CreateNoWindow=true`
- 当前安装版已验证未显示命令行窗口

---

## 10. docs/CHANGELOG_AGENT.md 要求

用途：历史操作日志，仅追溯，不作为当前事实依据。

请追加本次文档治理记录。  
不要删除历史记录。

建议格式：

```markdown
## 2026-06-17 文档治理与低上下文接手优化

### 修改内容

### 验证结果

### 遗留问题

### 下一步建议
```

---

## 11. 请沉淀这些 UI 优化建议

当前 RewritePage 布局关注点：

- `src/styles.css` 中 `.rewrite-pipeline-grid` 当前为三栏布局。
- WebView2 默认窗口下容易挤压中间内容。
- 不建议只靠放大窗口解决。
- 应该修响应式布局。

建议方向：

- 大屏：三栏布局。
- 中屏：两栏布局，右侧统计下移。
- 小屏：单列布局。
- `metrics-grid` 使用 `auto-fit + minmax`，避免统计卡片竖排。
- WebView2 默认窗口可保持 `1360×860` 或调整为 `1400×900`。
- 最小窗口建议不低于 `1280×800`。
- WebView2 `ZoomFactor` 建议固定为 `1.0`。

---

## 12. 请沉淀这些代码结构优化建议

当前 `src/main.tsx` 文件过大，后续建议分阶段拆分，降低 Codex 上下文读取量。

建议结构：

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

注意：

- 本次任务只沉淀建议，不要直接大规模重构。
- 如需拆分代码，请先单独提出方案，不要在本次任务直接执行。

---

## 13. 完成后请执行或说明验证

如本次只改文档，可以不执行完整安装包构建，但至少检查：

- 文档文件是否创建成功
- 文档中路径是否正确
- 是否存在明显冲突

如修改了代码，则必须执行：

```powershell
node --check server/index.js
npm run build
```

如修改了安装器脚本，则必须执行：

```powershell
npm run dist:win
```

---

## 14. 完成后输出格式

请按以下格式输出：

```markdown
## 已完成

## 修改文件

| 文件路径 | 修改内容 | 修改原因 |
|---|---|---|

## 当前有效事实

列出你确认后的当前项目事实。

## 发现的过时/冲突记录

列出旧文档中容易误导 Agent 的内容，并说明如何处理。

## 质量门禁

说明本次是否执行：

- node --check server/index.js
- npm run build
- npm run dist:win

如果没有执行，请说明原因。

## 后续建议

列出下一步最值得做的 3 件事。
```
