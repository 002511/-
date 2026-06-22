# FleshOut Compatible App 第一版说明

> 历史记录 / 部分过时：本文是第一版 Web 原型说明。2026-06-18 起，当前事实请优先读取 `AGENTS.md` 和 `docs/CURRENT_FACTS.md`。
> 文中“当前目标是先做出可用 Web 原型，后续再考虑 Tauri 打包”的定位已废弃；当前目标是 Windows 安装版 + C# WinForms WebView2 桌面壳。

这是基于 FleshOut 逆向结构重做的第一版可运行应用。当前目标是先做出可用 Web 原型，后续再考虑 Tauri 打包。

## 启动

```powershell
$app='E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\修改\[sxsy.org]FleshOut——AI加料小说详尽教程及软件\FleshOut-Compatible-App'
Set-Location -LiteralPath $app
npm run dev
```

访问：

```text
http://127.0.0.1:5178
```

构建检查：

```powershell
npm run build
```

## 当前模块

- 小说改写
  - 读取原 FleshOut 项目。
  - 支持导入 TXT 创建自建项目。
  - 展示章节、阶段状态、工作区统计。
- 小说续写
  - 选择章节。
  - 分析全书上下文。
  - 生成续写大纲。
  - 提取本章记忆。
  - 生成记忆包。
  - AI 生成单章续写。
  - 审查续写草稿。
  - 保存续写。
  - 将保存的续写确认为正式章节并写入记忆中心。
  - 导出原文 + 续写。
- 记忆中心
  - 查看章节快照数。
  - 查看人物状态、角色认知、伏笔、时间线、正史设定。
  - 支持提取最近 5 章记忆。
- 模型管理
  - 读取原 FleshOut 模型。
  - 新增 sidecar 模型。
  - 编辑/删除 sidecar 模型。
  - 设置默认模型。
  - 测试连接。
- 提示词管理
  - 读取原 FleshOut 提示词。
  - 导入 sidecar 提示词。
  - 编辑/删除 sidecar 提示词。
  - 已预留 AI 续写提示词字段，包含全书分析、续写大纲、单章续写、续写审查。

## 数据位置

原 FleshOut 数据库只读：

```text
C:\Users\Admin\AppData\Roaming\com.fleshout.app\fleshout.db
```

本应用 sidecar 数据库：

```text
FleshOut-Compatible-App\data\continuations.db
```

自建项目目录：

```text
FleshOut-Compatible-App\data\user-projects\<project-id>\.fleshout-workspace
```

原 FleshOut 项目工作区仍按原路径读取：

```text
E:\测试\数据\测试3\Reader_v2.0.0.4_x64 (2)\更新xs合集@温华\202605\0504\.fleshout-workspace
```

## 第一版使用流程

### 自建项目

1. 进入 `小说改写`。
2. 点击 `导入TXT项目`。
3. 输入项目名并粘贴 TXT 正文。
4. 应用会自动拆章并创建 `.fleshout-workspace/chapters/`。

### AI 续写

1. 进入 `模型管理`，添加并测试模型。
2. 设置默认模型。
3. 进入 `小说续写`，选择项目和基准章节。
4. 可选：点击 `分析全书` 和 `生成大纲`。
5. 点击 `提取本章记忆`。
6. 点击 `生成记忆包`。
7. 点击 `AI生成单章`。
8. 可选：点击 `审查草稿`，检查人设、时间线、伏笔、设定和节奏风险。
9. 编辑正文后点击 `保存续写`，此时内容仍是草稿，不会污染后续记忆。
10. 在 `已保存续写` 中点击 `确认正式`，应用会把该续写作为正式章节摄取进记忆中心。
11. 点击 `导出原文+续写`。

### 记忆中心

1. 进入 `记忆中心`。
2. 点击 `提取最近5章`。
3. 等待模型提取章节快照。
4. 回到 `小说续写` 生成记忆包，续写时会自动注入这些记忆。
5. 保存续写后，只有点击 `确认正式` 的续写才会进入记忆中心。

## 注意事项

- 当前没有修改 `fleshout.exe`。
- 当前不会写入原 FleshOut 数据库。
- `提取本章记忆`、`提取最近5章`、`分析全书`、`生成大纲`、`AI生成单章`、`审查草稿`、`确认正式` 都会真实调用模型。
- `确认正式` 会写入 sidecar 数据库和 `_context/memory/`，但不会写入原 FleshOut 数据库。
- 第一版 TXT 导入是粘贴文本，不是系统文件选择器。
- 第一版拆章规则较保守，后续可做自定义拆章规则。
- Tauri 桌面打包需要 Rust/Cargo 环境，当前先保持 Web 原型。
