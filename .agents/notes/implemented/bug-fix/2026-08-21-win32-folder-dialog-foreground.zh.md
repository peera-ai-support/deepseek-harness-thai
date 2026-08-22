# Agent Note: Windows native folder dialog takes foreground from the GUI process

Status: implemented

[English](2026-08-21-win32-folder-dialog-foreground.md) | 中文

## Problem

在 Windows 上点击「添加工作区」看起来没有反应：点击已被处理，`host.pickDirectory` 在隐藏的 Node 子进程中打开 `IFileOpenDialog`，而 `Show(NULL)` 无法从收到点击的浏览器或 WebView2 抢走前台。选择器停在该窗口后面（或根本不绘制）。选择请求一直挂起，因此 `flowBusy` 会让之后的点击也无效。[移除 PowerShell 回退](../simplification/2026-08-04-drop-windows-powershell-picker-fallback.zh.md) 之后，这是唯一的原生 win32 层级。

## Decision

`loadWin32DialogBindings` 创建一个短生命周期、1×1、位于屏幕外的 `STATIC` 窗口（`WS_EX_TOPMOST | WS_EX_TOOLWINDOW`），把对话框线程附着到当前前台线程，销毁该窗口，再调用 `IFileOpenDialog::Show(NULL)`。这个临时窗口不得活过 `Show`：中止会向对话框线程上的每个窗口投递 `WM_CLOSE`，若在模态 `Show` 期间毁掉 owner，子进程会在报告结果之前退出。若创建窗口得到空句柄，仍调用 `Show(NULL)`，只是不做抢前台。中止仍向对话框线程投递 `WM_CLOSE`。

WebView2 桌面封装额外钉死 browse 交互（通过 `dsh web --patch` 加载 `desktop-host/pin-browse-picker.overlay.yml`），使该封装使用应用内目录对话框，而不依赖操作系统前台规则。该 overlay 与 `apps/web/tests/pin-browse-picker.overlay.yml` 一致。若桌面端口上已有未带 overlay 的服务器在听，仍使用 `-auto`（回环 win32 上为 native）；owner 窗口路径覆盖该进程。

## Alternatives considered

**依赖「对话框是子进程的第一个窗口」来激活。** 否决：子进程以 `windowsHide` 启动，GUI 进程持有最近一次输入，Windows 前台锁会把 `Show(NULL)` 留在该 GUI 后面。

**在每次 win32 启动时把 `-auto` 解析为 `browse`。** 否决：本机终端里带可见显示的 `dsh web` 仍需要操作系统选择器；缺陷是 HWND 归属，不是后端种类。

**由 WebView2 进程自己显示 `IFileOpenDialog`。** 否决：这会在 directory-picker 能力以及已经拥有路径的 Node 宿主之外再实现一套选择器。

**让原生流程占用者显示应用内「正在等待系统对话框」模态框。** 作为主修复被否决：它不会把选择器抬到前面，而且在 browse 占用者上会与应用内对话框叠在一起。

## Consequences

Windows 上一次成功的原生选择现在依赖对话框子进程中的 `CreateWindowExW` 与 `AttachThreadInput`；测试在假 koffi 世界中覆盖 `Show(NULL)` 前后的临时窗口创建/销毁以及空句柄回退。在此变更之前已挂起的选择必须关掉隐藏选择器（Alt+Tab 到 Node）或重启宿主才能取消。browse 钉死只作用于传入该 overlay 的桌面启动器；不带 `--patch` 的 `pnpm dsh web` 仍使用 `-auto`。
