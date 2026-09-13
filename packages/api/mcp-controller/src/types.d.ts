/**
 * Browser-safe MCP configuration vocabulary: the row shape the settings editor
 * edits, the live connection status, and the failure codes the controller
 * raises. The rows live in the home-level user patch file
 * (`$DSH_HOME/cordis.patch.yml`); the status comes from the mounted
 * mcp-client instances.
 *
 * @module @deepseek-ai/dsh-api-mcp-controller/types
 */
/** One config value: a literal string or a load-time read from an environment variable. */
export interface McpValue {
  /**
     * `literal` writes the text into the patch file as-is (quoted when it is a
     * plain scalar). `env` writes a `!!js` expression that reads
     * `process.env.<env>` at plugin load, so no secret lands in the file.
     */
  kind: 'literal' | 'env'
  /** Text of the literal (kind `literal`); unrecognized `!!js` text is kept here too. */
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
/** One MCP server row as the settings editor edits it. */
export interface McpServerEntry {
  /** Patch layer row id; unique across the whole patch file. */
  id: string
  /** Model-facing tool namespace; unique across live servers. */
  serverName: string
  /** `streamable-http` connects a URL; `stdio` spawns a child program. */
  transport: 'stdio' | 'streamable-http'
  /** True when the plugin row is explicitly disabled in the patch file. */
  disabled?: boolean
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
  /** Per-tool-call timeout in ms; the plugin default applies when absent. */
  toolCallTimeoutMs?: number
  /** Raw config lines this editor does not model; preserved on rewrite. */
  extra: string[]
}
/** The managed servers of the home-level user patch file. */
export interface McpServersValue {
  servers: McpServerEntry[]
}
/** The managed servers plus the file they live in. */
export interface McpServersFileValue extends McpServersValue {
  /** Absolute path of the patch file the rows were read from. */
  filePath: string
}
/** One live connection phase of an mcp-client instance. */
export type McpServerPhase = 'connecting' | 'connected' | 'reconnecting' | 'disabled'
/** Exposed tool summary from an active MCP server. */
export interface McpServerToolInfo {
  /** Full public tool name as registered into ctx.tools. */
  name: string
  /** Raw tool name defined by the MCP server. */
  rawName: string
  /** Tool description provided by the MCP server. */
  description?: string | undefined
}
/** Live connection status of one mcp-client instance, keyed by `serverName`. */
export interface McpServerStatus {
  /** The instance's stable local namespace. */
  serverName: string
  /** Current lifecycle phase. */
  phase: McpServerPhase
  /** Consecutive failed attempts within the current outage (reconnecting only). */
  attempt?: number | undefined
  /** Planned wait before the next retry in ms (reconnecting only). */
  delayMs?: number | undefined
  /** Tools discovered and registered from this server when connected. */
  tools?: McpServerToolInfo[] | undefined
  /** Error message if down or reconnecting. */
  error?: string | undefined
}
/** Live statuses of the mounted mcp-client instances. */
export interface McpStatusValue {
  statuses: McpServerStatus[]
}
/** Confirmation that a secret was stored in the user-scope environment. */
export interface McpImportSecretValue {
  /** The environment variable name the caller should reference from the row. */
  name: string
}
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The patch file could not be read or parsed. */
    'mcp/unreadable': Record<string, never>
    /** The row was rejected by validation or collides with another row. */
    'mcp/rejected': Record<string, never>
    /** Writing the patch file failed. */
    'mcp/write-failed': Record<string, never>
    /** Storing the secret in the user-scope environment failed. */
    'mcp/secret-write-failed': Record<string, never>
  }
}
//# sourceMappingURL=types.d.ts.map
