/**
 * Live connection status of mcp-client instances, published on the root
 * context so transport consumers (the host apiproxy status RPC) can read a
 * snapshot without coupling to the client internals.
 *
 * @module
 */

import type { Context } from '@deepseek-ai/cordis'

/** One connection phase of an MCP server. */
export type McpServerPhase = 'connecting' | 'connected' | 'reconnecting' | 'disabled'

/** Live status of one mcp-client instance keyed by `serverName`. */
export interface McpServerStatus {
  /** Stable local namespace this instance published its tools under. */
  serverName: string
  /** Current lifecycle phase. */
  phase: McpServerPhase
  /** Consecutive failed attempts within the current outage (`reconnecting` only). */
  attempt?: number
  /** Planned wait before the next retry in ms (`reconnecting` only). */
  delayMs?: number
}

/** Per-server handle the connection supervisor writes into. Implementations must be synchronous. */
export interface McpStatusSink {
  /** Replace this server's status (same `serverName`). */
  update(status: Omit<McpServerStatus, 'serverName'>): void
  /** Drop this server's status (disposal). */
  remove(): void
}

/** Root-scoped status ledger; one shared instance per app (tests mount multiple plugin fibers). */
export class McpStatusStore {
  private readonly statuses = new Map<string, McpServerStatus>()

  /** Get the sink for one server. */
  handle(serverName: string): McpStatusSink {
    return {
      update: (status) => {
        this.statuses.set(serverName, { serverName, ...status })
      },
      remove: () => {
        this.statuses.delete(serverName)
      },
    }
  }

  /** Current snapshot, serverName-sorted for deterministic display. */
  snapshot(): McpServerStatus[] {
    return [...this.statuses.values()].sort((a, b) => a.serverName.localeCompare(b.serverName))
  }
}

/** Lazy-per-app store: created on first mcp-client activation, never disposed. */
const rootStores = new WeakMap<Context, McpStatusStore>()

/** The app-scoped shared store (created and provided once per root; later instances register into it). */
export function statusStoreFor(ctx: Context): McpStatusStore {
  let store = rootStores.get(ctx.root)
  if (store === undefined) {
    store = new McpStatusStore()
    rootStores.set(ctx.root, store)
    ctx.root.provide('mcpStatus', store)
  }
  return store
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Live mcp-client connection statuses; absent when no mcp-client instance is mounted. */
    readonly mcpStatus?: McpStatusStore
  }
}
