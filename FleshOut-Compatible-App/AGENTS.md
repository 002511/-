# FleshOut-Compatible-App Agent Entry

更新时间：2026-06-18 15:55:00 +08:00

本文件是 Codex / Agent 进入本项目时的第一入口。本项目是人工智能小说 / FleshOut 兼容桌面应用，不是乡行项目。

## 优先读取顺序

每次新窗口接手，先按顺序读取：

1. `AGENTS.md`
2. `docs/CURRENT_FACTS.md`
3. `docs/TASK_STATUS.md`
4. `docs/ARCHITECTURE_MAP.md`
5. `docs/DEVELOPMENT_NOTES.md`
6. `docs/QUALITY_GATES.md`
7. `docs/TROUBLESHOOTING.md`

旧 `README_FIRST_VERSION.md`、旧 `AGENT_MEMORY.md`、历史日志和 `docs/CHANGELOG_AGENT.md` 只能用于追溯，不得覆盖 `docs/CURRENT_FACTS.md`。

## 文档可信度规则

- 判断当前项目状态，以 `docs/CURRENT_FACTS.md` 为最高优先级。
- `docs/CHANGELOG_AGENT.md` 仅用于历史追溯，不作为当前事实依据。
- 旧 README、旧 Agent Memory、历史日志中的内容如果和 `docs/CURRENT_FACTS.md` 冲突，以 `docs/CURRENT_FACTS.md` 为准。
- 不允许只追加新结论而不处理旧结论。
- 旧结论必须标记为 `已废弃`、`历史记录` 或 `待确认冲突`。

## 修改同步规则

- 修改代码后必须同步更新对应文档。
- 当前事实变化：更新 `docs/CURRENT_FACTS.md`。
- 当前任务进度变化：更新 `docs/TASK_STATUS.md`。
- 构建 / 安装器流程变化：更新 `docs/QUALITY_GATES.md` 和相关说明。
- 新增开发经验、前端修改经验或命令坑：优先更新 `docs/DEVELOPMENT_NOTES.md`。
- 新增问题或解决方案：更新 `docs/TROUBLESHOOTING.md`。
- 重要操作完成后：追加 `docs/CHANGELOG_AGENT.md`。

## 安全规则

- 不要写入 token、cookie、password、secret。
- 修改文档前先读取原文，优先增量修改。
- 不确定的信息标记为 `[待确认]`。
- 原 `C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db` 必须只读，不应被本项目写入。
- 真实 AI 调用会消耗外部模型资源；除非用户明确要求或 UI/接口已有 `confirmAiCall: true` 的显式动作，不要主动触发模型调用。

## 路径规则

项目路径包含 `[sxsy.org]`，PowerShell 必须使用 `-LiteralPath`：

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
```
