# Agent Note: MCP 服务器管理界面（设置页）

Status: implemented

[English](2026-08-22-mcp-settings-section.md) | 中文

## 问题

MCP 服务器此前需要手动编辑 home 级用户补丁文件（`$DSH_HOME/cordis.patch.yml`）。用户（泰语桌面版）希望在应用内直接管理。这不仅关乎便利性：env 引用头（`!!js '`Bearer ${process.env.GITHUB_TOKEN}`'`）这种配置写法容易手误，而密钥更不应以字面量写进配置文件。

## 决策

新增设置页 "MCP" 区块，由三个 loopback-pin 的 RPC 方法读写 home 补丁文件：

- `mcp.listServers` / `mcp.upsertServer` / `mcp.removeServer` — 新增 `mcp` ApiProxy 域（api/mcp.ts + api/mcp.schema.ts，按六文件流程补齐 map/handler/client 行）。
- `packages/host/apiproxy/src/mcp-config.ts` — 对补丁文本做纯解析/重建/校验。只管理 `name` 为 mcp-client 插件的行；其他行与注释原样保留。写入采用临时文件 + 重命名，避免 HMR 监视器读到半个文件（重写会触发热重载，工具即刻生效）。
- ui-settings-general 中的 `McpSection`（id `mcp`，order 20）— 列表/新增/编辑/删除并带 **实时连接状态**：mcp-client 现通过根作用域的 `McpStatusStore`（status.ts）发布各服务器状态（`connecting`/`connected`/`reconnecting`/`disabled`），由 `mcp.status` 读取；区块每 5 秒轮询并渲染彩色徽标。头部与环境变量值要么是字面量、要么是 env 引用（`kind: 'env'`，含独立的 env 名与前缀字段）；env 引用序列化为 `!!js` 表达式，绝不落明文令牌。

未建模的配置键（如重连超时）以原始 `extra` 行携带并在重写时保留。无法解析的受管行保持原样而不猜测。行 id、serverName 唯一性与传输必填字段（url / command）在触碰文件前于服务端校验。

## 影响面

- 新增 RPC 域 → ApiProxy 聚合、ApiProxyService、IApiClient 及所有测试桩（connection fixture 与 connection/runtime 的 fake-api、client-handler 与 fetch-carrier 的 MOCK API、dispatch 分支）。
- `mcp.*` 加入 PRIVILEGED_METHODS：这些方法读写每个 profile 都会组合的机器级配置文件。
- ui-settings-general 现设三个区块（general、mcp、about）；apply/shell 规格原先断言单一区块，自 About 落地后已过时 — 一并更新。
- host apiproxy 新增依赖 `@deepseek-ai/dsh-home-paths`（尊重 `$DSH_HOME`）。
- 语言包：zh/en/th 新增 `mcp.*` 键，编译期强制一致。

## 曾考虑的替代方案

**继续手写 `$DSH_HOME/cordis.patch.yml`。** 否决：env 引用的写法容易手误，而顺手的做法就是把令牌本身粘贴进去——这正是设置表单要避免的结果。

**把服务器列表放在 settings seam 而不是补丁文件里。** 否决：mcp-client 从 loader 组合中读取它的服务器，因此由设置区块持有的列表无法抵达该插件。

**按区块自身对文件的模型整体重写补丁文件。** 否决：文件里还有本表单未建模的外来行、注释与 mcp-client 键（如重连超时）；管理器只写回自己拥有的行，并且对无法解析的受管行保持原样而不猜测。

**就地写入文件，而不是经由临时文件 + 重命名。** 否决：组合会从该文件热重载，读到半个文件的读取方会启动一棵损坏的树。

## 后果

三个特权 RPC 方法现在会重写每个 profile 都会组合的机器级配置文件，因此一次应用内点击即编辑 loader 树，写坏就可能破坏启动直到被修复；临时文件 + 重命名写入与服务端的唯一性、必填字段校验正是为了缩小这个窗口。状态在区块挂载期间按 5 秒轮询，因此服务器连接或掉线最多晚 5 秒才显示，区块卸载后轮询停止。

## 后续

- 状态在区块挂载期间按 5 秒轮询；如需消除延迟，可改为事件域推送。
