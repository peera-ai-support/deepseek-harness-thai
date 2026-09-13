/**
 * Host Remote owner for MCP server configuration: list, insert, replace, and
 * remove the mcp-client rows of the home-level user patch file
 * (`$DSH_HOME/cordis.patch.yml`), report the live connection status the mounted
 * mcp-client instances publish, and store a pasted secret in the user-scope
 * environment so it never lands in the file.
 *
 * @module @deepseek-ai/dsh-api-mcp-controller
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
// Type-only: merges the ctx.mcpStatus store the mounted mcp-client instances publish.
import type {} from '@deepseek-ai/dsh-mcp-client'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  loadMcpPatch,
  mcpPatchPath,
  McpConfigError,
  parseMcpPatch,
  rebuildMcpPatchText,
  storeMcpPatch,
  validateServerEntry,
} from './mcp-config.ts'
import type {
  McpImportSecretValue,
  McpServerEntry,
  McpServersFileValue,
  McpServersValue,
  McpStatusValue,
} from './types.ts'

export type * from './types.ts'

/** promisified execFile: stdout/stderr strings, options (timeout/windowsHide) applied per call. */
const execFileAsync = promisify(execFile)

/** User-scope secret names: an environment-variable shape, uppercase by convention. */
const SECRET_NAME_RE = /^[A-Z][A-Z0-9_]{0,127}$/

/** Longest secret the editor accepts, in characters. */
const SECRET_VALUE_MAX = 4096

/** Default ceiling for one user-scope secret write, in milliseconds. */
const SECRET_WRITE_TIMEOUT_MS = 15_000

/** Deployment ceilings for the MCP controller. */
export interface Config {
  /** Ceiling for one user-scope secret write, in milliseconds. */
  readonly secretWriteTimeoutMs?: number
}

/** Host integrations replaceable by direct unit tests. */
export interface McpControllerInternals {
  /** Absolute path of the patch file the controller reports and edits. */
  readonly patchPath?: () => string
  /** Read the home patch text; an absent file is an empty document. */
  readonly loadPatch?: (file?: string) => string
  /** Write the home patch text atomically. */
  readonly storePatch?: (text: string, file?: string) => void
  /** Store one secret in the user-scope environment. */
  readonly writeSecret?: (name: string, value: string) => Promise<void>
  /** Ceiling for the default secret write, in milliseconds. */
  readonly secretWriteTimeoutMs?: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the `mcp` Remote namespace. */
    mcp: McpController
  }
}

/** Render whatever a stage threw for the refusal message. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Store one secret in the user-scope environment: the Windows user registry
 * (`HKCU\Environment`). A POSIX host refuses instead of writing somewhere the
 * next boot will not read.
 * @param name - environment variable name to set.
 * @param value - secret text.
 * @param timeoutMs - ceiling for the write, in milliseconds.
 */
async function writeUserEnvironmentVariable(name: string, value: string, timeoutMs: number): Promise<void> {
  if (process.platform !== 'win32') {
    throw new Error('storing a user-scope environment variable is implemented on Windows only')
  }
  await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command',
      `[Environment]::SetEnvironmentVariable('${name}','${value.replaceAll("'", "''")}','User')`],
    { windowsHide: true, timeout: timeoutMs },
  )
}

/**
 * The MCP configuration and status Remote namespace. Listing and status are
 * reads; upsert, remove, and importSecret write to the patch file or the user
 * environment. The composition hot-reloads from the patch file, so a saved row
 * applies live.
 */
export class McpController extends TypertRemoteService {
  static Config: Schema<Config> = Schema.object({
    secretWriteTimeoutMs: Schema.number(),
  })

  private readonly patchPath: () => string
  private readonly loadPatch: (file?: string) => string
  private readonly storePatch: (text: string, file?: string) => void
  private readonly writeSecret: (name: string, value: string) => Promise<void>

  /**
   * Register the `mcp` namespace.
   * @param ctx - Host context.
   * @param config - deployment ceilings for the controller.
   * @param internals - file and environment integrations, replaceable in tests.
   */
  constructor(ctx: Context, config: Config = {}, internals: McpControllerInternals = {}) {
    super(ctx, 'mcp')
    this.patchPath = internals.patchPath ?? mcpPatchPath
    this.loadPatch = internals.loadPatch ?? loadMcpPatch
    this.storePatch = internals.storePatch ?? storeMcpPatch
    const timeoutMs = internals.secretWriteTimeoutMs ?? config.secretWriteTimeoutMs ?? SECRET_WRITE_TIMEOUT_MS
    this.writeSecret = internals.writeSecret ?? ((name, value) => writeUserEnvironmentVariable(name, value, timeoutMs))
  }

