# Agent Note: the in-app updater over a Typert Remote namespace

Status: implemented

English | [中文](2026-09-13-in-app-updater-typert-remote.zh.md)

## Problem

The fork's in-app updater shipped as `host.updateCheck` and `host.updateApply` inside `packages/host/apiproxy`, which upstream replaced with the `packages/api/*-controller` packages, so the port parked it and the About surface lost both the installed-version facts and the release check. Upstream's Electron desktop application owns its own updater for a different product line and cannot serve the WinForms desktop wrapper, whose installation is a pnpm workspace checkout.

## Decision

`@deepseek-ai/dsh-api-app-update-controller` owns the generated `ctx.remote.appUpdate` namespace. `info()` reports the checkout's version and root, `check()` fetches tags and compares the running version against the newest release tag on the remote-advertised default branch without touching the working tree, and `apply()` fetches again, resolves the tag at apply time, detaches the working tree at it, then runs `pnpm install` and `pnpm build`. Every stage has its own ceiling from `Config` (`readTimeoutMs`, `applyTimeoutMs`), every refusal names its stage (`update/not-a-checkout`, `update/git-unavailable`, `update/fetch-failed`, `update/no-release-tag`, `update/checkout-failed`, `update/install-failed`, `update/build-failed`), and each child process runs under the scrubbed parent environment.

The git and pnpm calls live in `src/update.ts` behind injected runners, so stage sequencing and release resolution are unit-tested without a checkout. `ui-settings-general` seats the About section again and drives the namespace through the operations face its plugin body builds, so failure codes and wire names stay out of the component.

## Alternatives considered

**Extend `settings-controller` with an update namespace.** Rejected: the updater reads a git checkout and runs package-manager commands, which is none of the settings seam's subject.

**Run the update in the desktop host (C#).** Rejected: that host is a window and process supervisor, and putting release logic there would duplicate the checkout resolution the Node server already owns.

**Keep the work inside a revived `host/apiproxy`.** Rejected: upstream deleted that assembly, so a private copy would mount a second BFF beside `packages/api/*-controller`.

**Shell out to a separate updater helper binary.** Rejected: it adds a second process and an IPC surface for one checkout operation the server process can perform itself.

## Consequences

An update still rewrites the working tree and ends with a restart, and only a pnpm checkout holding a `.git` can be updated at all — an installed archive keeps the `update/not-a-checkout` refusal. The package re-introduces host Remote surface upstream does not have, so it is fork surface accounted for in the Cordis catalog (`SERVICE_PAGE`, signature type links) and the capability graph whenever it changes.
