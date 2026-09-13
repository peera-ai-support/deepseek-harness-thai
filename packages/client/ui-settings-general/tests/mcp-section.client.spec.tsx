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

// Global standard kit stubs: McpSection consumes none of these hooks.
const unusedHook = (() => { throw new Error('unused by mcp-section') }) as never
const kit = {
  useSessions: unusedHook,
  useWorkspaces: unusedHook,
  usePanelInfo: unusedHook,
  useSessionPendingInteraction: unusedHook,
  useResource: unusedHook,
}

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

function firstUpsert(mock: { upsertServer: { mock: { calls: Array<[McpServerEntry]> } } }): McpServerEntry {
  const call = mock.upsertServer.mock.calls[0]
  if (call === undefined) throw new Error('upsert not called')
  return call[0]
}

function mount(servers: McpServerEntry[], statuses: McpServerStatus[] = []) {
  const api = {
    listServers: vi.fn(async () => ({ ok: true as const, value: { servers, filePath: '/home/u/.dsh/cordis.patch.yml' } })),
    upsertServer: vi.fn(async (server: McpServerEntry) => ({
      ok: true as const,
      value: { servers: [...servers.filter(s => s.id !== server.id), server] },
    })),
    removeServer: vi.fn(async (id: string) => ({ ok: true as const, value: { servers: servers.filter(s => s.id !== id) } })),
    status: vi.fn(async () => ({ ok: true as const, value: { statuses } })),
    importSecret: vi.fn(async (name: string) => ({ ok: true as const, value: { name } })),
  }
  const view = render(<McpSection {...kit} ops={api} t={t} close={vi.fn()} />)
  return { api, view }
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
    expect(payload.serverName).toBe('github')
    expect(payload.id).toBe('mcp-github')
    expect(payload.transport).toBe('streamable-http')
    expect(payload.url).toBe('https://api.githubcopilot.com/mcp/')
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
    const header = firstUpsert(api).headers[0]!
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
    expect(firstUpsert(api).toolCallTimeoutMs).toBe(120000)
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
    expect(payload.id).toBe('mcp-j1')
    expect(payload.serverName).toBe('j1')
    expect(payload.command).toBe('echo')
    expect(payload.args).toEqual(['a'])
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
    expect(api.importSecret).toHaveBeenCalledWith('DSH_MCP_GITHUB_AUTHORIZATION', 'Bearer ghp_im_a_real_token_123456')
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const header = firstUpsert(api).headers[0]!
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
    const header = firstUpsert(api).headers[0]!
    expect(header).toEqual({ name: 'X-Mode', value: { kind: 'literal', value: 'quiet' } })
  })

  it('installs a ready-made preset from just a token', async () => {
    const { api } = mount([])
    fireEvent.change(await screen.findByLabelText('GitHub personal access token (PAT)'), {
      target: { value: 'ghp_paste_here_123456789012' },
    })
    fireEvent.click(screen.getAllByText('Install in one click')[0]!)
    await waitFor(() => { expect(api.importSecret).toHaveBeenCalledTimes(1) })
    expect(api.importSecret).toHaveBeenCalledWith('DSH_MCP_GITHUB_AUTHORIZATION', 'Bearer ghp_paste_here_123456789012')
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const entry = firstUpsert(api)
    expect(entry.id).toBe('mcp-github')
    expect(entry.url).toBe('https://api.githubcopilot.com/mcp/')
    expect(entry.headers).toEqual([
      { name: 'Authorization', value: { kind: 'env', env: 'DSH_MCP_GITHUB_AUTHORIZATION' } },
    ])
    expect(await screen.findByText(/Installed: github/)).toBeTruthy()
  })

  it('installs the memory preset with one click and no input', async () => {
    const { api } = mount([])
    const installers = (await screen.findAllByText('Install in one click'))
      .map(node => node.closest('button'))
      .filter((button): button is HTMLButtonElement => button !== null && !button.disabled)
    fireEvent.click(installers[0]!)
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const entry = firstUpsert(api)
    expect(entry.id).toBe('mcp-memory')
    expect(entry.command).toBe('npx')
    expect(entry.args).toEqual(['-y', '@modelcontextprotocol/server-memory'])
    expect(entry.env[0]!.name).toBe('MEMORY_FILE_PATH')
    // The storage file must live under the DSH home (derived from filePath), joined with a real separator.
    expect(entry.env[0]!.value).toEqual({ kind: 'literal', value: '/home/u/.dsh\\mcp-memory.jsonl' })
  })

  it('installs the filesystem preset with just a folder path', async () => {
    const { api } = mount([])
    fireEvent.change(await screen.findByLabelText('Folder for the model to access (full path)'), {
      target: { value: 'C:\Users\me\docs' },
    })
    const installers = (await screen.findAllByText('Install in one click'))
      .map(node => node.closest('button'))
      .filter((button): button is HTMLButtonElement => button !== null && !button.disabled)
    fireEvent.click(installers[installers.length - 1]!)
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    const entry = firstUpsert(api)
    expect(entry.id).toBe('mcp-filesystem')
    expect(entry.args).toEqual(['-y', '@modelcontextprotocol/server-filesystem', 'C:\Users\me\docs'])
  })

  it('edits and removes a server through the mcp RPC', async () => {
    const { api } = mount([server()])
    fireEvent.click(await screen.findByText('Edit'))
    fireEvent.change(screen.getByLabelText('Server name (serverName)'), { target: { value: 'gh2' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => { expect(api.upsertServer).toHaveBeenCalledTimes(1) })
    expect(firstUpsert(api).serverName).toBe('gh2')
    fireEvent.click(screen.getByText('Remove'))
    await waitFor(() => { expect(api.removeServer).toHaveBeenCalledWith('mcp-github') })
  })

  it('tests connection and reports latency and tool count', async () => {
    const { api } = mount(
      [server()],
      [{
        serverName: 'github',
        phase: 'connected',
        tools: [{ name: 'mcp__github__create_issue', rawName: 'create_issue', description: 'Create an issue' }],
      }],
    )
    const testBtn = await screen.findByText(/Test Connection/)
    fireEvent.click(testBtn)
    await waitFor(() => { expect(api.status).toHaveBeenCalled() })
    expect(await screen.findByText(/1 tools ready/)).toBeTruthy()
  })

  it('toggles tools drawer and renders exposed tools with copy button', async () => {
    mount(
      [server()],
      [{
        serverName: 'github',
        phase: 'connected',
        tools: [{ name: 'mcp__github__create_issue', rawName: 'create_issue', description: 'Create a GitHub issue' }],
      }],
    )
    const toggleBtn = await screen.findByText(/1 tools/)
    fireEvent.click(toggleBtn)
    expect(await screen.findByText('create_issue')).toBeTruthy()
    expect(screen.getByText('mcp__github__create_issue')).toBeTruthy()
    expect(screen.getByText('Create a GitHub issue')).toBeTruthy()
  })

  it('opens add form in modal popup and closes it on cancel', async () => {
    mount([])
    fireEvent.click(await screen.findByText('Add MCP server'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('switches to online registry tab and fetches servers', async () => {
    const fakeServer = {
      id: 'smithery-slack',
      qualifiedName: 'slack',
      displayName: 'Slack MCP',
      description: 'Interact with Slack channels and messages',
      verified: true,
      useCount: 12000,
    }
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ servers: [fakeServer], pagination: { totalCount: 1, totalPages: 1 } }),
    })) as unknown as typeof fetch

    try {
      mount([])
      const registryTab = await screen.findByText(/Online Registry/)
      fireEvent.click(registryTab)
      expect(await screen.findByText('Slack MCP')).toBeTruthy()
      expect(screen.getByText('Interact with Slack channels and messages')).toBeTruthy()
      expect(screen.getByText(/Verified/)).toBeTruthy()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('toggles server enabled state via the header switch', async () => {
    const s = server({ id: 'mcp-github', serverName: 'github' })
    const { api } = mount([s])
    const toggle = await screen.findByRole('switch', { name: /Disable server/i })
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(api.upsertServer).toHaveBeenCalledWith(expect.objectContaining({ id: 'mcp-github', disabled: true }))
    })
  })

  it('displays disabled status chip when server has disabled: true', async () => {
    const s = server({ id: 'mcp-github', serverName: 'github', disabled: true })
    mount([s])
    expect(await screen.findByText('Disabled')).toBeTruthy()
    const toggle = screen.getByRole('switch', { name: /Enable server/i })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })
})
