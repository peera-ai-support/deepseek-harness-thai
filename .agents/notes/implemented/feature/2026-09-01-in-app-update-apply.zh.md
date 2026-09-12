# Agent Note: 应用内更新（检出 release tag，再 pnpm install/build）

Status: implemented

[English](2026-09-01-in-app-update-apply.md) | 中文

## 问题

泰语 Windows 桌面应用以 ZIP 下载方式分发，因此安装后的副本没有 `.git`。"关于"页的更新检查（`host.updateCheck`）既看不到更新的发行版，也无法应用它们：在非仓库目录上执行 `git fetch --tags` 会报错，当时也没有执行更新的 RPC。另有两个潜伏缺陷让既有检查不可靠：解析最新发行版时硬编码了 `origin/master`（发布仓库的默认分支是 `thai`），而 tag 规范化只剥离 `dsh-v`/`v`，没有剥离发布仓库使用的 `thai-` 前缀——于是检查拿 `thai-0.1.1-rc.2` 与 `0.1.1-rc.2` 比较，在没有更新时报告出幽灵更新。

## 决策

把发行版安装方式从 ZIP 改为 `git clone`，使安装后的副本成为检出目录，并新增 `host.updateApply` 就地执行更新：

- `git fetch origin --tags`，然后从远端通告的默认分支解析最新 release tag（`git ls-remote --symref origin HEAD` → `git describe --tags --abbrev=0 origin/<branch>`），绝不硬编码。
- `git checkout --detach <tag>`，接着 `pnpm install`，再 `pnpm build`——每条命令各有 30 分钟上限（`UPDATE_APPLY_TIMEOUT`）。
- 在 Windows 上，node 无法直接 spawn pnpm 的 shim（`pnpm.cmd` → EINVAL，裸 `pnpm` → ENOENT），因此该命令被包进 `cmd.exe /c`；POSIX 则在 `sh -c` 下运行。
- 工作树被切换到该 tag 的发行版；用户关闭并重新打开应用以运行新二进制。C# 桌面宿主无需改动，因为 `updateApply` 在 Node 服务器内运行，而其既有 Job Object 仍会在退出时回收进程树。

`host.updateCheck` 在同一组原语上重写（`requireCheckout`、绑定上下文的 `git` runner、`resolveLatestReleaseTag`），从而修掉上述两个缺陷：默认分支动态解析，且 `normalizeVersionTag` 也会剥离 `thai-`。

业务失败是带类型的 RPC 码（`no-release-tag`、`update-checkout-failed`、`update-install-failed`、`update-build-failed`），各自带有供界面显示的消息。"关于"页（"เกี่ยวกับแอป"）在有可用更新时显示"อัปเดตเลย"（Update now）按钮，并按新的语言包键渲染进行中／已应用／失败状态。

## 曾考虑的替代方案

- **下载 ZIP 并替换文件（维持现状）：**否决，因为没有 `.git` 可供比对，也无法运行 release tag 检出；更新只能变成手工替换文件。
- **用 `git pull origin <default-branch>` 代替检出 tag：**否决，因为拉取分支顶端是移动目标，可能落在未发布的提交状态上；release tag 才是预期的固定状态。
- **在 C# 宿主或辅助进程中执行更新：**否决，因为没有必要——`updateApply` 本就在宿主的 Node 服务器下运行，而宿主的进程树清理已经覆盖重启，无需新增 IPC 界面。

## 后果

- 用户通过 `git clone` 安装进行更新；一次发行版以原子方式应用（checkout → install → build），旧的 ZIP 安装路径不再自更新（ZIP 安装仍会显示检查，但会以 `not-a-git-checkout` 失败）。
- 构建步骤在已清洗的父环境中运行，因此形状像凭据的父进程变量不会传给 `pnpm`。
- 更新由用户节奏驱动且可被调用方取消（`caller-signal-only` unary，无 deadline）——缓慢的 monorepo 安装或构建不会再触发 unary 超时，但在完成前会阻塞"关于"界面。
- `host.updateCheck` 现在能在非 `master` 默认分支上、以及带 `thai-` 前缀的 tag 上报告真正的最新发行版。
