---
description: "Host Remote owner for MCP server configuration and live connection status."
kind: "package-reference"
---
# MCP Controller

English | [中文](README.zh.md)

## Summary

`@deepseek-ai/dsh-api-mcp-controller` exposes the generated `ctx.remote.mcp` namespace for a configuration surface: the mcp-client rows of the home-level user patch file (`$DSH_HOME/cordis.patch.yml`), the live connection status the mounted instances publish, and a user-scope secret store for values that must not be written into the file. Only rows whose `name` is the mcp-client plugin are managed; every other row and comment survives a rewrite verbatim.

## Table of Contents

- [Use this package](#use-this-package)
- [Configuration](#configuration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this package as a Loader entry in a profile whose Settings surface manages MCP servers. `listServers()` reports the managed rows and the file they live in, losslessly: a row this editor cannot parse still surfaces rather than disappearing. `upsertServer(server)` inserts or replaces one row, matched by its `id`, after validating identity patterns, transport-required fields, and uniqueness against the other rows; `removeServer(id)` deletes one and is a no-op for an absent id. Both writes go through a temporary file and rename, because the composition hot-reloads from that file — a partial write would boot a broken tree.

`status()` reports the live phase of every mounted mcp-client instance: `connecting`, `connected` with the discovered tools, `reconnecting` with the attempt count and delay, and `disabled` for a disabled policy or an exhausted budget. A server with no mounted instance is absent from the list. `importSecret(name, value)` stores a pasted secret in the user-scope environment and returns the name the row should reference, so the token never lands in the patch file.

Refusals are `mcp/unreadable` (the file cannot be read or parsed), `mcp/rejected` (validation, uniqueness, or a malformed secret), `mcp/write-failed`, and `mcp/secret-write-failed`.

-----

<a id="configuration"></a>
## Configuration

| Field | Default | Meaning |
|---|---|---|
| `secretWriteTimeoutMs` | 15000 | Ceiling for one user-scope secret write |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-api-mcp-controller) is the exhaustive source for accepted fields and their JSDoc.

-----

<a id="model-experience"></a>
## Model Experience

None, as the MCP configuration API is Host and browser state and registers no prompt, tool, or session event.

#### KV Cache effect

No direct effect; editing a row changes the composition, which the loader applies through its own reload path.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The user-scope secret store is implemented on Windows (`HKCU\Environment`); another platform refuses rather than writing somewhere the next boot will not read.
- No method returns a stored secret value; the editor sees only the environment-variable name it references.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The patch-file writes and the user-environment write are the package's only side effects, and each belongs to the refusal that names it.
