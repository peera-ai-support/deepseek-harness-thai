# Agent Note: the desktop host recovers the single-instance mutex from a windowless process

Status: implemented

English | [中文](2026-09-12-desktop-host-windowless-instance-lock.zh.md)

## Problem

`desktop-host/Program.cs` holds a named mutex so one desktop host owns the WebView2 window, and hands a later launch to the process that already owns it. The handoff did nothing when that process had no main window — crash residue, or a start interrupted before the window existed. The later launch then exited showing nothing, and the residue kept the mutex, so every launch after it repeated the same silent exit until the user ended the process from Task Manager.

## Decision

`ActivateExistingWindow` reports whether it raised a window. A same-name process with no window is terminated in place with `Kill(entireProcessTree: true)`, and the launch then waits up to two seconds for the mutex. A killed owner releases an abandoned mutex, so `AbandonedMutexException` is the expected result of that wait and leaves this process holding it; a wait that times out exits instead of starting a second host. The killed process's server child dies with it through the kill-on-close job object assigned at spawn, so the recovery leaves no orphaned server on the port.

`AppWindow.FormClosed` disposes the WebView and calls `Environment.Exit(0)`. A closed window now ends the process, which is what holds the mutex for exactly as long as a window exists — the invariant this recovery path relies on.

## Alternatives considered

**Wait for the windowless process to publish a window.** Rejected: a start whose window creation already failed does not produce one later, so the launch would block and then fail exactly as it did before.

**Enumerate the process's top-level windows instead of reading `MainWindowHandle`.** Rejected: the P/Invoke sweep reaches hidden windows and windows not yet created, neither of which the handoff can use, and the case that matters — a process with no window at all — is unreachable either way.

**Track the instance through a lock file holding a PID.** Rejected: the kernel releases a mutex when its owner dies, while a lock file needs its own liveness protocol for PID reuse and stale files, and it would still face the same question about what to do with a dead owner.

## Consequences

A launch that finds a windowless same-name process kills it without confirmation, so an unfinished task in that process loses its server child. The mutex wait is bounded at two seconds, so a process that holds the mutex and cannot be killed still ends in a silent exit — the same visible outcome as before. Nothing automated covers this path: `desktop-host/` has no test project and the behavior is Windows process lifecycle, so verification is `dotnet build desktop-host/DeepSeekHarness.csproj` plus a manual launch while a windowless same-name process is present.
