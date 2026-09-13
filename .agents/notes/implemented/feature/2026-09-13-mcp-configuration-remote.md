# Agent Note: MCP server management over a Typert Remote controller

Status: implemented

English | [中文](2026-09-13-mcp-configuration-remote.zh.md)

## Problem

The fork's MCP settings manager lived in `packages/host/apiproxy` as an `mcp` ApiProxy domain plus `mcp-config.ts`, and the live connection status came from a store the mcp-client instances published on the root context. Upstream replaced that assembly with `packages/api/*-controller`, so the port parked the manager and dropped the status store, leaving Settings without a way to add an MCP server and removing the only consumer of the status contract.

## Decision

`@deepseek-ai/dsh-api-mcp-controller` owns the generated `ctx.remote.mcp` namespace over the ported `mcp-config.ts`: `listServers` reports the managed rows of `$DSH_HOME/cordis.patch.yml` losslessly, `upsertServer` validates and rewrites one row while preserving every foreign row and comment, `removeServer` deletes one, `status` reports what the mounted mcp-client instances published, and `importSecret` stores a pasted secret in the user-scope environment so it never lands in the file. Writes go through a temporary file and rename because the composition hot-reloads from that patch file.

mcp-client publishes per-server phases again: the supervisor feeds a root-scoped `McpStatusStore` through the `startConnection` sink and the `syncTools` discovery callback, and the store is read by this controller rather than by the deleted BFF. `ui-settings-general` seats the MCP section again, driving the namespace through an operations face built in its plugin body, with the fork's Thai copy for the whole surface. The secret write's ceiling is a `Config` field, and a non-Windows host refuses the write instead of storing a variable its next boot will not read.

## Alternatives considered

**Leave the manager parked.** Rejected: adding an MCP server then means hand-editing the patch file, which is exactly the mistake the env-ref syntax invites.

**Move the manager into the desktop host (C#).** Rejected: the host is a window supervisor, and the patch file belongs to the composition the Node server owns.

**Store secrets in the patch file as literals.** Rejected: the file is committed to a repository and read by every profile.

**Have the section poll each server for status itself.** Rejected: the phase, attempt count, and discovered tools are supervisor state; a client-side probe would answer a different question and duplicate the connection.

## Consequences

A saved row applies live, so a malformed row can break the next load until it is fixed — the validation and the atomic rewrite exist to keep that window small. The secret store is Windows-only, and no method returns a stored value. The status list covers mounted instances only, so a configured server that has not loaded is absent rather than "unknown". The package, the status store, and the section are fork surface accounted for in the Cordis catalog, the capability graph, and the package READMEs.
