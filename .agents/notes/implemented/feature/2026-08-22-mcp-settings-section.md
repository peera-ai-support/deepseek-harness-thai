# Agent Note: MCP server management UI in Settings

Status: implemented

English | [中文](2026-08-22-mcp-settings-section.zh.md)

## Problem

MCP servers are added by hand-editing the home-level user patch file (`$DSH_HOME/cordis.patch.yml`). The user (Thai desktop build) asked for an in-app form instead. This matters beyond convenience: the config spell for an env-ref header (`!!js '`Bearer ${process.env.GITHUB_TOKEN}`'`) is easy to mistype by hand, and secrets should never be pasted as literals into a config file.

## Decision

Add a Settings section "MCP" backed by three loopback-pinned RPC methods that read and rewrite the home patch file:

- `mcp.listServers` / `mcp.upsertServer` / `mcp.removeServer` — a new `mcp` ApiProxy domain (api/mcp.ts + api/mcp.schema.ts, map/handler/client rows per the six-file drill).
- `packages/host/apiproxy/src/mcp-config.ts` — pure parse/rebuild/validate over the patch text. It manages only rows whose `name` is the mcp-client plugin; foreign rows and comments survive verbatim. Writes go through tmp+rename so the HMR watcher never reads a partial file (the rewrite hot-reloads the composition, so tools change live).
- `McpSection` in ui-settings-general (id `mcp`, order 20) — list/add/edit/remove with **live connection status**: mcp-client now publishes per-server status (`connecting`/`connected`/`reconnecting`/`disabled`) into a root-scoped `McpStatusStore` (`status.ts`), read by `mcp.status`; the section polls every 5s and renders a colored chip. Header and env values are either literals or env refs (`kind: 'env'`), rendered with a separate env-name and prefix field; env refs serialize as `!!js` expressions, never as plaintext tokens.

Unmodeled config keys (e.g. reconnect timeouts) are carried as raw `extra` lines and preserved on rewrite. Unreadable managed rows are left untouched rather than guessed at. Uniqueness (row id, serverName) and transport-required fields (url / command) are enforced server-side before the file is touched.

## Blast radius

- New RPC domain → the ApiProxy aggregate, ApiProxyService, IApiClient, and every test fake (connection fixture + fake-api in connection/runtime tests, client-handler and fetch-carrier MOCK APIs, dispatch switches).
- `mcp.*` joined PRIVILEGED_METHODS: the methods read and rewrite a machine-level config file every profile composes.
- ui-settings-general now seats three sections (general, mcp, about); apply/shell specs asserted a single section and were stale since About landed — updated with the ledger.
- `@deepseek-ai/dsh-home-paths` became a dependency of the host apiproxy (respects `$DSH_HOME`).
- Locale: new `mcp.*` keys in zh/en/th with compile-enforced parity.

## Follow-ups

- Status is a 5-second poll while the section is mounted; a push stream (events domain) would remove the latency if needed.
