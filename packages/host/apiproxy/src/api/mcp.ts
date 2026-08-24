/**
 * mcp domain contract: read and manage the MCP server rows of the
 * home-level user patch file (`$DSH_HOME/cordis.patch.yml`). No protocol
 * version: client and host ship together.
 */

import type { RpcRequest, RpcResponse } from './rpc.ts'

/** One config value: a literal string or a load-time read from an environment variable. */
export interface McpValue {
  /**
   * `literal` — the text is written into the patch file as-is (quoted when it
   * is a plain scalar). `env` — the row carries a `!!js` expression that reads
   * `process.env.<env>` at plugin load, so no secret lands in the file.
   */
  kind: 'literal' | 'env'
  /** Text of the literal (kind `literal`); unrecognized `!!js` text is kept verbatim here too. */
  value?: string
  /** Environment variable name (kind `env`). */
  env?: string
  /** Literal text preceding the interpolation, e.g. `Bearer ` (kind `env`). */
  prefix?: string
  /** Literal text following the interpolation (kind `env`). */
  suffix?: string
}

/** One header (streamable-http) or env (stdio) entry of a server config. */
export interface McpHeaderOrEnv {
  /** Header/env key, e.g. `Authorization` or `GITHUB_TOKEN`. */
  name: string
  /** The key's value shape. */
  value: McpValue
}

/** One MCP server row as the settings UI edits it. */
export interface McpServerEntry {
  /** Patch layer row id; unique across the whole patch file. */
  id: string
  /** Model-facing tool namespace; unique across live servers. */
  serverName: string
  /** `streamable-http` connects a URL; `stdio` spawns a child program. */
  transport: 'stdio' | 'streamable-http'
  /** streamable-http server URL. */
  url?: string
  /** streamable-http request headers. */
  headers: McpHeaderOrEnv[]
  /** stdio executable to spawn. */
  command?: string
  /** stdio arguments, one per element. */
  args: string[]
  /** stdio child working directory. */
  cwd?: string
  /** stdio child environment additions. */
  env: McpHeaderOrEnv[]
  /** Per-tool-call timeout in ms; the plugin default (60000) applies when absent. */
  toolCallTimeoutMs?: number
  /** Raw config lines this editor does not model (e.g. reconnect timeouts); preserved on rewrite. */
  extra: string[]
}

/** The managed servers of the home-level user patch file. */
export interface McpServersValue {
  servers: McpServerEntry[]
}

/** One live connection phase of an mcp-client instance. */
export type McpServerPhase = 'connecting' | 'connected' | 'reconnecting' | 'disabled'

/** Live connection status of one mcp-client instance, keyed by `serverName`. */
export interface McpServerStatus {
  /** The instance's stable local namespace. */
  serverName: string
  /** Current lifecycle phase. */
  phase: McpServerPhase
  /** Consecutive failed attempts within the current outage (reconnecting only). */
  attempt?: number
  /** Planned wait before the next retry in ms (reconnecting only). */
  delayMs?: number
}

/** mcp domain unary methods. */
export interface McpApi {
  /**
   * List the mcp-client rows of the home-level user patch file
   * (`$DSH_HOME/cordis.patch.yml`). Reading is lossless: unreachable or
   * malformed rows still surface, `filePath` is the file the rows live in.
   * Failures carry `mcp-config-parse` (file unreadable).
   */
  listServers(request: RpcRequest<{}>): Promise<RpcResponse<McpServersValue & { filePath: string }>>

  /**
   * Insert or replace one mcp-client row (matched by `server.id`) and rewrite
   * the home patch file. Every other row and comment survives verbatim; the
   * file watcher hot-reloads the composition, so the change applies live.
   * Failures carry `mcp-config-invalid` (validation or uniqueness) or
   * `mcp-config-parse`/`mcp-file-write-failed`.
   */
  upsertServer(
    request: RpcRequest<{ server: McpServerEntry }>,
  ): Promise<RpcResponse<McpServersValue>>

  /**
   * Remove the mcp-client row with `id` (absent ids are a no-op) and rewrite
   * the home patch file. Failures carry `mcp-config-parse` (file unreadable)
   * or `mcp-file-write-failed`.
   */
  removeServer(
    request: RpcRequest<{ id: string }>,
  ): Promise<RpcResponse<McpServersValue>>

  /**
   * Snapshot of live connection statuses reported by the active mcp-client
   * instances. Servers with no live instance are absent; `reconnecting`
   * carries the attempt count and planned backoff delay, `disabled` covers
   * both a disabled reconnect policy and an exhausted attempt budget.
   */
  status(request: RpcRequest<{}>): Promise<RpcResponse<{ statuses: McpServerStatus[] }>>

  /**
   * Store a secret value in the OS user-environment store (Windows
   * `HKCU\Environment` / POSIX user profile) under `name`, so the editor can
   * accept a pasted literal token and keep it out of the patch file. The
   * value is visible to processes of this user only; the caller then rewrites
   * the config row to reference `name` via `$env:`/`!!js process.env.*`.
   * Failures carry `mcp-secret-write-failed`.
   */
  importSecret(
    request: RpcRequest<{ name: string; value: string }>,
  ): Promise<RpcResponse<{ name: string }>>
}
