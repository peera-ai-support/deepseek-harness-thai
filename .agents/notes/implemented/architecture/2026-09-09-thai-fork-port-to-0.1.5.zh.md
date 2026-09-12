# Agent Note：泰语分支移植到上游 0.1.5

Status: implemented

[English](2026-09-09-thai-fork-port-to-0.1.5.md) | 中文

## 问题

本分支在 `dsh-0.1.1-rc.2` 之上积累了 15 个提交：泰语本地化、桌面打包、MCP 设置管理器和应用内更新器。上游在 3,225 个提交之后发布了 `dsh-v0.1.5-rc.2`，并重构了宿主层与客户端层：`packages/host/apiproxy` 变为 `packages/api/*-controller`，`ui-conversation/src/client/chat` 变为 `packages/client/ui-chat`，`packages/client/runtime` 被删除，会话日志迁移到 v3。直接合并会产生 345 个冲突文件，并留下引用已删除模块的分支代码，因此这次移植必须逐文件裁决，而不是提交一个合并结果。

## 决策

在独立 worktree 中进行移植（从 `dsh-v0.1.5-alpha.1` 拉出 `thai-0.1.5`，随后向前合并到 `dsh-v0.1.5-rc.2`），使正在运行的 0.1.1 检出及其未提交工作保持不动；随后把 `thai` 合并进来，并按规则裁决：

- **仅版本号冲突的 `package.json`（231 个）** 取上游。分支的版本号在发版时统一改写，而不是逐文件修改。 - **已被取代的功能文件取上游。** 0.1.5 已自带回合导轨（`ui-chat` 的 `TurnNavigator` 与 `turn-rail-items`）、`ui-tool` 的图片卡片、轨迹本地化座位，以及 win32 对话框前台修复；分支中的平行实现直接丢弃，不再合并。 - **上游删除的包**（`host/apiproxy`、`client/runtime`、`examples`、`tool-subagent-report`、`acp-snapshot`）按删除接受。原本位于其中的分支功能（MCP 设置管理器、应用内更新 RPC）暂缓，留待后续移植到 Typert Remote 架构；其客户端 UI 与测试一并暂缓。为该管理器供数的 mcp-client 状态存储（`src/status.ts` 以及 `startConnection` 与 `syncTools` 的 sink 参数）出于同样原因被移除，使 `packages/mcp/mcp-client` 与上游完全一致。 - **泰语本地化保留并重新应用。** `LOCALE_IDS` 本就包含 `th`；缺失的是上游键集变化之后的覆盖率。 - **分支独有修复重新落到上游新代码上**：pi-ai 的“仅思考内容提升为文本”与“内嵌工具调用恢复”落到上游的 `toStreamChunks`（其已自带待处理推理缓冲区）。 - **桌面打包保留。** 分支的 WinForms `desktop-host/` 启动 `apps/cli/lib/bin.js web`，0.1.5 仍然提供该入口；上游自己的 `apps/desktop`（Electron）是另一个产品，未作改动。

## 本地化类型

上游的 `register()` 要求每个已发布语言都提供完整字典。若强制要求泰语，分支之后上游新增的约 15 个 UI 包会直接导致构建失败，因此现在由 `REQUIRED_LOCALE_IDS`（`zh`、`en`）标记必填语言对，泰语槽位为 `Partial`。查找链本就按 key 解析——`th` 回退到 `en`——因此未翻译的 key 显示英文，而不会让构建失败。声明为 `satisfies Record<Key, string>` 的泰语字典已放宽为 `Partial`，其失效 key（上游改名或删除）一并清除。

## 影响面

- 25 个泰语字典，以及 `packages/client/locale`（注册契约、`REQUIRED_LOCALE_IDS`、`th` 语言定义）。 - `packages/bundle/{headless,web-app}/cordis.patch.yml`：上游的 `personaPrefix`/`personaSuffix` 拆分把分支的 MCP 记忆提示放入 suffix。 - `ui-settings-models`：把 `WELCOME_NOTICE_COPY` 及其 import 恢复到 `onboarding-copy.ts`，并将泰语字典放宽为 partial。 - `ui-conversation`：新增 `PLAN_NEXT_ACTION_TH`；`loadThrough` 改为接收 `SessionSeq`，与 session-controller 客户端一致。 - `.gitignore` 保留分支的桌面与生成器构建产物。 - `dsh-v0.1.5-rc.2` 的向前合并有 8 个文件冲突：`directory-picker-native` 的三个对话框模块、`ui-deliverables`、`ui-message-feedback`、`ui-sidebar` 的 `index.ts`、`mcp-client/src/tools.ts`，以及生成的 `THIRD_PARTY_NOTICES.md`。

## 曾考虑的替代方案

**把上游合并进 0.1.1 分支，而不是把分支向前移植。** 否决：该基线比宿主层与客户端层的重构早约 3,200 个提交，因此合并会出现结构性冲突（345 个文件），并留下 import 已删除模块的分支代码；在发版分支上解决这些冲突，等于把一棵无法构建的树摆在用户正在运行的应用前面。

**把泰语本地化做成叠加在上游之上的树外皮肤。** 本次移植否决：每个 UI 包各自携带 `locales.ts`，皮肤需要逐包的接缝，而这些包没有这样的接缝。

**在 0.1.5 上逐项重新实现分支功能。** 否决：25 份泰语字典是分支改动量的主体，面对上游改名后的键集重新翻译，成本高于解决移植本身的冲突。

**把上游删除的包作为私有包继续携带。** 否决：`packages/api/*-controller` 以不同的装配方式拥有同一套 RPC 表面，两者并存会让同一个客户端挂载两份活动注册。

## 后果

这次移植是一条分支，而不是纳入上游历史的合并，因此今后每次上游同步都要重复同样的裁决过程。上游在移植之后新增的键位，泰语一律回退到英文——`Partial` 槽位让 `th` 不进入构建的完整性要求——所以在翻译之前，新界面显示英文。暂缓的 MCP 设置管理器与应用内更新器会让设置页在后续移植落到 `*-controller` 新家之前缺少它们。所得：桌面应用运行在 0.1.5 上，具备会话日志 v3 管线、上游聊天界面与上游的 win32 选择器修复，同时保留泰语本地化与 WinForms 桌面宿主。

## 后续事项

- 把 MCP 设置管理器与应用内更新器移植到 Typert Remote（它们原是 `host/apiproxy` 的领域，新家是 `settings-controller` 旁的 `*-controller` 包）。 - 将暂缓的聊天面板组件（`PromptNavigator`、`ThinkingDock`、`TurnCompletedSteps`、`scratchpad`）接入 `ui-chat`，或改用上游的聊天界面并弃用它们。 - 翻译分支之后上游新增的 UI 包；在泰语语言下它们目前显示英文。
