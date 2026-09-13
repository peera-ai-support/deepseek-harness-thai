# Agent Note: MCP 服务器管理落在 Typert Remote 控制器上

Status: implemented

[English](2026-09-13-mcp-configuration-remote.md) | 中文

## 问题

分支的 MCP 设置管理器原本存在于 `packages/host/apiproxy`，形式是一个 `mcp` ApiProxy 领域加上 `mcp-config.ts`；实时连接状态则来自 mcp-client 实例发布在根上下文上的存储。上游用 `packages/api/*-controller` 取代了这套装配，因此移植把管理器暂缓、并移除了该状态存储——"设置"页失去了添加 MCP 服务器的途径，而状态约定也失去了唯一的消费方。

## 决策

`@deepseek-ai/dsh-api-mcp-controller` 拥有生成的 `ctx.remote.mcp` 命名空间，建立在移植过来的 `mcp-config.ts` 之上：`listServers` 不丢信息地报告 `$DSH_HOME/cordis.patch.yml` 的受管理行；`upsertServer` 校验并重写一行，同时保留所有外来行与注释；`removeServer` 删除一行；`status` 报告已挂载 mcp-client 实例发布的状态；`importSecret` 把粘贴进来的密钥存入用户作用域环境，使其绝不落进文件。写入经由临时文件加重命名，因为组合会从该补丁文件热重载。

mcp-client 重新发布每台服务器的阶段：监督器通过 `startConnection` 的 sink 与 `syncTools` 的发现回调写入根作用域的 `McpStatusStore`，由本控制器读取，而不是由已删除的 BFF 读取。`ui-settings-general` 重新安置 MCP 区块，并通过插件主体构建的操作界面驱动该命名空间，整个界面沿用分支的泰语文案。密钥写入的上限是一个 `Config` 字段；非 Windows 宿主会拒绝写入，而不是存下一个下次启动读不到的变量。

## 曾考虑的替代方案

**继续暂缓管理器。** 否决：那样添加 MCP 服务器就得手写补丁文件，而这正是 env 引用写法最容易出错的地方。

**把管理器搬进桌面宿主（C#）。** 否决：宿主是窗口监管者，而补丁文件属于 Node 服务器所拥有的组合。

**把密钥以字面量存进补丁文件。** 否决：该文件会提交进仓库，并被每个 profile 读取。

**让区块自己去轮询每台服务器的状态。** 否决：阶段、尝试次数与已发现工具都是监督器状态；客户端探测回答的是另一个问题，并会重复建立连接。

## 后果

保存的行即刻生效，因此格式错误的行可能破坏下一次加载，直到被修复——校验与原子重写正是为了缩小这个窗口。密钥存储仅在 Windows 上实现，且没有任何方法会返回已存取值。状态列表只覆盖已挂载的实例，因此已配置但尚未加载的服务器是缺失，而不是"未知"。该包、状态存储与区块都是分支自有界面，已在 Cordis catalog、能力图与各包 README 中记账。
