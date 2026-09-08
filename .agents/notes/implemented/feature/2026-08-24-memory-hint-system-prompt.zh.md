# Agent Note: 系统提示词中的记忆提示（自动查询 MCP 记忆服务器）

Status: implemented

[English](2026-08-24-memory-hint-system-prompt.md) | 中文

## 问题

MCP 记忆服务器（官方 `@modelcontextprotocol/server-memory`）已连接且工作正常，但只有用户明确说"用你的记忆"时模型才会查询它。询问先前陈述过的事实（例如电脑配置）时，模型转而进行本地 shell 探测——记忆工具确实存在，但没有任何指令引导模型优先使用。

## 决策

在部署 persona 中添加简短提示（在每处编写 persona 的位置使用相同文本）：

> 当 MCP 记忆服务器可用时，请先检查它：如果本次或此前对话可能记录过相关事实，请搜索记忆图谱并据此作答。当用户陈述持久的个人事实或决策（配置、设置、偏好、选择）时，请先记入记忆图谱。

该提示刻意使用条件句式（"当可用时"）：未挂载记忆服务器的部署不受影响，其余场景模型仍照常使用其常规工具（shell、fs）。

## 影响面

- persona 共有四处、一并更新：`apps/cli/config/agent-presets/standard/agent.cordis.yml`（桌面 Web 应用的默认预设——实际驱动用户会话）、`apps/cli/config/agent-presets/code/agent.cordis.yml`、`packages/bundle/web-app/cordis.patch.yml`、`packages/bundle/headless/cordis.patch.yml`。
- keyless 回放快照 `apps/web/tests/snapshots/fresh-round-trip/system-prompt.expected.md` 同步更新为新 persona（e2e 回放从相同来源组装提示词；其余 acp-agent 快照不含这行短 persona）。

## 后续

- 目录预设保持不变；若日后 harness 默认内置记忆服务器，可将条件句式改为无条件。