  /**
   * List the managed rows of the home patch file. Reading is lossless:
   * unreachable or malformed rows still surface.
   * @returns the managed rows and the patch file they live in.
   * @throws RemoteError `mcp/unreadable` when the file cannot be read.
   */
  @Remote
  listServers(): McpServersFileValue {
    return { servers: parseMcpPatch(this.read()), filePath: this.patchPath() }
  }

  /**
   * Insert or replace one managed row, matched by its `id`, and rewrite the
   * patch file. Every other row and comment survives verbatim.
   * @param server - the row to store.
   * @returns the managed rows after the write.
   * @throws RemoteError `mcp/unreadable`, `mcp/rejected`, or `mcp/write-failed`.
   */
  @Remote
  upsertServer(server: McpServerEntry): McpServersValue {
    const current = parseMcpPatch(this.read())
    try {
      validateServerEntry(server, current.filter(entry => entry.id !== server.id))
    } catch (error) {
      if (error instanceof McpConfigError) {
        throw new RemoteError('mcp/rejected', error.message, {}, { cause: error })
      }
      throw error
    }
    const next = current.some(entry => entry.id === server.id)
      ? current.map(entry => (entry.id === server.id ? server : entry))
      : [...current, server]
    return this.write(next)
  }

  /**
   * Remove the managed row with `id`; an absent id is a no-op.
   * @param id - patch row id to remove.
   * @returns the managed rows after the write.
   * @throws RemoteError `mcp/unreadable` or `mcp/write-failed`.
   */
  @Remote
  removeServer(id: string): McpServersValue {
    return this.write(parseMcpPatch(this.read()).filter(entry => entry.id !== id))
  }

  /**
   * Live connection statuses reported by the mounted mcp-client instances.
   * @returns one status per mounted instance; a server with no live instance is absent.
   */
  @Remote
  status(): McpStatusValue {
    return { statuses: this.ctx.get('mcpStatus')?.snapshot() ?? [] }
  }

  /**
   * Store a pasted secret in the user-scope environment under `name`, so the
   * caller can reference it from a row instead of writing the literal into the
   * patch file. The value is visible to this user's processes only.
   * @param name - environment variable name, uppercase.
   * @param value - secret text.
   * @returns the name the row should reference.
   * @throws RemoteError `mcp/rejected` for a malformed name or value, and
   * `mcp/secret-write-failed` when the store refuses.
   */
  @Remote
  async importSecret(name: string, value: string): Promise<McpImportSecretValue> {
    if (!SECRET_NAME_RE.test(name)) {
      throw new RemoteError(
        'mcp/rejected',
        `secret name must be 1-128 uppercase letters, digits, or underscores: ${JSON.stringify(name)}`,
        {},
      )
    }
    if (value.length === 0 || value.length > SECRET_VALUE_MAX) {
      throw new RemoteError('mcp/rejected', `secret value must be 1-${String(SECRET_VALUE_MAX)} characters`, {})
    }
    try {
      await this.writeSecret(name, value)
    } catch (error) {
      throw new RemoteError(
        'mcp/secret-write-failed',
        `storing secret ${name} failed: ${messageOf(error)}`,
        {},
        { cause: error },
      )
    }
    return { name }
  }

  /** Read the patch text, mapping an unreadable file to its refusal. */
  private read(): string {
    try {
      return this.loadPatch()
    } catch (error) {
      throw new RemoteError('mcp/unreadable', `reading MCP config failed: ${messageOf(error)}`, {}, { cause: error })
    }
  }

  /** Rebuild and store the patch text, returning the rows as they were written. */
  private write(servers: readonly McpServerEntry[]): McpServersValue {
    try {
      this.storePatch(rebuildMcpPatchText(this.loadPatch(), servers))
    } catch (error) {
      if (error instanceof McpConfigError) {
        throw new RemoteError('mcp/rejected', error.message, {}, { cause: error })
      }
      throw new RemoteError('mcp/write-failed', `writing MCP config failed: ${messageOf(error)}`, {}, { cause: error })
    }
    return { servers: parseMcpPatch(this.loadPatch()) }
  }
}

export default McpController
