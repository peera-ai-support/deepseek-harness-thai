// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { McpSection } from '../src/client/McpSection.tsx'
import type { McpSectionComponentProps } from '../src/client/McpSection.tsx'
import type { McpServerEntry, McpServerStatus } from '@deepseek-ai/dsh-api-remotes/client'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

// The seat's key domain is settings ∪ common; the stub answers from the
// package dictionary and substitutes {param} placeholders like the real chain.
const t: McpSectionComponentProps['t'] = (key, params) => {
  const value = (en as Record<string, string>)[key] ?? key
  if (params === undefined) return value
  return value.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const part = params[name]
    if (typeof part === 'string' || typeof part === 'number') return String(part)
    return ''
  })
}

// Global standard kit stubs: McpSection consumes neither hook.
const unusedHook = (() => { throw new Error('unused by mcp-section') }) as never
const kit = { useSessions: unusedHook, useWorkspaces: unusedHook }

function server(overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    id: 'mcp-github',
    serverName: 'github',
    transport: 'streamable-http',
    url: 'https://api.githubcopilot.com/mcp/',
    headers: [{
      name: 'Authorization',
      value: { kind: 'env', env: 'GITHUB_TOKEN', prefix: 'Bearer ' },
    }],
    args: [],
    env: [],
    extra: [],
    ...overrides,
  }
}

function okResponse<T>(value: T) {
  return { result: { ok: true as const, value } }
}

function mount(servers: McpServerEntry[], statuses: McpServerStatus[] = []) {
  const api = {
    listServers: vi.fn(async () => okResponse({ servers, filePath: '/home/u/.dsh/cordis.patch.yml' })),
    upsertServer: vi.fn(async (payload: { server: McpServerEntry }) => okResponse({
      servers: [...servers.filter(s => s.id !== payload.server.id), payload.server],
    })),
    removeServer: vi.fn(async (payload: { id: string }) => okResponse({ servers: servers.filter(s => s.id !== payload.id) })),
    status: vi.fn(async () => okResponse({ statuses })),
  }
  const connection = { api: { mcp: api } } as unknown as McpSectionComponentProps['connection']
  const view = render(<McpSection {...kit} connection={connection} t={t} close={vi.fn()} />)
  return { api, connection, view }
}

describe('McpSection', () => {
  it('lists the configured servers with transport and summary', async () => {
    mount([server()])
    expect(await screen.findByText('github')).toBeTruthy()
    expect(screen.getByText('streamable-http')).toBeTruthy()
    expect(screen.getByText('https://api.githubcopilot.com/mcp/')).toBeTruthy()
    expect(screen.getByText(/File: \/home\/u\/\.dsh\/cordis\.patch\.yml/)).toBeTruthy()
  })

  it('shows the empty hint when nothing is configured', async () => {
    mount([])
    expect(await screen.findByText('No MCP servers yet')).toBeTruthy()
  })

  it('shows the live connection status chip from mcp.status', async () => {
    mount([server()], [{ serverName: 'github', phase: 'connected' }])
    expect(await screen.findByText('Connected')).toBeTruthy()
  })

  it('shows a reconnecting chip with the attempt count', async () => {
    mount([server()], [{ serverName: 'github', phase: 'reconnecting', attempt: 2, delayMs: 1000 }])
    expect(await screen.findByText('Reconnecting (attempt 2)')).toBeTruthy()
  })

  it('falls back to unknown status when the server has no live instance', async () => {
    mount([server()])
    expect(await screen.findByText('Unknown')).toBeTruthy()
  })

  it('adds a custom HTTP server through the add-mode chooser', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.click(screen.getByText('Set up manually'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'github' } })
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://api.githubcopilot.com/mcp/' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    // oxlint-disable-next-line no-unnecessary-type-assertion -- tuple index needs the tsc noUncheckedIndexedAccess guard
    const payload = api.upsertServer.mock.calls[0]![0]!
    expect(payload.server.serverName).toBe('github')
    expect(payload.server.id).toBe('mcp-github')
    expect(payload.server.transport).toBe('streamable-http')
    expect(payload.server.url).toBe('https://api.githubcopilot.com/mcp/')
    expect(await screen.findByText(/Saved/)).toBeTruthy()
  })

  it('prefills the GitHub template with URL and env-ref Authorization header', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.click(screen.getByText('Use this template'))
    expect(screen.getByDisplayValue('https://api.githubcopilot.com/mcp/')).toBeTruthy()
    expect(screen.getByDisplayValue('GITHUB_TOKEN')).toBeTruthy()
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    // oxlint-disable-next-line no-unnecessary-type-assertion -- tuple index needs the tsc noUncheckedIndexedAccess guard
    const payload = api.upsertServer.mock.calls[0]![0]!
    expect(payload.server.id).toBe('mcp-github')
    expect(payload.server.serverName).toBe('github')
    expect(payload.server.url).toBe('https://api.githubcopilot.com/mcp/')
    expect(payload.server.headers).toEqual([
      { name: 'Authorization', value: { kind: 'env', env: 'GITHUB_TOKEN', prefix: 'Bearer ' } },
    ])
  })

  it('saves an env-ref header, never a literal token', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.click(screen.getByText('Set up manually'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'github' } })
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://api.githubcopilot.com/mcp/' } })
    const key = screen.getByLabelText('Headers Key')
    fireEvent.change(key, { target: { value: 'Authorization' } })
    fireEvent.change(screen.getByLabelText('Headers Value kind'), { target: { value: 'env' } })
    fireEvent.change(screen.getByLabelText('Headers Env var name'), { target: { value: 'GITHUB_TOKEN' } })
    fireEvent.change(screen.getByLabelText('Headers Prefix (e.g. Bearer )'), { target: { value: 'Bearer ' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    // oxlint-disable-next-line no-unnecessary-type-assertion -- tuple index needs the tsc noUncheckedIndexedAccess guard
    const header = api.upsertServer.mock.calls[0]![0]!.server.headers[0]!
    expect(header).toEqual({ name: 'Authorization', value: { kind: 'env', env: 'GITHUB_TOKEN', prefix: 'Bearer ' } })
  })

  it('edits and removes a server through the mcp RPC', async () => {
    const { api } = mount([server()])
    fireEvent.click(await screen.findByText('Edit'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'gh2' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    // oxlint-disable-next-line no-unnecessary-type-assertion -- tuple index needs the tsc noUncheckedIndexedAccess guard
    expect(api.upsertServer.mock.calls[0]![0]!.server.serverName).toBe('gh2')
    fireEvent.click(screen.getByText('Remove'))
    await waitFor(() => { expect(api.removeServer).toHaveBeenCalledWith({ id: 'mcp-github' }) })
  })
})
