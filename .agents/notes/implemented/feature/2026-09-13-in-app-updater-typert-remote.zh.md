# Agent Note: 应用内更新器落在 Typert Remote 命名空间上

Status: implemented

[English](2026-09-13-in-app-updater-typert-remote.md) | 中文

## 问题

分支的应用内更新器原本以 `host.updateCheck` 与 `host.updateApply` 的形式存在于 `packages/host/apiproxy`，而上游用 `packages/api/*-controller` 系列取代了它，因此移植把它暂缓，"关于"界面同时失去了已安装版本信息与发布检查。上游的 Electron 桌面应用自带更新器、属于另一条产品线，无法服务于 WinForms 桌面封装——后者是 pnpm workspace 检出。

## 决策

`@deepseek-ai/dsh-api-app-update-controller` 拥有生成的 `ctx.remote.appUpdate` 命名空间。`info()` 报告检出的版本与根目录；`check()` 抓取 tag，并把当前版本与远端通告的默认分支上的最新 release tag 比较，且不触碰工作树；`apply()` 再次抓取、在应用时解析 tag、在其上分离工作树，然后运行 `pnpm install` 与 `pnpm build`。每个阶段都有自己的上限，取自 `Config`（`readTimeoutMs`、`applyTimeoutMs`）；每种拒绝都指明其阶段（`update/not-a-checkout`、`update/git-unavailable`、`update/fetch-failed`、`update/no-release-tag`、`update/checkout-failed`、`update/install-failed`、`update/build-failed`）；每个子进程都在已清洗的父环境中运行。

git 与 pnpm 调用位于 `src/update.ts`，运行器以注入方式提供，因此阶段顺序与 release 解析无需真实检出即可做单元测试。`ui-settings-general` 重新安置了"关于"区块，并通过插件主体构建的操作界面驱动该命名空间，使失败码与 wire 名称留在组件之外。

## 曾考虑的替代方案

**在 `settings-controller` 中扩展一个更新命名空间。** 否决：更新器读取 git 检出并运行包管理器命令，这不属于 settings seam 的主题。

**在桌面宿主（C#）中执行更新。** 否决：该宿主是窗口与进程的监管者，把发布逻辑放进去会重复 Node 服务器已经拥有的检出解析。

**把功能留在重新启用的 `host/apiproxy` 中。** 否决：上游已删除该装配，私有副本会在 `packages/api/*-controller` 旁再挂一个 BFF。

**外部调用一个独立的更新辅助程序。** 否决：为一个服务器进程自己就能完成的检出操作，增加第二个进程和一套 IPC 界面。

## 后果

更新仍会重写工作树并以重启收尾，而且只有带 `.git` 的 pnpm 检出才能更新——已安装的压缩包会一直得到 `update/not-a-checkout` 拒绝。该包重新引入了上游没有的宿主 Remote 界面，因此它是分支自有界面：每当它变化，都必须在上游的 Cordis catalog（`SERVICE_PAGE`、签名类型链接）与能力图中记账。
