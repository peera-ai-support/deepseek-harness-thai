import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { remoteErrorOf, remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import McpController from '../src/index.ts'
import type { McpControllerInternals } from '../src/index.ts'
import type { McpServerEntry, McpServerStatus } from '../src/types.ts'

/** One home patch file holding a single managed row. */
const PATCH = `# MCP servers — one dsh-mcp-client row per external server.
- insert:
    - id: mcp-github
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: github
        transport: streamable-http
        url: https://api.githubcopilot.com/mcp/
        headers:
          Authorization: !!js 'Bearer \${process.env.GITHUB_TOKEN}'
`

/** The patch path the controller reports without touching the filesystem. */
const PATCH_PATH = '/home/user/.dsh/cordis.patch.yml'

/** One catalog row, as the editor builds it. */
function entry(overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    id: 'mcp-x',
    serverName: 'x',
    transport: 'stdio',
    command: 'npx',
    headers: [],
    args: [],
    env: [],
    extra: [],
    ...overrides,
  }
}

/** A stored patch text plus the integrations the controller is built with. */
function world(initial = PATCH): { internals: McpControllerInternals; stored: () => string } {
  let text = initial
  return {
    internals: {
      patchPath: () => PATCH_PATH,
      loadPatch: () => text,
      storePatch: (next) => { text = next },
    },
    stored: () => text,
  }
}

/** Read the Remote refusal one call produced. */
async function refusalOf(call: () => unknown): Promise<{ code: string; message: string }> {
  try {
    await call()
  } catch (error) {
    const refusal = remoteErrorOf(error)
    if (refusal === undefined) throw error
    return { code: refusal.code, message: refusal.message }
  }
  throw new Error('expected the call to refuse')
}

describe('the mcp Remote namespace', () => {
  it('publishes the namespace from the mcp service key', () => {
    const controller = new McpController(new Context(), {}, world().internals)
    expect(controller.typertRemote.serviceKey).toBe('mcp')
    expect(controller.typertRemote.namespace).toBe('mcp')
    expect(remoteMethods(controller).map(marker => marker.method))
      .toEqual(['listServers', 'upsertServer', 'removeServer', 'status', 'importSecret'])
  })

  it('lists the managed rows and the file they live in', () => {
    const controller = new McpController(new Context(), {}, world().internals)
    const value = controller.listServers()
    expect(value.filePath).toBe(PATCH_PATH)
    expect(value.servers.map(server => server.id)).toEqual(['mcp-github'])
  })

  it('refuses a list when the patch file is unreadable', async () => {
    const controller = new McpController(new Context(), {}, {
      ...world().internals,
      loadPatch: () => { throw new Error('EACCES') },
    })
    const refusal = await refusalOf(() => controller.listServers())
    expect(refusal.code).toBe('mcp/unreadable')
    expect(refusal.message).toContain('EACCES')
  })

  it('inserts a new row and appends it to the file, preserving the existing rows', () => {
    const w = world()
    const controller = new McpController(new Context(), {}, w.internals)
    const value = controller.upsertServer(entry())
    expect(value.servers.map(server => server.id)).toEqual(['mcp-github', 'mcp-x'])
    expect(w.stored()).toContain('id: mcp-github')
    expect(w.stored()).toContain('id: mcp-x')
  })

  it('replaces an existing row in place, matched by id', () => {
    const w = world()
    const controller = new McpController(new Context(), {}, w.internals)
    const value = controller.upsertServer(entry({ id: 'mcp-github', serverName: 'github', transport: 'stdio' }))
    expect(value.servers).toHaveLength(1)
    expect(value.servers[0]?.transport).toBe('stdio')
    expect(w.stored()).not.toContain('api.githubcopilot.com')
  })

  it('refuses a row whose serverName another row already uses, without writing', async () => {
    const w = world()
    const controller = new McpController(new Context(), {}, w.internals)
    const before = w.stored()
    const refusal = await refusalOf(() => controller.upsertServer(entry({ serverName: 'github' })))
    expect(refusal.code).toBe('mcp/rejected')
    expect(refusal.message).toContain('serverName already used')
    expect(w.stored()).toBe(before)
  })

  it('refuses a row whose id is not URL-safe', async () => {
    const controller = new McpController(new Context(), {}, world().internals)
    const refusal = await refusalOf(() => controller.upsertServer(entry({ id: 'bad id' })))
    expect(refusal.code).toBe('mcp/rejected')
  })

  it('refuses a failed write with its own code', async () => {
    const controller = new McpController(new Context(), {}, {
      ...world().internals,
      storePatch: () => { throw new Error('EROFS') },
    })
    const refusal = await refusalOf(() => controller.upsertServer(entry()))
    expect(refusal.code).toBe('mcp/write-failed')
    expect(refusal.message).toContain('EROFS')
  })

  it('removes a row by id, and treats an absent id as a no-op', () => {
    const w = world()
    const controller = new McpController(new Context(), {}, w.internals)
    expect(controller.removeServer('mcp-github').servers).toEqual([])
    const once = w.stored()
    expect(controller.removeServer('mcp-absent').servers).toEqual([])
    expect(w.stored()).toBe(once)
  })

  it('reports the statuses the mounted instances published, and none without them', () => {
    const statuses: McpServerStatus[] = [{ serverName: 'github', phase: 'connected', tools: [] }]
    const ctx = new Context()
    ctx.provide('mcpStatus', { snapshot: () => statuses } as never)
    const withStore = new McpController(ctx, {}, world().internals)
    expect(withStore.status()).toEqual({ statuses })
    const withoutStore = new McpController(new Context(), {}, world().internals)
    expect(withoutStore.status()).toEqual({ statuses: [] })
  })

  it('stores a pasted secret in the user-scope environment', async () => {
    const writeSecret = vi.fn(() => Promise.resolve())
    const controller = new McpController(new Context(), {}, { ...world().internals, writeSecret })
    await expect(controller.importSecret('GITHUB_TOKEN', 'sk-secret')).resolves.toEqual({ name: 'GITHUB_TOKEN' })
    expect(writeSecret).toHaveBeenCalledWith('GITHUB_TOKEN', 'sk-secret')
  })

  it('refuses a malformed secret name or an empty value before writing', async () => {
    const writeSecret = vi.fn(() => Promise.resolve())
    const controller = new McpController(new Context(), {}, { ...world().internals, writeSecret })
    expect((await refusalOf(() => controller.importSecret('lowercase', 'v'))).code).toBe('mcp/rejected')
    expect((await refusalOf(() => controller.importSecret('OK_NAME', ''))).code).toBe('mcp/rejected')
    expect(writeSecret).not.toHaveBeenCalled()
  })

  it('names the refused secret write', async () => {
    const controller = new McpController(new Context(), {}, {
      ...world().internals,
      writeSecret: () => Promise.reject(new Error('denied')),
    })
    const refusal = await refusalOf(() => controller.importSecret('GITHUB_TOKEN', 'v'))
    expect(refusal.code).toBe('mcp/secret-write-failed')
    expect(refusal.message).toContain('GITHUB_TOKEN')
  })
})
