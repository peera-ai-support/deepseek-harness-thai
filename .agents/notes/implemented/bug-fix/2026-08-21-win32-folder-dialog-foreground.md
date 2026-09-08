# Agent Note: Windows native folder dialog takes foreground from the GUI process

Status: implemented

English | [中文](2026-08-21-win32-folder-dialog-foreground.zh.md)

## Problem

`Add workspace` on Windows looks dead: the click is handled, `host.pickDirectory` opens `IFileOpenDialog` in a hidden Node child, and `Show(NULL)` cannot take foreground from the browser or WebView2 that received the click. The chooser sits behind that window (or never paints). The pick stays pending, so `flowBusy` keeps later clicks inert. The [PowerShell-fallback removal](../simplification/2026-08-04-drop-windows-powershell-picker-fallback.md) left this as the only native win32 tier.

## Decision

`loadWin32DialogBindings` creates a short-lived 1×1 off-screen `STATIC` window (`WS_EX_TOPMOST | WS_EX_TOOLWINDOW`), attaches the dialog thread to the current foreground thread, destroys that window, then calls `IFileOpenDialog::Show(NULL)`. The dummy window must not outlive `Show`: abort posts `WM_CLOSE` to every window on the dialog thread, and destroying an owner under a modal `Show` exits the child before it can report. If window creation returns a null handle, the binding still calls `Show(NULL)` without the steal. Abort still posts `WM_CLOSE` to the dialog thread.

The WebView2 desktop wrapper additionally pins the browse interaction (`desktop-host/pin-browse-picker.overlay.yml` via `dsh web --patch`) so that wrapper uses the in-app directory dialog, which does not depend on OS foreground rules. The overlay matches `apps/web/tests/pin-browse-picker.overlay.yml`. A server already listening on the desktop port without the overlay still uses `-auto` (native on loopback win32); the owner-window path covers that process.

## Alternatives considered

**Rely on “the dialog is the child's first window” for activation.** Rejected: the child is spawned with `windowsHide`, the GUI process holds the last input, and Windows foreground lock then keeps `Show(NULL)` behind that GUI.

**Switch `-auto` to `browse` on every win32 boot.** Rejected: a local terminal `dsh web` with a visible display still wants the OS chooser; the activation defect is HWND ownership, not the backend kind.

**Have the WebView2 process show `IFileOpenDialog` itself.** Rejected: it would add a second picker implementation outside the directory-picker capability and the Node host that already owns the path.

**Show an in-app “waiting for the system dialog” modal from the native flow occupant.** Rejected as the primary fix: it would not raise the chooser, and a stacked modal would fight the browse dialog on that occupant.

## Consequences

A successful native pick on Windows now depends on `CreateWindowExW` plus `AttachThreadInput` in the dialog child; tests cover dummy-window create/destroy around `Show(NULL)` and the null-handle fallback against the fake koffi world. A pick that started before this change and is still pending must be cancelled by dismissing the hidden chooser (Alt+Tab to Node) or restarting the host. The browse pin applies only to desktop launchers that pass the overlay; `pnpm dsh web` without `--patch` keeps `-auto`.
