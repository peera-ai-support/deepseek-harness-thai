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

## Alternatives considered

**Keep hand-editing `$DSH_HOME/cordis.patch.yml`.** Rejected: the env-ref spell is easy to mistype, and the natural shortcut is pasting the token itself — the outcome a settings form exists to prevent.

**Hold the server list in the settings seam instead of the patch file.** Rejected: mcp-client reads its servers from the loader composition, so a list owned by a settings section would not reach the plugin.

**Rewrite the patch file from the section's own model of it.** Rejected: the file also holds foreign rows, comments, and mcp-client keys this form does not model (reconnect timeouts); the manager writes back only the rows it owns and leaves an unreadable managed row untouched rather than guessing at it.

**Write the file in place instead of through tmp + rename.** Rejected: the composition hot-reloads from that file, so a reader that catches a partial write boots a broken tree.

## Consequences

Three privileged RPC methods now rewrite a machine-level config file every profile composes, so an in-app click edits the loader tree and a bad write can break boot until it is repaired; the tmp + rename write and the server-side uniqueness and required-field checks exist to keep that window small. Status is a 5-second poll while the section is mounted, so a server that connects or drops is shown up to 5 seconds late, and the polling stops when the section unmounts.

## Follow-ups

- Status is a 5-second poll while the section is mounted; a push stream (events domain) would remove the latency if needed.
