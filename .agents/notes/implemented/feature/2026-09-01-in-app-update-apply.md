# Agent Note: in-app update (checkout release tag, then pnpm install/build)

Status: implemented

English | [中文](2026-09-01-in-app-update-apply.zh.md)

## Problem

The Thai Windows desktop app shipped as a ZIP download, so an installed copy had no `.git`. The About page's update check (`host.updateCheck`) therefore could neither see newer releases nor apply them: `git fetch --tags` on a non-repo errors, and there was no RPC to perform an update. Two latent bugs also made the existing check unreliable: the latest release was resolved with a hardcoded `origin/master` (the publish repo's default branch is `thai`), and tag normalization only stripped `dsh-v`/`v`, not the `thai-` prefix the publish repo uses — so the check compared `thai-0.1.1-rc.2` against `0.1.1-rc.2` and reported a phantom update when none existed.

## Decision

Switch release installs from ZIP to `git clone` so an installed copy is a checkout, and add `host.updateApply` that runs the update in place:

- `git fetch origin --tags`, then resolve the newest release tag from the remote's advertised default branch (`git ls-remote --symref origin HEAD` → `git describe --tags --abbrev=0 origin/<branch>`), never hardcoded.
- `git checkout --detach <tag>`, then `pnpm install`, then `pnpm build` — each under a 30-minute per-command ceiling (`UPDATE_APPLY_TIMEOUT`).
- On Windows, pnpm has no shim node can spawn directly (`pnpm.cmd` → EINVAL, bare `pnpm` → ENOENT), so the command is wrapped in `cmd.exe /c`; POSIX runs it under `sh -c`.
- The working tree is redirected to the tagged release; the user closes and reopens the app to run the new binaries. The C# desktop host needs no change because `updateApply` runs inside the Node server, and its existing Job Object still reaps the process tree on exit.

`host.updateCheck` is rewritten on the same primitives (`requireCheckout`, a bound `git` runner, `resolveLatestReleaseTag`), which fixes both noted bugs: the default branch is resolved dynamically and `normalizeVersionTag` also strips `thai-`.

Business failures are typed RPC codes (`no-release-tag`, `update-checkout-failed`, `update-install-failed`, `update-build-failed`), each with a message for the UI. The About page ("เกี่ยวกับแอป") shows an "อัปเดตเลย" (Update now) button while an update is available, and renders in-progress/applied/failed states from the new locale keys.

## Alternatives considered

- **Download a ZIP and replace files (status quo):** rejected because there is no `.git` to diff against and no way to run a release-tag checkout; an update would have to be a manual blob swap.
- **`git pull origin <default-branch>` instead of checkout a tag:** rejected because pulling the branch tip is a moving target and can land on unreleased commit state; a release tag is the intended, fixed state.
- **Run the update in the C# host or a helper process:** rejected as unnecessary — `updateApply` already runs under the host's Node server, and the host's process-tree teardown covers the restart without a new IPC surface.

## Consequences

- Users update via `git clone` installs; a release is applied atomically (checkout → install → build) and the old ZIP-install path no longer self-updates (a ZIP install still shows the check; it fails as `not-a-git-checkout`).
- The build step runs under the scrubbed parent env, so a credential-shaped parent variable is not passed to `pnpm`.
- Update is user-paced and caller-cancellable (`caller-signal-only` unary, no deadline) — a slow monorepo install/build no longer trips a unary timeout, but it does block the About UI until it completes.
- `host.updateCheck` now reports the true latest release on a non-`master` default branch and for `thai-`-prefixed tags.
