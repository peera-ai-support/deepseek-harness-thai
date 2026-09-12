---
description: "Host Remote owner for the in-app update check and apply over a git checkout."
kind: "package-reference"
---
# App Update Controller

[English](README.md) | 中文

## Summary

`@deepseek-ai/dsh-api-app-update-controller` 为 "关于" 界面提供生成的 `ctx.remote.appUpdate` 命名空间：已安装检出的版本与根目录、对远端默认分支上最新 release tag 的只读检查，以及一次应用——在該 tag 上分离工作树、安装依赖并构建。每个阶段都有自己的时间上限，每种拒绝都指明失败的阶段。

## Table of Contents

- [Use this package](#use-this-package)
- [Configuration](#configuration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

把本包作为 Loader 条目挂载到提供更新能力的 profile 中。"关于" 界面使用它。即使安装不是检出目录，该命名空间也会注册，因此 `check` 与 `apply` 会以 `update/not-a-checkout` 拒绝作答，告诉读者应改用哪种安装方式。本包不新增自己的更新路由：release tag 的含义由发布仓库决定，所有方法都读取该远端。

这些方法只交换 JSON 值。`info()` 报告当前版本与检出根目录。`check()` 抓取 tag，并把当前版本与远端通告的默认分支上的最新 release tag 比较，返回该版本；当该分支上没有可达 tag 时返回 null。`apply()` 再次抓取，在应用时解析 tag，在其上分离工作树，依次运行 `pnpm install` 与 `pnpm build`，并报告已应用的版本。

拒绝是调用方能够区分的阶段：`update/not-a-checkout`、`update/git-unavailable`、`update/fetch-failed`、`update/no-release-tag`、`update/checkout-failed`、`update/install-failed` 与 `update/build-failed`，各自携带其进程产生的消息。子进程在已清洗的父环境中运行，因此任何形似凭据的变量都不会到达抓取、安装或构建。

-----

<a id="configuration"></a>
## Configuration

| Field | Default | Meaning |
|---|---|---|
| `applyTimeoutMs` | 1800000 | 检出、安装与构建各阶段的单命令上限 |
| `readTimeoutMs` | 60000 | tag 抓取与 release 解析的单命令上限 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-api-app-update-controller)是已接受字段及其 JSDoc 的完整来源。

-----

<a id="model-experience"></a>
## Model Experience

None, as the updater is Host and browser state and registers no prompt, tool, or session event.

#### KV Cache effect

No direct effect; checking or applying a release does not alter model requests already in flight.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 更新器只对带有 `.git` 的 pnpm workspace 检出生效；已安装的压缩包无法就地更新。
- 应用 release 会重写工作树，因此运行中的应用必须在之后重启，而未提交的本地修改会在分离检出处丢失。

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The git and pnpm process calls are the package's only side effects, and each one belongs to the stage its refusal names.
