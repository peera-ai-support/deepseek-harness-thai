---
description: "Host Remote owner for the in-app update check and apply over a git checkout."
kind: "package-reference"
---
# App Update Controller

English | [中文](README.zh.md)

## Summary

`@deepseek-ai/dsh-api-app-update-controller` exposes the generated `ctx.remote.appUpdate` namespace for the About surface: the installed checkout's version and root, a read-only check against the newest release tag on the remote's default branch, and an apply that detaches the working tree at that tag, installs dependencies, and builds them. Every stage is bounded by its own ceiling, and each refusal names the stage that failed.

## Table of Contents

- [Use this package](#use-this-package)
- [Configuration](#configuration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this package as a Loader entry in a profile whose About surface offers updates. The namespace is registered even when the installation is not a checkout, so `check` and `apply` answer with the `update/not-a-checkout` refusal that tells the reader what to install instead. The package adds no update route of its own: the release repository decides what a release tag is, and every method reads that remote.

The methods exchange JSON values only. `info()` reports the running version and the checkout root. `check()` fetches tags and compares the running version against the newest release tag on the remote-advertised default branch, returning that version or null when the branch carries no reachable tag. `apply()` fetches again, resolves the tag at apply time, detaches the working tree at it, runs `pnpm install`, then `pnpm build`, and reports the applied version.

Refusals are the stages a caller can tell apart: `update/not-a-checkout`, `update/git-unavailable`, `update/fetch-failed`, `update/no-release-tag`, `update/checkout-failed`, `update/install-failed`, and `update/build-failed`, each carrying the message its process produced. The child processes run under the scrubbed parent environment, so no credential-shaped variable reaches a fetch, install, or build.

-----

<a id="configuration"></a>
## Configuration

| Field | Default | Meaning |
|---|---|---|
| `applyTimeoutMs` | 1800000 | Per-command ceiling for the checkout, install, and build stages |
| `readTimeoutMs` | 60000 | Per-command ceiling for the tag fetch and release resolution |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-api-app-update-controller) is the exhaustive source for accepted fields and their JSDoc.

-----

<a id="model-experience"></a>
## Model Experience

None, as the updater is Host and browser state and registers no prompt, tool, or session event.

#### KV Cache effect

No direct effect; checking or applying a release does not alter model requests already in flight.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The updater acts only on a pnpm-workspace checkout holding a `.git`; an installed archive cannot be updated in place.
- Applying a release rewrites the working tree, so the running app must be restarted afterwards, and a local modification is lost at the detached checkout.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The git and pnpm process calls are the package's only side effects, and each one belongs to the stage its refusal names.
