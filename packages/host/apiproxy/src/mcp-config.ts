/**
 * MCP server rows of the home-level user patch file
 * (`$DSH_HOME/cordis.patch.yml`): pure parse/rebuild plus file access,
 * separate from the RPC surface so the text contract stays unit-testable.
 * Only rows whose `name` is the mcp-client plugin are managed; every other
 * row and comment survives a rebuild verbatim.
 */

import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type { McpHeaderOrEnv, McpServerEntry, McpValue } from './api/mcp.ts'

/** The bridge plugin every managed row mounts. */
export const MCP_PLUGIN_NAME = '@deepseek-ai/dsh-mcp-client'

const SERVER_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const ENV_INTERP = /\$\{process\.env\.([A-Za-z_][A-Za-z0-9_]*)\}/

/** Business rejection raised by {@link validateServerEntry}; callers map it to `mcp-config-invalid`. */
export class McpConfigError extends Error {}

/** Absolute path of the home-level user patch file. */
export function mcpPatchPath(): string {
  return join(resolveDshHome(), 'cordis.patch.yml')
}

/** Read the home patch text; an absent file is an empty document. */
export function loadMcpPatch(file = mcpPatchPath()): string {
  try {
    return readFileSync(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

/** Write the home patch atomically (tmp + rename) so a concurrent HMR read sees a whole file. */
export function storeMcpPatch(text: string, file = mcpPatchPath()): void {
  const tmp = join(dirname(file), '.cordis.patch.yml.tmp')
  writeFileSync(tmp, text, 'utf8')
  renameSync(tmp, file)
}

interface RawEntry {
  lines: readonly string[]
  name: string | null
}

/** Split the file text into top-level rows (`- ` at column 0) plus the preamble. */
function splitRawEntries(lines: readonly string[]): { preamble: string[]; entries: RawEntry[] } {
  const starts: number[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line !== undefined && /^- /.test(line)) starts.push(i)
  }
  const preamble = lines.slice(0, starts[0] ?? lines.length)
  const entries: RawEntry[] = []
  for (let i = 0; i < starts.length; i += 1) {
    const end = i + 1 < starts.length ? starts[i + 1] : lines.length
    const block = lines.slice(starts[i], end)
    let name: string | null = null
    for (const line of block) {
      const match = line.match(/^ {6}name: (.*)$/)
      if (match !== null && match[1] !== undefined) {
        name = match[1].trim().replace(/^['"]|['"]$/g, '')
        break
      }
    }
    entries.push({ lines: block, name })
  }
  return { preamble, entries }
}

function unquoteYamlScalar(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'")
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"')
  }
  return trimmed
}

function parseEntryValue(text: string): McpValue {
  const trimmed = text.trim()
  if (!trimmed.startsWith('!!js')) return { kind: 'literal', value: unquoteYamlScalar(trimmed) }
  const expr = trimmed.slice(4).trim()
  const bare = expr.match(/^process\.env\.([A-Za-z_][A-Za-z0-9_]*)$/)
  if (bare !== null && bare[1] !== undefined) {
    return { kind: 'env', env: bare[1], prefix: '', suffix: '' }
  }
  if (expr.startsWith("'") && expr.endsWith("'")) {
    let inner = expr.slice(1, -1).replace(/''/g, "'")
    // The !!js value is a backtick template; the backticks are template syntax,
    // not prefix/suffix text.
    if (inner.startsWith('`') && inner.endsWith('`')) inner = inner.slice(1, -1)
    const match = ENV_INTERP.exec(inner)
    if (match !== null && match[1] !== undefined) {
      const prefix = inner.slice(0, match.index)
      const suffix = inner.slice(match.index + match[0].length)
      return { kind: 'env', env: match[1], prefix, suffix }
    }
  }
  // Unrecognized !!js expression: keep the exact text so a rebuild never rewrites it.
  return { kind: 'literal', value: trimmed }
}

function parseArgsFlow(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [trimmed]
  const raw = trimmed.slice(1, -1)
  const out: string[] = []
  let current = ''
  let quote: string | null = null
  for (const ch of raw) {
    if (quote !== null) {
      current += ch
      if (ch === quote) quote = null
    } else if (ch === "'" || ch === '"') {
      quote = ch
      current += ch
    } else if (ch === ',') {
      out.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  const last = current.trim()
  if (last !== '') out.push(last)
  return out.map(unquoteYamlScalar)
}

/** Parse one config block (indent-8 keys under `config:`) into a server entry. */
function parseEntryConfig(entryLines: readonly string[]): McpServerEntry | null {
  let idValue: string | undefined
  let afterConfig: string[] | undefined
  for (let i = 0; i < entryLines.length; i += 1) {
    const line = entryLines[i]
    if (line === undefined) continue
    if (idValue === undefined) {
      const match = line.match(/^ {4}- id: (.*)$/)
      if (match !== null && match[1] !== undefined) idValue = unquoteYamlScalar(match[1])
    }
    if (afterConfig === undefined && /^ {6}config: *$/.test(line)) afterConfig = entryLines.slice(i + 1)
  }
  if (idValue === undefined || afterConfig === undefined) return null

  const entry: McpServerEntry = {
    id: idValue,
    serverName: '',
    transport: 'stdio',
    headers: [],
    args: [],
    env: [],
    extra: [],
  }
  let container: 'headers' | 'env' | null = null
  let sawTransport = false
  let sawServerName = false
  for (const line of afterConfig) {
    const keyMatch = line.match(/^ {8}([A-Za-z][A-Za-z0-9]*):(.*)$/)
    const itemMatch = line.match(/^ {10}([^:]+):(.*)$/)
    if (keyMatch !== null && keyMatch[1] !== undefined) {
      const key = keyMatch[1]
      const raw = keyMatch[2] === undefined ? '' : keyMatch[2].trim()
      container = key === 'headers' || key === 'env' ? key : null
      switch (key) {
        case 'serverName':
          entry.serverName = unquoteYamlScalar(raw)
          sawServerName = true
          break
        case 'transport':
          if (raw === 'stdio' || raw === 'streamable-http') {
            entry.transport = raw
            sawTransport = true
          }
          break
        case 'url':
          entry.url = unquoteYamlScalar(raw)
          break
        case 'command':
          entry.command = unquoteYamlScalar(raw)
          break
        case 'cwd':
          entry.cwd = unquoteYamlScalar(raw)
          break
        case 'args':
          entry.args = parseArgsFlow(raw)
          break
        case 'toolCallTimeoutMs': {
          const value = Number(raw)
          if (Number.isInteger(value) && value > 0) entry.toolCallTimeoutMs = value
          break
        }
        case 'headers':
        case 'env':
          // Container keys own the following indent-10 item lines.
          break
        default:
          entry.extra.push(line)
          break
      }
    } else if (itemMatch !== null && itemMatch[1] !== undefined && container !== null) {
      const value = parseEntryValue(itemMatch[2] === undefined ? '' : itemMatch[2])
      if (container === 'headers') entry.headers.push({ name: itemMatch[1].trim(), value })
      else entry.env.push({ name: itemMatch[1].trim(), value })
    }
  }
  if (!sawServerName || !sawTransport) return null
  return entry
}

/** Parse every managed MCP row of the home patch text. */
export function parseMcpPatch(text: string): McpServerEntry[] {
  const { entries } = splitRawEntries(text.split(/\r?\n/))
  const servers: McpServerEntry[] = []
  for (const entry of entries) {
    if (entry.name !== MCP_PLUGIN_NAME) continue
    const parsed = parseEntryConfig(entry.lines)
    if (parsed !== null) servers.push(parsed)
  }
  return servers
}

interface ManagedEntry {
  id: string
  lines: readonly string[]
}

/** The managed rows: id (from `- id:`) with the raw block, or null on an unparseable row. */
function managedEntries(entries: readonly RawEntry[]): Array<ManagedEntry | null> {
  const out: Array<ManagedEntry | null> = []
  for (const entry of entries) {
    if (entry.name !== MCP_PLUGIN_NAME) continue
    const parsed = parseEntryConfig(entry.lines)
    if (parsed === null) {
      out.push(null)
      continue
    }
    out.push({ id: parsed.id, lines: entry.lines })
  }
  return out
}

function quoteYamlLiteral(value: string): string {
  if (/^!!js\b/.test(value)) return value
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) return value
  // Plain YAML scalars stay unquoted when the text is a safe token.
  if (/^[A-Za-z0-9_][A-Za-z0-9._\-/:?#@&=+%()\[\]~]*$/.test(value) && !/[:#]\s/.test(value)) return value
  return `'${value.replaceAll("'", "''")}'`
}

function serializeValue(value: McpValue): string {
  if (value.kind === 'literal') {
    if (value.value === undefined) throw new McpConfigError('literal value is missing its text')
    return quoteYamlLiteral(value.value)
  }
  const env = value.env
  if (env === undefined || !ENV_NAME_RE.test(env)) {
    throw new McpConfigError(`invalid environment variable name: ${String(env)}`)
  }
  const prefix = value.prefix ?? ''
  const suffix = value.suffix ?? ''
  if (prefix === '' && suffix === '') return `!!js process.env.${env}`
  const inner = `${prefix}\${process.env.${env}}${suffix}`.replaceAll("'", "''")
  return `!!js '\`${inner}\`'`
}

function serializeContainer(pairs: readonly McpHeaderOrEnv[]): string[] {
  const lines: string[] = []
  for (const pair of pairs) {
    if (pair.name === '' || /[\r\n]/.test(pair.name)) {
      throw new McpConfigError(`invalid header/env name: ${JSON.stringify(pair.name)}`)
    }
    lines.push(`          ${pair.name}: ${serializeValue(pair.value)}`)
  }
  return lines
}

function serializeEntry(entry: McpServerEntry): string[] {
  const lines = [
    '- insert:',
    `    - id: ${entry.id}`,
    `      name: '${MCP_PLUGIN_NAME}'`,
    '      config:',
    `        serverName: ${entry.serverName}`,
    `        transport: ${entry.transport}`,
  ]
  if (entry.toolCallTimeoutMs !== undefined) {
    lines.push(`        toolCallTimeoutMs: ${entry.toolCallTimeoutMs}`)
  }
  if (entry.transport === 'streamable-http') {
    if (entry.url === undefined || entry.url.trim() === '') {
      throw new McpConfigError('streamable-http server needs a url')
    }
    lines.push(`        url: ${quoteYamlLiteral(entry.url)}`)
    if (entry.headers.length > 0) {
      lines.push('        headers:')
      lines.push(...serializeContainer(entry.headers))
    }
  } else {
    if (entry.command === undefined || entry.command.trim() === '') {
      throw new McpConfigError('stdio server needs a command')
    }
    lines.push(`        command: ${quoteYamlLiteral(entry.command)}`)
    if (entry.args.length > 0) {
      lines.push(`        args: [${entry.args.map(quoteYamlLiteral).join(', ')}]`)
    }
    if (entry.cwd !== undefined) {
      lines.push(`        cwd: ${quoteYamlLiteral(entry.cwd)}`)
    }
    if (entry.env.length > 0) {
      lines.push('        env:')
      lines.push(...serializeContainer(entry.env))
    }
  }
  for (const line of entry.extra) lines.push(line)
  return lines
}

/**
 * Rebuild the home patch text: managed MCP rows are replaced by
 * {@link servers}; every other row, preamble comment, and trailing content
 * survives verbatim. A managed row missing from `servers` is removed; a
 * managed row the parser could not read stays as-is (never silently dropped).
 */
export function rebuildMcpPatchText(text: string, servers: readonly McpServerEntry[]): string {
  const lines = text.split(/\r?\n/)
  const { preamble, entries } = splitRawEntries(lines)
  const managed = managedEntries(entries)
  const built: string[] = [...preamble]
  for (let i = 0; i < entries.length; i += 1) {
    const raw = entries[i]
    if (raw === undefined) continue
    if (raw.name !== MCP_PLUGIN_NAME) {
      built.push(...raw.lines)
      continue
    }
    const current = managed[i] ?? null
    if (current === null) {
      // Unreadable managed row: keep the original text rather than guessing.
      built.push(...raw.lines)
      continue
    }
    const next = servers.find(s => s.id === current.id)
    // Content-bearing comment lines that sat inside the old block move above
    // its regenerated text; blank separators come from the block layout.
    const preserved = raw.lines.filter(line => line.trim() !== '' && /^\s*#/.test(line))
    built.push(...preserved)
    if (next === undefined) continue // removed
    built.push(...serializeEntry(next))
  }
  const presentIds = new Set(entries.map((_raw, i) => managed[i]?.id).filter((id): id is string => id !== undefined))
  for (const server of servers) {
    if (presentIds.has(server.id)) continue
    built.push(...serializeEntry(server))
  }
  return `${built.join('\n').replace(/\n*$/, '')}\n`
}

/**
 * Validate one entry for save: identity patterns, transport-required
 * fields, and uniqueness against the other live rows.
 * @throws {@link McpConfigError} with the first violation.
 */
export function validateServerEntry(entry: McpServerEntry, others: readonly McpServerEntry[]): void {
  if (!ID_RE.test(entry.id)) {
    throw new McpConfigError(`id must be 1-64 URL-safe chars: ${JSON.stringify(entry.id)}`)
  }
  if (!SERVER_NAME_RE.test(entry.serverName)) {
    throw new McpConfigError(`serverName must be 1-32 chars of [A-Za-z0-9_-]: ${JSON.stringify(entry.serverName)}`)
  }
  for (const other of others) {
    if (other.id === entry.id) {
      throw new McpConfigError(`id already used by another server: ${entry.id}`)
    }
    if (other.serverName === entry.serverName) {
      throw new McpConfigError(`serverName already used by another server: ${entry.serverName}`)
    }
  }
  if (entry.transport === 'streamable-http') {
    if (entry.url === undefined || entry.url.trim() === '') {
      throw new McpConfigError('streamable-http server needs a url')
    }
  } else if (entry.command === undefined || entry.command.trim() === '') {
    throw new McpConfigError('stdio server needs a command')
  }
  for (const pair of [...entry.headers, ...entry.env]) {
    if (pair.value.kind === 'env' && pair.value.env === undefined) {
      throw new McpConfigError(`${pair.name} value needs an environment variable name`)
    }
  }
}
