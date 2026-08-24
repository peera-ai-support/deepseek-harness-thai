/**
 * The home-patch MCP row editor: parse/rebuild/validate of the
 * `$DSH_HOME/cordis.patch.yml` text contract, tested as a pure module.
 */

import { describe, expect, it } from 'vitest'
import {
  McpConfigError, MCP_PLUGIN_NAME, parseMcpPatch, rebuildMcpPatchText, validateServerEntry,
} from '../src/mcp-config.ts'
import type { McpServerEntry } from '../src/api/mcp.ts'

const GITHUB_PATCH = `# MCP servers — one dsh-mcp-client row per external server.
# Applied over every profile on this machine; edits hot-reload while dsh runs.
- insert:
    - id: mcp-github
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: github
        transport: streamable-http
        url: https://api.githubcopilot.com/mcp/
        headers:
          Authorization: !!js '\`Bearer \${process.env.GITHUB_TOKEN}\`'
`

function entry(overrides: Partial<McpServerEntry>): McpServerEntry {
  return {
    id: 'mcp-x',
    serverName: 'x',
    transport: 'stdio',
    headers: [],
    args: [],
    env: [],
    extra: [],
    ...overrides,
  }
}

describe('parseMcpPatch', () => {
  it('parses the env-template header form used by the GitHub server', () => {
    const [server] = parseMcpPatch(GITHUB_PATCH)
    expect(server).toBeDefined()
    expect(server?.id).toBe('mcp-github')
    expect(server?.serverName).toBe('github')
    expect(server?.transport).toBe('streamable-http')
    expect(server?.url).toBe('https://api.githubcopilot.com/mcp/')
    expect(server?.headers).toEqual([{
      name: 'Authorization',
      value: { kind: 'env', env: 'GITHUB_TOKEN', prefix: 'Bearer ', suffix: '' },
    }])
  })

  it('parses a bare !!js env read and a literal header', () => {
    const patch = `- insert:
    - id: mcp-memory
      name: '${MCP_PLUGIN_NAME}'
      config:
        serverName: memory
        transport: stdio
        command: mcp-server-memory
        env:
          MEMORY_FILE_PATH: !!js process.env.MEMORY_FILE_PATH
          MODE: quiet
`
    const [server] = parseMcpPatch(patch)
    expect(server?.command).toBe('mcp-server-memory')
    expect(server?.env).toEqual([
      { name: 'MEMORY_FILE_PATH', value: { kind: 'env', env: 'MEMORY_FILE_PATH', prefix: '', suffix: '' } },
      { name: 'MODE', value: { kind: 'literal', value: 'quiet' } },
    ])
  })

  it('ignores non-mcp rows and returns [] for an empty document', () => {
    const patch = '- id: system-prompt\n  config:\n    persona: hi\n'
    expect(parseMcpPatch(patch)).toEqual([])
    expect(parseMcpPatch('')).toEqual([])
  })

  it('parses args flow sequences with quoted and escaped values', () => {
    const patch = `- insert:
    - id: mcp-d
      name: '${MCP_PLUGIN_NAME}'
      config:
        serverName: d
        transport: stdio
        command: npx
        args: ['-y', 'server-a', 'it''s']
`
    const [server] = parseMcpPatch(patch)
    expect(server?.args).toEqual(['-y', 'server-a', 'it\'s'])  })
})

describe('rebuildMcpPatchText', () => {
  it('round-trips the GitHub patch with no loss', () => {
    const rebuilt = rebuildMcpPatchText(GITHUB_PATCH, parseMcpPatch(GITHUB_PATCH))
    expect(rebuilt).toBe(GITHUB_PATCH)
  })

  it('updates one row, removes another, appends a new one, and keeps foreign rows', () => {
    const foreign = '# preamble comment\n- id: system-prompt\n  config:\n    persona: hi\n'
    const text = [
      GITHUB_PATCH.trimEnd(),
      '- insert:',
      '    - id: mcp-old',
      `      name: '${MCP_PLUGIN_NAME}'`,
      '      config:',
      '        serverName: old',
      '        transport: stdio',
      '        command: old-cmd',
      foreign.trimEnd(),
    ].join('\n') + '\n'
    const servers = parseMcpPatch(text)
    const updated = servers.map(s => s.id === 'mcp-github' ? { ...s, serverName: 'gh2' } : s)
      .filter(s => s.id !== 'mcp-old')
    const rebuilt = rebuildMcpPatchText(text, [...updated, entry({
      id: 'mcp-new', serverName: 'new', transport: 'stdio', command: 'new-cmd',
    })])
    const parsed = parseMcpPatch(rebuilt)
    expect(parsed.map(s => s.id).sort()).toEqual(['mcp-github', 'mcp-new'])
    expect(parsed.find(s => s.id === 'mcp-github')?.serverName).toBe('gh2')
    // Foreign row + preamble survive verbatim.
    expect(rebuilt).toContain('# preamble comment')
    expect(rebuilt).toContain('- id: system-prompt')
    expect(rebuilt).toContain('persona: hi')
  })

  it('handles CRLF input and keeps a single trailing newline', () => {
    const crlf = GITHUB_PATCH.replaceAll('\n', '\r\n')
    const rebuilt = rebuildMcpPatchText(crlf, parseMcpPatch(crlf))
    expect(rebuilt.endsWith('\n')).toBe(true)
    expect(rebuilt.endsWith('\r\n')).toBe(false)
    expect(rebuilt).toContain('serverName: github')
  })
})

describe('validateServerEntry', () => {
  it('accepts a valid entry', () => {
    expect(() => { validateServerEntry(entry({ command: 'cmd' }), []) }).not.toThrow()
  })

  it('rejects a duplicate serverName and a duplicate id', () => {
    expect(() => { validateServerEntry(entry({ id: 'mcp-a' }), [entry({ id: 'mcp-b' })]) })
      .toThrow(/already used/)
    expect(() => { validateServerEntry(entry({ id: 'mcp-a' }), [entry({ id: 'mcp-a' })]) })
      .toThrow(/already used/)
  })

  it('rejects transport-required fields missing', () => {
    expect(() => { validateServerEntry(entry({ transport: 'streamable-http' }), []) })
      .toThrow(/needs a url/)
    expect(() => { validateServerEntry(entry({ transport: 'stdio' }), []) })
      .toThrow(/needs a command/)
  })

  it('rejects an env value without an env name', () => {
    const server = entry({
      transport: 'streamable-http',
      url: 'https://x.example/mcp',
      headers: [{ name: 'Authorization', value: { kind: 'env' } }],
    })
    expect(() => { validateServerEntry(server, []) }).toThrow(/environment variable name/)
  })

  it('rejects invalid ids and serverNames as McpConfigError', () => {
    expect(() => { validateServerEntry(entry({ id: 'bad id' }), []) }).toThrow(McpConfigError)
    expect(() => { validateServerEntry(entry({ serverName: 'x'.repeat(33) }), []) }).toThrow(McpConfigError)
  })
})
