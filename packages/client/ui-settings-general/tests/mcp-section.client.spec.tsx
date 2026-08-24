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

function firstUpsert(mock: { upsertServer: { mock: { calls: Array<[{ server: McpServerEntry }]> } } }): { server: McpServerEntry } {
  const call = mock.upsertServer.mock.calls[0]
  if (call === undefined) throw new Error('upsert not called')
  return call[0]
}

function mount(servers: McpServerEntry[], statuses: McpServerStatus[] = []) {
  const api = {
    listServers: vi.fn(async () => okResponse({ servers, filePath: '/home/u/.dsh/cordis.patch.yml' })),
    upsertServer: vi.fn(async (payload: { server: McpServerEntry }) => okResponse({
      servers: [...servers.filter(s => s.id !== payload.server.id), payload.server],
    })),
    removeServer: vi.fn(async (payload: { id: string }) => okResponse({ servers: servers.filter(s => s.id !== payload.id) })),
    status: vi.fn(async () => okResponse({ statuses })),
    importSecret: vi.fn(async (payload: { name: string; value: string }) => okResponse({ name: payload.name })),
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

  it('opens the form directly on add and sends the draft entry', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'github' } })
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://api.githubcopilot.com/mcp/' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const payload = firstUpsert(api)
    expect(payload.server.serverName).toBe('github')
    expect(payload.server.id).toBe('mcp-github')
    expect(payload.server.transport).toBe('streamable-http')
    expect(payload.server.url).toBe('https://api.githubcopilot.com/mcp/')
    expect(await screen.findByText(/Saved/)).toBeTruthy()
  })

  it('saves an env-ref header from the Headers JSON textarea, never a literal token', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'github' } })
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://api.githubcopilot.com/mcp/' } })
    fireEvent.change(screen.getByLabelText('Headers'), {
      target: { value: '{"Authorization": "Bearer $env:GITHUB_TOKEN"}' },
    })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const header = firstUpsert(api).server.headers[0]!
    expect(header).toEqual({ name: 'Authorization', value: { kind: 'env', env: 'GITHUB_TOKEN', prefix: 'Bearer ' } })
  })

  it('saves a tool-call timeout override from the form', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'github' } })
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://x.example/mcp' } })
    fireEvent.change(screen.getByLabelText('Timeout (ms)'), { target: { value: '120000' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    expect(firstUpsert(api).server.toolCallTimeoutMs).toBe(120000)
  })

  it('saves a pasted full JSON config in JSON mode', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.change(screen.getByLabelText('Full configuration (JSON)'), {
      target: { value: JSON.stringify({ serverName: 'j1', transport: 'stdio', command: 'echo', args: ['a'] }) },
    })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const payload = firstUpsert(api)
    expect(payload.server.id).toBe('mcp-j1')
    expect(payload.server.serverName).toBe('j1')
    expect(payload.server.command).toBe('echo')
    expect(payload.server.args).toEqual(['a'])
  })

  it('rejects an invalid JSON mode config with a message', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.change(screen.getByLabelText('Full configuration (JSON)'), {
      target: { value: '{"serverName": "x", "bogus": 1}' },
    })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).not.toHaveBeenCalled() })
    expect(await screen.findByRole('alert')).toBeTruthy()
  })

  it('saves a pasted real token by exporting it to the user environment and referencing $env', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'github' } })
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://api.githubcopilot.com/mcp/' } })
    fireEvent.change(screen.getByLabelText('Headers'), {
      target: { value: '{"Authorization": "Bearer ghp_im_a_real_token_123456"}' },
    })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.importSecret).toHaveBeenCalledTimes(1) })
    expect(api.importSecret).toHaveBeenCalledWith({
      name: 'DSH_MCP_GITHUB_AUTHORIZATION',
      value: 'Bearer ghp_im_a_real_token_123456',
    })
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const header = firstUpsert(api).server.headers[0]!
    expect(header).toEqual({ name: 'Authorization', value: { kind: 'env', env: 'DSH_MCP_GITHUB_AUTHORIZATION' } })
    expect(await screen.findByText(/Moved out safely/)).toBeTruthy()
  })

  it('keeps short literal values in the config when secret export is off', async () => {
    const { api } = mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://x.example/mcp' } })
    fireEvent.change(screen.getByLabelText('Headers'), {
      target: { value: '{"X-Mode": "quiet"}' },
    })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    expect(api.importSecret).not.toHaveBeenCalled()
    const header = firstUpsert(api).server.headers[0]!
    expect(header).toEqual({ name: 'X-Mode', value: { kind: 'literal', value: 'quiet' } })
  })

  it('installs a ready-made preset from just a token', async () => {
    const { api } = mount([])
    fireEvent.change(await screen.findByLabelText('GitHub personal access token (PAT)'), {
      target: { value: 'ghp_paste_here_123456789012' },
    })
    fireEvent.click(screen.getByText('Install in one click'))
    await waitFor(() => { expect(api.importSecret).toHaveBeenCalledTimes(1) })
    expect(api.importSecret).toHaveBeenCalledWith({
      name: 'DSH_MCP_GITHUB_AUTHORIZATION',
      value: 'Bearer ghp_paste_here_123456789012',
    })
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const entry = firstUpsert(api).server
    expect(entry.id).toBe('mcp-github')
    expect(entry.url).toBe('https://api.githubcopilot.com/mcp/')
    expect(entry.headers).toEqual([
      { name: 'Authorization', value: { kind: 'env', env: 'DSH_MCP_GITHUB_AUTHORIZATION' } },
    ])
    expect(await screen.findByText(/Installed: github/)).toBeTruthy()
  })

  it('edits and removes a server through the mcp RPC', async () => {
    const { api } = mount([server()])
    fireEvent.click(await screen.findByText('Edit'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'gh2' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    expect(firstUpsert(api).server.serverName).toBe('gh2')
    fireEvent.click(screen.getByText('Remove'))
    await waitFor(() => { expect(api.removeServer).toHaveBeenCalledWith({ id: 'mcp-github' }) })
  })
})
