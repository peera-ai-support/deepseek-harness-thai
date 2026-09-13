/**
 * The Host reads and writes the MCP section performs, as callbacks built in the
 * plugin body. The section receives results rather than a Remote namespace, so
 * the failure codes and wire names stay in the apply world.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {
  McpImportSecretValue, McpServerEntry, McpServersFileValue, McpServersValue, McpServerStatus,
} from '@deepseek-ai/dsh-api-remotes/client'

/** What one read or write answered: the value, or the Host's own message. */
export type McpOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string }

/** The Host operations the MCP section invokes. */
export interface McpOperations {
  /** List the managed rows of the home patch file. */
  listServers(): Promise<McpOutcome<McpServersFileValue>>
  /** Live connection statuses of the mounted mcp-client instances. */
  status(): Promise<McpOutcome<{ statuses: McpServerStatus[] }>>
  /** Insert or replace one managed row. */
  upsertServer(server: McpServerEntry): Promise<McpOutcome<McpServersValue>>
  /** Remove one managed row by id. */
  removeServer(id: string): Promise<McpOutcome<McpServersValue>>
  /** Store a pasted secret in the user-scope environment. */
  importSecret(name: string, value: string): Promise<McpOutcome<McpImportSecretValue>>
}

/** One refusal from any namespace method, with the Host's own message. */
function refused(error: { readonly message: string }): McpOutcome<never> {
  return { ok: false, message: error.message }
}

/**
 * Bind the section's Host operations to the `mcp` Remote namespace.
 * @param ctx - the page plugin's context, which declares `remote.mcp` in its own `inject`.
 * @returns the callbacks the section is injected with.
 */
export function createMcpOperations(ctx: ClientContext): McpOperations {
  return {
    listServers: async () => {
      const response = await ctx.remote.mcp.listServers()
      return response.ok ? { ok: true, value: response.value } : refused(response.error)
    },
    status: async () => {
      const response = await ctx.remote.mcp.status()
      return response.ok ? { ok: true, value: response.value } : refused(response.error)
    },
    upsertServer: async (server) => {
      const response = await ctx.remote.mcp.upsertServer(server)
      return response.ok ? { ok: true, value: response.value } : refused(response.error)
    },
    removeServer: async (id) => {
      const response = await ctx.remote.mcp.removeServer(id)
      return response.ok ? { ok: true, value: response.value } : refused(response.error)
    },
    importSecret: async (name, value) => {
      const response = await ctx.remote.mcp.importSecret(name, value)
      return response.ok ? { ok: true, value: response.value } : refused(response.error)
    },
  }
}
