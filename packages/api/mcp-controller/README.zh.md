---
description: "Host Remote owner for MCP server configuration and live connection status."
kind: "package-reference"
---
# MCP Controller

[English](README.md) | 中文

## 概述

`@deepseek-ai/dsh-api-mcp-controller` 为配置界面提供生成的 `ctx.remote.mcp` 命名空间：home 级用户补丁文件（`$DSH_HOME/cordis.patch.yml`）中的 mcp-client 行、已挂载实例发布的实时连接状态，以及一个用户作用域的密钥存储——用于那些绝不能写进文件的取值。只管理 `name` 为 mcp-client 插件的行；其他所有行与注释在重写时原样保留。

## 目录

- [Use this package](#use-this-package)
- [Configuration](#configuration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

把本包作为 Loader 条目挂载到需要管理 MCP 服务器的设置界面所在的 profile 中。`listServers()` 报告受管理的行及其所在文件，且不丢信息：本编辑器无法解析的行依然会出现，而不会消失。`upsertServer(server)` 在校验身份模式、传输必填字段以及与其他行的唯一性之后，按 `id` 插入或替换一行；`removeServer(id)` 删除一行，id 不存在时是空操作。两次写入都经由临时文件加重命名，因为组合会从该文件热重载——半个写入会启动一棵损坏的树。

`status()` 报告每个已挂载 mcp-client 实例的实时阶段：`connecting`；带已发现工具的 `connected`；带尝试次数与延迟的 `reconnecting`；以及策略被禁用或预算耗尽时的 `disabled`。没有已挂载实例的服务器不会出现在列表中。`importSecret(name, value)` 把粘贴进来的密钥存入用户作用域环境，并返回该行应当引用的名字，因此令牌绝不会落进补丁文件。

拒绝码为 `mcp/unreadable`（文件无法读取或解析）、`mcp/rejected`（校验、唯一性或格式错误的密钥）、`mcp/write-failed` 与 `mcp/secret-write-failed`。

-----

<a id="configuration"></a>
## 配置

| Field | Default | Meaning |
|---|---|---|
| `secretWriteTimeoutMs` | 15000 | 单次用户作用域密钥写入的上限 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-api-mcp-controller)是已接受字段及其 JSDoc 的完整来源。

-----

<a id="model-experience"></a>
## 模型体验

None, as the MCP configuration API is Host and browser state and registers no prompt, tool, or session event.

#### KV Cache 影响

No direct effect; editing a row changes the composition, which the loader applies through its own reload path.

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 用户作用域的密钥存储目前只在 Windows 上实现（`HKCU\Environment`）；其他平台会直接拒绝，而不是写到下次启动读不到的地方。
- 没有任何方法会返回已存储的密钥取值；编辑器只能看到它所引用的环境变量名。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The patch-file writes and the user-environment write are the package's only side effects, and each belongs to the refusal that names it.
