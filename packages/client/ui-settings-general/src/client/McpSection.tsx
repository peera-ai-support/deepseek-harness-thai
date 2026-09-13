/** The MCP servers settings section: list, add, edit, and remove mcp-client rows of the home patch file, with live connection status. */

import { useCallback, useEffect, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { McpOperations } from './mcp-operations.ts'
import type { McpHeaderOrEnv, McpServerEntry, McpServerStatus, McpValue } from '@deepseek-ai/dsh-api-remotes/client'
import { GitHubIcon } from './GitHubIcon.tsx'
import {
  BrowserIcon,
  DatabaseIcon,
  FetchIcon,
  FolderIcon,
  GitIcon,
  MemoryIcon,
  SearchIcon,
} from './catalog-icons.tsx'
import { CustomAppLogo, DockerLogo, NotionLogo, SlackLogo, SupabaseLogo, VercelLogo } from './brand-logos.tsx'
import css from './McpSection.module.css'

function GlobeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function TerminalIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}

function CopyIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/** Registrant-owned dependencies of {@link McpSection}. */
export interface McpSectionInjected {
  /** Host operations over the mcp Remote namespace. */
  ops: McpOperations
}

/** Section owner share, localized copy, and the registrant's state face. */
export type McpSectionComponentProps =
  PropsRuntime<'settings.section'> & PropsLocale<'settings'> & InjectFace<McpSectionInjected>

/** The simple form-model of one server. Headers/env are edited as JSON with `$env:VAR` values. */
interface Draft {
  id: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  url: string
  command: string
  args: string
  cwd: string
  timeoutMs: string
  headersJson: string
  envJson: string
  extra: string[]
  disabled?: boolean
}

type UiStatus =
  | { kind: 'loading' }
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

/** Which editor the add/edit card shows. */
type EditorMode = 'form' | 'json'

/** How often live connection statuses refresh while the section is shown. */
const STATUS_POLL_MS = 5_000

/** `$env:VAR` marker used inside headers/env JSON values. */
const ENV_MARKER = '$env:'

/** Values at least this long are treated as pasted secrets and exported on save. */
const SECRET_MIN_LENGTH = 16

function secretEnvName(serverName: string, key: string): string {
  const clean = (text: string) => (text.toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'X')
  return `DSH_MCP_${clean(serverName)}_${clean(key)}`
}

/** Item fetched from the Smithery online registry. */
interface OnlineServerItem {
  id: string
  qualifiedName: string
  displayName: string
  description: string
  iconUrl?: string
  verified?: boolean
  useCount?: number
  homepage?: string
}

function formatUses(count?: number): string {
  if (count === undefined || count === null) return '0'
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`
  return String(count)
}

/** One ready-made (extension-like) server preset: fill only the token, everything else is predefined. */
interface QuickPreset {
  id: string
  serverName: string
  category: 'web' | 'database' | 'dev'
  transport: 'streamable-http' | 'stdio'
  url?: string
  command?: string
  args?: string[]
  headerName: string
  envName: string
  tokenBearerWrap?: boolean
  tokenAsArg?: boolean
  /** Brand mark shown as the catalog icon. */
  icon: ({ size }: { size?: number }) => React.JSX.Element
  /** Optional additional text input shown on the card (e.g. a folder path). */
  extraTextLabelKey?:
    | 'mcp.quick.pathLabel.filesystem'
    | 'mcp.quick.pathLabel.sqlite'
    | 'mcp.quick.pathLabel.git'
  /** Extra env built from the user's home directory (e.g. a memory file path). */
  buildEnv?: (homeDir: string) => McpHeaderOrEnv[]
  /** Whether the extra text input is required before install. */
  requiresExtraText?: boolean
  titleKey:
    | 'mcp.quick.title.mcp-github'
    | 'mcp.quick.title.mcp-memory'
    | 'mcp.quick.title.mcp-filesystem'
    | 'mcp.quick.title.mcp-brave'
    | 'mcp.quick.title.mcp-fetch'
    | 'mcp.quick.title.mcp-puppeteer'
    | 'mcp.quick.title.mcp-sqlite'
    | 'mcp.quick.title.mcp-postgres'
    | 'mcp.quick.title.mcp-git'
  hintKey:
    | 'mcp.quick.hint.mcp-github'
    | 'mcp.quick.hint.mcp-memory'
    | 'mcp.quick.hint.mcp-filesystem'
    | 'mcp.quick.hint.mcp-brave'
    | 'mcp.quick.hint.mcp-fetch'
    | 'mcp.quick.hint.mcp-puppeteer'
    | 'mcp.quick.hint.mcp-sqlite'
    | 'mcp.quick.hint.mcp-postgres'
    | 'mcp.quick.hint.mcp-git'
  tokenKey?:
    | 'mcp.quick.tokenLabel.mcp-github'
    | 'mcp.quick.tokenLabel.mcp-brave'
    | 'mcp.quick.tokenLabel.mcp-postgres'
}

/** Predefined quick-install presets. Add a row here (plus its locale keys) to offer another server. */
const QUICK_PRESETS: readonly QuickPreset[] = [
  {
    id: 'mcp-github',
    serverName: 'github',
    category: 'dev',
    transport: 'streamable-http',
    url: 'https://api.githubcopilot.com/mcp/',
    headerName: 'Authorization',
    envName: 'DSH_MCP_GITHUB_AUTHORIZATION',
    tokenBearerWrap: true,
    icon: GitHubIcon,
    titleKey: 'mcp.quick.title.mcp-github',
    hintKey: 'mcp.quick.hint.mcp-github',
    tokenKey: 'mcp.quick.tokenLabel.mcp-github',
  },
  {
    id: 'mcp-memory',
    serverName: 'memory',
    category: 'database',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    headerName: '',
    envName: '',
    icon: MemoryIcon,
    buildEnv: homeDir => [{
      name: 'MEMORY_FILE_PATH',
      value: { kind: 'literal', value: `${homeDir}\\mcp-memory.jsonl` },
    }],
    titleKey: 'mcp.quick.title.mcp-memory',
    hintKey: 'mcp.quick.hint.mcp-memory',
  },
  {
    id: 'mcp-fetch',
    serverName: 'fetch',
    category: 'web',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    headerName: '',
    envName: '',
    icon: FetchIcon,
    titleKey: 'mcp.quick.title.mcp-fetch',
    hintKey: 'mcp.quick.hint.mcp-fetch',
  },
  {
    id: 'mcp-puppeteer',
    serverName: 'puppeteer',
    category: 'web',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    headerName: '',
    envName: '',
    icon: BrowserIcon,
    titleKey: 'mcp.quick.title.mcp-puppeteer',
    hintKey: 'mcp.quick.hint.mcp-puppeteer',
  },
  {
    id: 'mcp-brave',
    serverName: 'brave',
    category: 'web',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    headerName: '',
    envName: 'BRAVE_API_KEY',
    tokenBearerWrap: false,
    icon: SearchIcon,
    titleKey: 'mcp.quick.title.mcp-brave',
    hintKey: 'mcp.quick.hint.mcp-brave',
    tokenKey: 'mcp.quick.tokenLabel.mcp-brave',
  },
  {
    id: 'mcp-sqlite',
    serverName: 'sqlite',
    category: 'database',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    headerName: '',
    envName: '',
    icon: DatabaseIcon,
    extraTextLabelKey: 'mcp.quick.pathLabel.sqlite',
    requiresExtraText: true,
    titleKey: 'mcp.quick.title.mcp-sqlite',
    hintKey: 'mcp.quick.hint.mcp-sqlite',
  },
  {
    id: 'mcp-postgres',
    serverName: 'postgres',
    category: 'database',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    headerName: '',
    envName: 'DATABASE_URL',
    tokenBearerWrap: false,
    tokenAsArg: true,
    icon: DatabaseIcon,
    titleKey: 'mcp.quick.title.mcp-postgres',
    hintKey: 'mcp.quick.hint.mcp-postgres',
    tokenKey: 'mcp.quick.tokenLabel.mcp-postgres',
  },
  {
    id: 'mcp-git',
    serverName: 'git',
    category: 'dev',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git'],
    headerName: '',
    envName: '',
    icon: GitIcon,
    extraTextLabelKey: 'mcp.quick.pathLabel.git',
    requiresExtraText: true,
    titleKey: 'mcp.quick.title.mcp-git',
    hintKey: 'mcp.quick.hint.mcp-git',
  },
  {
    id: 'mcp-filesystem',
    serverName: 'filesystem',
    category: 'dev',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
    headerName: '',
    envName: '',
    icon: FolderIcon,
    extraTextLabelKey: 'mcp.quick.pathLabel.filesystem',
    requiresExtraText: true,
    titleKey: 'mcp.quick.title.mcp-filesystem',
    hintKey: 'mcp.quick.hint.mcp-filesystem',
  },
]

/** The ready-made entry for one preset with either a token-held header, a path argument, or nothing. */
function quickEntry(preset: QuickPreset, homeDir: string, extraText = '', token = ''): McpServerEntry {
  const args = [...(preset.args ?? [])]
  if (preset.extraTextLabelKey !== undefined && extraText.trim() !== '') {
    args.push(extraText.trim())
  }
  if (preset.tokenAsArg && token.trim() !== '') {
    args.push(token.trim())
  }
  const envList: McpHeaderOrEnv[] = preset.buildEnv === undefined ? [] : preset.buildEnv(homeDir)
  if (preset.transport === 'stdio' && preset.envName !== '' && !preset.tokenAsArg) {
    envList.push({ name: preset.envName, value: { kind: 'env', env: preset.envName } })
  }
  return {
    id: preset.id,
    serverName: preset.serverName,
    transport: preset.transport,
    ...(preset.transport === 'streamable-http' ? { url: preset.url } : {}),
    headers: preset.headerName === ''
      ? []
      : [{ name: preset.headerName, value: { kind: 'env', env: preset.envName } }],
    args,
    env: envList,
    extra: [],
    ...(preset.command !== undefined ? { command: preset.command } : {}),
  }
}

/** Directory part of a path using either separator (paths come from the host, so both OS styles occur). */
function dirnameOf(pathText: string): string {
  const index = Math.max(pathText.lastIndexOf('/'), pathText.lastIndexOf(String.fromCharCode(92)))
  return index < 0 ? pathText : pathText.slice(0, index)
}

function emptyDraft(): Draft {
  return {
    id: '', serverName: '', transport: 'streamable-http', url: '', command: '',
    args: '', cwd: '', timeoutMs: '', headersJson: '', envJson: '', extra: [],
    disabled: false,
  }
}

// ---- JSON value helpers (headers/env) ----
/** Serialize one value for the JSON editor; env refs use the `$env:VAR` marker. */
function valueToJsonString(value: McpValue): string {
  if (value.kind === 'env') return `${value.prefix ?? ''}${ENV_MARKER}${value.env ?? ''}${value.suffix ?? ''}`
  return value.value ?? ''
}

/** Parse one JSON string value; a single `$env:VAR` marker becomes an env ref. */
function jsonStringToValue(text: string, name: string): McpValue {
  const first = text.indexOf(ENV_MARKER)
  if (first < 0) return { kind: 'literal', value: text }
  const second = text.indexOf(ENV_MARKER, first + ENV_MARKER.length)
  if (second >= 0) throw new Error(`"${name}" uses $env: at most once`)
  const envStart = first + ENV_MARKER.length
  let envEnd = envStart
  while (envEnd < text.length) {
    const ch = text[envEnd]
    if (ch === undefined || !/[A-Za-z0-9_]/.test(ch)) break
    envEnd += 1
  }
  const env = text.slice(envStart, envEnd)
  if (env === '') throw new Error(`"${name}" has $env: without a variable name`)
  return {
    kind: 'env',
    env,
    ...(first === 0 ? {} : { prefix: text.slice(0, first) }),
    ...(envEnd < text.length ? { suffix: text.slice(envEnd) } : {}),
  }
}

/** Serialize pairs to pretty JSON text for the editor. */
function pairsToJsonText(pairs: readonly McpHeaderOrEnv[]): string {
  if (pairs.length === 0) return ''
  const lines = pairs.map(p => `  ${JSON.stringify(p.name)}: ${JSON.stringify(valueToJsonString(p.value))}`)
  return `{\n${lines.join(',\n')}\n}`
}

/** Parse JSON-object editor text into validated pairs; throws with a parse or semantic message. */
function jsonTextToPairs(text: string): McpHeaderOrEnv[] {
  const trimmed = text.trim()
  if (trimmed === '') return []
  const parsed: unknown = JSON.parse(trimmed)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('must be an object such as {"Authorization": "Bearer xxx"}')
  }
  const pairs: McpHeaderOrEnv[] = []
  for (const [name, raw] of Object.entries(parsed)) {
    if (typeof raw !== 'string') throw new Error(`"${name}" must be a string`)
    pairs.push({ name, value: jsonStringToValue(raw, name) })
  }
  return pairs
}

/** Serialize the whole draft to JSON for the JSON editor. */
function draftToJsonText(draft: Draft): string {
  const body: Record<string, unknown> = {
    serverName: draft.serverName,
    transport: draft.transport,
    ...(draft.transport === 'streamable-http' ? { url: draft.url } : {}),
    ...(draft.transport === 'stdio'
      ? { command: draft.command, args: draft.args.trim() === '' ? [] : draft.args.trim().split(/\s+/) }
      : {}),
    ...(draft.cwd.trim() === '' ? {} : { cwd: draft.cwd }),
    ...(draft.timeoutMs.trim() === '' ? {} : { timeoutMs: Number(draft.timeoutMs) }),
    ...(draft.id.trim() === '' ? {} : { id: draft.id }),
    ...(draft.disabled ? { disabled: true } : {}),
  }
  return JSON.stringify(body, null, 2)
}

/** Parse JSON editor text back into a draft; throws with a message on bad shapes. */
function jsonTextToDraft(text: string): Draft {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('must be a single server object')
  }
  const raw = parsed as Record<string, unknown>
  const allowed = new Set(['id', 'serverName', 'transport', 'url', 'command', 'args', 'cwd', 'timeoutMs', 'headers', 'env', 'disabled'])
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) throw new Error(`unknown key "${key}"`)
  }
  const transport = raw.transport === 'stdio' ? 'stdio' as const : 'streamable-http' as const
  const pairsFrom = (value: unknown): McpHeaderOrEnv[] => {
    if (value === undefined) return []
    return jsonTextToPairs(JSON.stringify(value, null, 2))
  }
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    serverName: typeof raw.serverName === 'string' ? raw.serverName : '',
    transport,
    url: typeof raw.url === 'string' ? raw.url : '',
    command: typeof raw.command === 'string' ? raw.command : '',
    args: Array.isArray(raw.args) ? raw.args.map(String).join(' ') : '',
    cwd: typeof raw.cwd === 'string' ? raw.cwd : '',
    timeoutMs: typeof raw.timeoutMs === 'number' && Number.isInteger(raw.timeoutMs) && raw.timeoutMs > 0
      ? String(raw.timeoutMs)
      : '',
    headersJson: pairsToJsonText(pairsFrom(raw.headers)),
    envJson: pairsToJsonText(pairsFrom(raw.env)),
    extra: [],
    disabled: typeof raw.disabled === 'boolean' ? raw.disabled : false,
  }
}

/** Draft → wire entry; the RPC re-validates everything server-side. */
function draftToEntry(draft: Draft): McpServerEntry {
  const id = draft.id.trim() !== '' ? draft.id.trim() : `mcp-${draft.serverName}`
  const timeout = Number(draft.timeoutMs.trim())
  return {
    id,
    serverName: draft.serverName,
    transport: draft.transport,
    ...(draft.transport === 'streamable-http' ? { url: draft.url } : {}),
    headers: jsonTextToPairs(draft.headersJson),
    ...(draft.transport === 'stdio' ? { command: draft.command } : {}),
    args: draft.args.trim() === '' ? [] : draft.args.trim().split(/\s+/),
    ...(draft.cwd.trim() === '' ? {} : { cwd: draft.cwd }),
    env: jsonTextToPairs(draft.envJson),
    ...(draft.timeoutMs.trim() === '' || !Number.isInteger(timeout) || timeout <= 0
      ? {}
      : { toolCallTimeoutMs: timeout }),
    extra: draft.extra,
    ...(draft.disabled ? { disabled: true } : {}),
  }
}

/** Wire entry → draft for editing. */
function toDraft(server: McpServerEntry): Draft {
  return {
    id: server.id,
    serverName: server.serverName,
    transport: server.transport,
    url: server.url ?? '',
    command: server.command ?? '',
    args: server.args.join(' '),
    cwd: server.cwd ?? '',
    timeoutMs: server.toolCallTimeoutMs === undefined ? '' : String(server.toolCallTimeoutMs),
    headersJson: pairsToJsonText(server.headers),
    envJson: pairsToJsonText(server.env),
    extra: [...server.extra],
    disabled: server.disabled ?? false,
  }
}

/** The status chip label for one status entry. */
function statusLabel(status: McpServerStatus | undefined, t: McpSectionComponentProps['t']): string {
  if (status === undefined) return t('mcp.status.unknown')
  switch (status.phase) {
    case 'connecting': return t('mcp.status.connecting')
    case 'connected': return t('mcp.status.connected')
    case 'reconnecting': return t('mcp.status.reconnecting', { attempt: status.attempt ?? 1 })
    case 'disabled': return t('mcp.status.disabled')
    default: return t('mcp.status.unknown')
  }
}

interface ResolvedServerLogoInfo {
  icon: React.JSX.Element
  className: string
  badge: string
}

function resolveServerInfo(server: McpServerEntry, onlineServers: OnlineServerItem[]): ResolvedServerLogoInfo {
  const name = server.serverName.toLowerCase()
  const cmd = (server.command ?? '').toLowerCase()
  const argsStr = server.args.join(' ').toLowerCase()
  const url = (server.url ?? '').toLowerCase()

  // 1. Specific Brand Logos
  if (name.includes('github') || url.includes('github') || argsStr.includes('github')) {
    return {
      icon: <GitHubIcon size={22} />,
      className: css.logo_github ?? '',
      badge: 'GitHub',
    }
  }
  if (name.includes('vercel') || url.includes('vercel') || argsStr.includes('vercel')) {
    return {
      icon: <VercelLogo size={20} />,
      className: css.logo_vercel ?? '',
      badge: 'Vercel',
    }
  }
  if (name.includes('supabase') || url.includes('supabase') || argsStr.includes('supabase')) {
    return {
      icon: <SupabaseLogo size={22} />,
      className: css.logo_supabase ?? '',
      badge: 'Supabase',
    }
  }
  if (name.includes('memory') || argsStr.includes('server-memory')) {
    return {
      icon: <MemoryIcon size={22} />,
      className: css.logo_memory ?? '',
      badge: 'Memory',
    }
  }
  if (name.includes('slack') || argsStr.includes('slack')) {
    return {
      icon: <SlackLogo size={22} />,
      className: css.logo_slack ?? '',
      badge: 'Slack',
    }
  }
  if (name.includes('docker') || argsStr.includes('docker')) {
    return {
      icon: <DockerLogo size={22} />,
      className: css.logo_docker ?? '',
      badge: 'Docker',
    }
  }
  if (name.includes('notion') || argsStr.includes('notion')) {
    return {
      icon: <NotionLogo size={22} />,
      className: css.logo_notion ?? '',
      badge: 'Notion',
    }
  }
  if (name.includes('postgres') || argsStr.includes('server-postgres') || name.includes('pg')) {
    return {
      icon: <DatabaseIcon size={22} />,
      className: css.logo_postgres ?? '',
      badge: 'PostgreSQL',
    }
  }
  if (name.includes('sqlite') || argsStr.includes('server-sqlite')) {
    return {
      icon: <DatabaseIcon size={22} />,
      className: css.logo_sqlite ?? '',
      badge: 'SQLite',
    }
  }
  if (name.includes('brave') || argsStr.includes('server-brave')) {
    return {
      icon: <SearchIcon size={22} />,
      className: css.logo_brave ?? '',
      badge: 'Brave Search',
    }
  }
  if (name.includes('puppeteer') || argsStr.includes('server-puppeteer')) {
    return {
      icon: <BrowserIcon size={22} />,
      className: css.logo_puppeteer ?? '',
      badge: 'Puppeteer',
    }
  }
  if (name.includes('fetch') || argsStr.includes('server-fetch')) {
    return {
      icon: <FetchIcon size={22} />,
      className: css.logo_fetch ?? '',
      badge: 'Fetch',
    }
  }
  if (name.includes('git') || argsStr.includes('server-git')) {
    return {
      icon: <GitIcon size={22} />,
      className: css.logo_git ?? '',
      badge: 'Git',
    }
  }
  if (name.includes('filesystem') || argsStr.includes('server-filesystem') || name.includes('file')) {
    return {
      icon: <FolderIcon size={22} />,
      className: css.logo_filesystem ?? '',
      badge: 'Filesystem',
    }
  }

  // 2. Smithery online icon match
  const smitheryMatch = onlineServers.find((s) => {
    const qn = s.qualifiedName.toLowerCase()
    return qn.endsWith(`/${name}`) || qn === name || argsStr.includes(qn) || url.includes(qn)
  })
  if (smitheryMatch?.iconUrl) {
    return {
      icon: (
        <img
          src={smitheryMatch.iconUrl}
          alt={server.serverName}
          className={css.serverLogoImg}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ),
      className: css.logo_store ?? '',
      badge: smitheryMatch.displayName || 'Smithery',
    }
  }

  // 3. Custom local / desktop executable (e.g. lnwjud or custom exe)
  if (argsStr.includes('.exe') || cmd.includes('.exe') || argsStr.includes('desktop') || argsStr.includes('build') || name.includes('lnwjud')) {
    return {
      icon: <CustomAppLogo size={22} />,
      className: css.logo_custom ?? '',
      badge: 'Local App',
    }
  }

  // 4. Default fallback
  return {
    icon: server.transport === 'streamable-http' ? <GlobeIcon size={18} /> : <TerminalIcon size={18} />,
    className: css.logo_default ?? '',
    badge: server.transport === 'streamable-http' ? 'HTTP' : 'CLI',
  }
}

/**
 * Render the MCP section: the managed server list with live connection
 * statuses, plus a Form/JSON editor that inserts/replaces rows of
 * `$DSH_HOME/cordis.patch.yml` through the Host operations face. Secrets are entered as
 * `$env:VAR` references inside the JSON header values, never as literals.
 * @param props - section owner share, localized copy, and the Host operations face.
 * @returns the section element tree.
 */
export function McpSection({ ops, t }: McpSectionComponentProps) {
  const [servers, setServers] = useState<McpServerEntry[]>([])
  const [statuses, setStatuses] = useState<McpServerStatus[]>([])
  const [filePath, setFilePath] = useState('')
  const [status, setStatus] = useState<UiStatus>({ kind: 'loading' })
  const [draft, setDraft] = useState<Draft | null>(null)
  /** Which editor the open add/edit card uses. */
  const [editorMode, setEditorMode] = useState<EditorMode>('form')
  /** Raw JSON text while the JSON editor is active. */
  const [jsonText, setJsonText] = useState('')
  /** True when pasted literal secrets are exported to the user environment on save. */
  const [exportSecrets, setExportSecrets] = useState(true)
  /** Success note listing exported secret names (restart reminder). */
  const [secretNote, setSecretNote] = useState('')
  /** Quick-install draft: the token the user pasted into the one-field form. */
  const [quickToken, setQuickToken] = useState('')
  /** Quick-install in-flight marker. */
  const [quickBusy, setQuickBusy] = useState(false)
  /** Extra text input for catalog presets (e.g. the filesystem folder path). */
  const [quickPath, setQuickPath] = useState('')
  /** Preset or online server currently in-flight. */
  const [busyPresetId, setBusyPresetId] = useState<string | null>(null)
  /** Preset or online server recently saved for feedback animation. */
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null)
  /** Test connection state and result per server name. */
  const [testResults, setTestResults] = useState<Record<string, {
    testing?: boolean
    latencyMs?: number
    success?: boolean
    message?: string
    count?: number
  }>>({})
  /** Expanded tool list drawers by server id. */
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
  /** Copied identifier for feedback animation. */
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const disabledServerNames = new Set(servers.filter(s => s.disabled).map(s => s.serverName))
  const connectedCount = statuses.filter(s => s.phase === 'connected' && !disabledServerNames.has(s.serverName)).length
  const totalToolsCount = statuses
    .filter(s => !disabledServerNames.has(s.serverName))
    .reduce((sum, s) => sum + (s.tools?.length ?? 0), 0)

  const runTest = async (server: McpServerEntry) => {
    setTestResults(prev => ({ ...prev, [server.serverName]: { testing: true } }))
    const start = performance.now()
    try {
      const response = await ops.status()
      const latencyMs = Math.max(1, Math.round(performance.now() - start))
      if (response.ok) {
        setStatuses(response.value.statuses)
        const live = response.value.statuses.find(s => s.serverName === server.serverName)
        if (live?.phase === 'connected') {
          setTestResults(prev => ({
            ...prev,
            [server.serverName]: {
              testing: false,
              success: true,
              latencyMs,
              count: live.tools?.length ?? 0,
            },
          }))
          return
        }
        setTestResults(prev => ({
          ...prev,
          [server.serverName]: {
            testing: false,
            success: false,
            latencyMs,
            message: live?.error || (live ? statusLabel(live, t) : t('mcp.status.unknown')),
          },
        }))
        return
      }
      const failMessage = response.message
      setTestResults(prev => ({
        ...prev,
        [server.serverName]: {
          testing: false,
          success: false,
          latencyMs,
          message: failMessage,
        },
      }))
    } catch (error: unknown) {
      const latencyMs = Math.max(1, Math.round(performance.now() - start))
      setTestResults(prev => ({
        ...prev,
        [server.serverName]: {
          testing: false,
          success: false,
          latencyMs,
          message: error instanceof Error ? error.message : String(error),
        },
      }))
    }
  }

  const copyText = (id: string, text: string) => {
    if (!text) return
    void navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => {
      setCopiedId(prev => (prev === id ? null : prev))
    }, 1500)
  }

  const toggleTools = (serverId: string) => {
    setExpandedTools(prev => ({ ...prev, [serverId]: !prev[serverId] }))
  }

  const load = async () => {
    setStatus({ kind: 'loading' })
    try {
      const response = await ops.listServers()
      if (!response.ok) {
        setStatus({ kind: 'error', message: t('mcp.loadFailed', { message: response.message }) })
        return
      }
      setServers(response.value.servers)
      setFilePath(response.value.filePath)
      setStatus({ kind: 'idle' })
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.loadFailed', { message: String(error) }) })
    }
  }

  const loadStatus = async () => {
    try {
      const response = await ops.status()
      if (response.ok) setStatuses(response.value.statuses)
    } catch {
      // The snapshot is best-effort; the list itself already surfaced failures.
    }
  }

  useEffect(() => {
    void load()
    void loadStatus()
    const timer = setInterval(() => { void loadStatus() }, STATUS_POLL_MS)
    return () => { clearInterval(timer) }
  }, [])

  const openAdd = () => {
    setDraft(emptyDraft())
    setEditorMode('form')
    setJsonText('')
    setSecretNote('')
  }

  const openEdit = (server: McpServerEntry) => {
    setDraft(toDraft(server))
    setEditorMode('form')
    setJsonText('')
    setSecretNote('')
  }

  const closeForm = () => {
    setDraft(null)
    setJsonText('')
  }

  /** Move pasted literal secrets (long values) into the user environment and reference them by name. */
  const exportLiterals = async (server: McpServerEntry): Promise<{ entry: McpServerEntry; names: string[] }> => {
    if (!exportSecrets) return { entry: server, names: [] }
    const names: string[] = []
    const swapPairList = async (pairs: McpHeaderOrEnv[]): Promise<McpHeaderOrEnv[]> => {
      const out: McpHeaderOrEnv[] = []
      for (const pair of pairs) {
        if (pair.value.kind === 'literal' && (pair.value.value?.length ?? 0) >= SECRET_MIN_LENGTH) {
          const name = secretEnvName(server.serverName, pair.name)
          const response = await ops.importSecret(name, pair.value.value ?? '')
          if (!response.ok) {
            throw new Error(t('mcp.saveFailed', { message: response.message }))
          }
          names.push(name)
          out.push({ name: pair.name, value: { kind: 'env', env: name } })
          continue
        }
        out.push(pair)
      }
      return out
    }
    const [headers, env] = await Promise.all([swapPairList(server.headers), swapPairList(server.env)])
    return { entry: { ...server, headers, env }, names }
  }

  const saveDraft = async (next: Draft) => {
    let entry: McpServerEntry
    try {
      entry = draftToEntry(next)
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.jsonInvalid', { message: error instanceof Error ? error.message : String(error) }) })
      return
    }
    let exported: string[] = []
    try {
      const result = await exportLiterals(entry)
      entry = result.entry
      exported = result.names
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      return
    }
    setStatus({ kind: 'saving' })
    try {
      const response = await ops.upsertServer(entry)
      if (!response.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.message }) })
        return
      }
      setServers(response.value.servers)
      setSecretNote(exported.length > 0 ? t('mcp.exportedNote', { names: exported.join(', ') }) : '')
      closeForm()
      setStatus({ kind: 'saved' })
      void loadStatus()
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: String(error) }) })
    }
  }

  const saveCurrent = async () => {
    if (draft === null) return
    if (editorMode === 'json') {
      let parsed: Draft
      try {
        parsed = jsonTextToDraft(jsonText)
      } catch (error: unknown) {
        setStatus({ kind: 'error', message: t('mcp.jsonInvalid', { message: error instanceof Error ? error.message : String(error) }) })
        return
      }
      setDraft(parsed)
      await saveDraft(parsed)
      return
    }
    await saveDraft(draft)
  }

  const switchMode = (mode: EditorMode) => {
    if (mode === editorMode) return
    if (draft === null) return
    if (mode === 'json') {
      setJsonText(draftToJsonText(draft))
    } else {
      try {
        setDraft(jsonTextToDraft(jsonText))
      } catch {
        // Invalid JSON: stay on the JSON editor so the text is not lost.
        return
      }
    }
    setEditorMode(mode)
  }

  const remove = async (server: McpServerEntry) => {
    setStatus({ kind: 'saving' })
    try {
      const response = await ops.removeServer(server.id)
      if (!response.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.message }) })
        return
      }
      setServers(response.value.servers)
      setStatus({ kind: 'saved' })
      void loadStatus()
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: String(error) }) })
    }
  }

  const toggleServerEnabled = async (server: McpServerEntry) => {
    const nextDisabled = !server.disabled
    const optimisticEntry: McpServerEntry = nextDisabled ? { ...server, disabled: true } : (() => {
      const { disabled: _, ...rest } = server
      return rest
    })()
    // Optimistic update: toggle UI state immediately
    setServers(prev => prev.map(s => (s.id === server.id ? optimisticEntry : s)))
    try {
      const response = await ops.upsertServer(optimisticEntry)
      if (!response.ok) {
        setServers(prev => prev.map(s => (s.id === server.id ? server : s)))
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.message }) })
        return
      }
      setServers(response.value.servers)
      void loadStatus()
    } catch (error: unknown) {
      setServers(prev => prev.map(s => (s.id === server.id ? server : s)))
      setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: String(error) }) })
    }
  }

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'web' | 'database' | 'dev'>('all')
  const [presetTokens, setPresetTokens] = useState<Record<string, string>>({})
  const [presetPaths, setPresetPaths] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Online Registry (Smithery) states
  const [activeCatalogTab, setActiveCatalogTab] = useState<'presets' | 'registry'>('presets')
  const [onlineQuery, setOnlineQuery] = useState('')
  const [onlineServers, setOnlineServers] = useState<OnlineServerItem[]>([])
  const [onlineLoading, setOnlineLoading] = useState(false)
  const [onlineError, setOnlineError] = useState<string | null>(null)
  const [onlinePage, setOnlinePage] = useState(1)
  const [onlineTotal, setOnlineTotal] = useState(0)
  const [onlineTotalPages, setOnlineTotalPages] = useState(1)

  const fetchOnlineServers = useCallback(async (query: string, page = 1) => {
    setOnlineLoading(true)
    setOnlineError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '12',
      })
      if (query.trim() !== '') {
        params.set('q', query.trim())
      }
      const res = await fetch(`https://api.smithery.ai/servers?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json() as {
        servers?: OnlineServerItem[]
        pagination?: { totalCount?: number; totalPages?: number; currentPage?: number }
      }
      const items = data.servers ?? []
      setOnlineServers(page === 1 ? items : prev => [...prev, ...items])
      setOnlineTotal(data.pagination?.totalCount ?? items.length)
      setOnlineTotalPages(data.pagination?.totalPages ?? 1)
      setOnlinePage(page)
    } catch (err: unknown) {
      setOnlineError(String(err))
    } finally {
      setOnlineLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeCatalogTab !== 'registry') return
    const timer = setTimeout(() => {
      void fetchOnlineServers(onlineQuery, 1)
    }, 350)
    return () => { clearTimeout(timer) }
  }, [onlineQuery, activeCatalogTab, fetchOnlineServers])

  const openConfigureFromOnline = (server: OnlineServerItem) => {
    const id = `mcp-${server.qualifiedName.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    const serverName = server.qualifiedName.split('/').pop()?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'mcp_server'
    setDraft({
      id,
      serverName,
      transport: 'stdio',
      url: '',
      command: 'npx',
      args: `-y @smithery/cli@latest run ${server.qualifiedName}`,
      cwd: '',
      timeoutMs: '',
      headersJson: '{}',
      envJson: '{}',
      extra: [],
    })
    setEditorMode('form')
    setStatus({ kind: 'idle' })
  }

  const quickInstallFromOnline = async (server: OnlineServerItem) => {
    const id = `mcp-${server.qualifiedName.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    const serverName = server.qualifiedName.split('/').pop()?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'mcp_server'
    const entry: McpServerEntry = {
      id,
      serverName,
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@smithery/cli@latest', 'run', server.qualifiedName],
      headers: [],
      env: [],
      extra: [],
    }
    setQuickBusy(true)
    setBusyPresetId(server.id)
    try {
      const response = await ops.upsertServer(entry)
      if (!response.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.message }) })
        return
      }
      setServers(response.value.servers)
      setStatus({ kind: 'saved' })
      setRecentlySavedId(server.id)
      setTimeout(() => {
        setRecentlySavedId(prev => (prev === server.id ? null : prev))
      }, 2500)
      void loadStatus()
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: String(error) }) })
    } finally {
      setQuickBusy(false)
      setBusyPresetId(null)
    }
  }

  /** Install or update a ready-made preset: store any token, then upsert the whole predefined row. */
  const quickInstall = async (preset: QuickPreset, token = '', pathText = '') => {
    const activeToken = token.trim() !== '' ? token : quickToken
    const activePath = pathText.trim() !== '' ? pathText : quickPath
    if (preset.tokenKey !== undefined && activeToken.trim() === '') return
    if (preset.requiresExtraText === true && activePath.trim() === '') return
    const homeDir = dirnameOf(filePath)
    setQuickBusy(true)
    setBusyPresetId(preset.id)
    try {
      if (preset.tokenKey !== undefined) {
        const raw = activeToken.trim()
        const value = preset.tokenBearerWrap ? `Bearer ${raw}` : raw
        const secret = await ops.importSecret(preset.envName, value)
        if (!secret.ok) {
          setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: secret.message }) })
          return
        }
      }
      const response = await ops.upsertServer(quickEntry(preset, homeDir, activePath, activeToken))
      if (!response.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.message }) })
        return
      }
      setServers(response.value.servers)
      setQuickToken('')
      setQuickPath('')
      setPresetTokens(prev => ({ ...prev, [preset.id]: '' }))
      setPresetPaths(prev => ({ ...prev, [preset.id]: '' }))
      setSecretNote(preset.tokenKey !== undefined
        ? t('mcp.quickInstalled', { server: preset.serverName, env: preset.envName })
        : '')
      setStatus({ kind: 'saved' })
      setRecentlySavedId(preset.id)
      setTimeout(() => {
        setRecentlySavedId(prev => (prev === preset.id ? null : prev))
      }, 2500)
      void loadStatus()
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: String(error) }) })
    } finally {
      setQuickBusy(false)
      setBusyPresetId(null)
    }
  }

  const filteredPresets = selectedCategory === 'all'
    ? QUICK_PRESETS
    : QUICK_PRESETS.filter(p => p.category === selectedCategory)

  return (
    <div className={css.section}>
      <div className={css.toolbar}>
        <p className={css.hint}>{t('mcp.hint')}</p>
        {draft === null ? (
          <Button variant="primary" size="md" onClick={openAdd}>
            {t('mcp.add')}
          </Button>
        ) : null}
      </div>

      <div className={css.statsBar}>
        <div className={css.statCard}>
          <span className={css.statNum}>{servers.length}</span>
          <span className={css.statLabel}>{t('mcp.stats.total')}</span>
        </div>
        <div className={css.statCard}>
          <span className={`${css.statNum} ${css.statConnected}`}>
            <span className={css.liveDot} />
            {connectedCount}
          </span>
          <span className={css.statLabel}>{t('mcp.stats.connected')}</span>
        </div>
        <div className={css.statCard}>
          <span className={`${css.statNum} ${css.statTools}`}>⚡ {totalToolsCount}</span>
          <span className={css.statLabel}>{t('mcp.stats.tools')}</span>
        </div>
      </div>

      <div className={css.sectionGroup}>
        <div className={css.groupHeader}>
          <span className={css.groupTitle}>{t('mcp.quickCatalog')}</span>
        </div>

        {/* Tab Switcher: Curated Presets vs Online Registry + View Mode Switcher */}
        <div className={css.catalogHeaderRow}>
          <div className={css.catalogTabs}>
            <button
              type="button"
              className={`${css.catalogTab} ${activeCatalogTab === 'presets' ? css.catalogTabActive : ''}`}
              onClick={() => { setActiveCatalogTab('presets') }}
            >
              ⭐ {t('mcp.tab.presets')}
            </button>
            <button
              type="button"
              className={`${css.catalogTab} ${activeCatalogTab === 'registry' ? css.catalogTabActive : ''}`}
              onClick={() => {
                setActiveCatalogTab('registry')
                if (onlineServers.length === 0) {
                  void fetchOnlineServers(onlineQuery, 1)
                }
              }}
            >
              🌐 {t('mcp.tab.registry')}
            </button>
          </div>
          <div className={css.viewToggleRow}>
            <button
              type="button"
              className={`${css.viewToggleBtn} ${viewMode === 'grid' ? css.viewToggleBtnActive : ''}`}
              onClick={() => { setViewMode('grid') }}
              title={t('mcp.view.grid')}
            >
              ⊞ {t('mcp.view.grid')}
            </button>
            <button
              type="button"
              className={`${css.viewToggleBtn} ${viewMode === 'table' ? css.viewToggleBtnActive : ''}`}
              onClick={() => { setViewMode('table') }}
              title={t('mcp.view.table')}
            >
              ☰ {t('mcp.view.table')}
            </button>
          </div>
        </div>

        {activeCatalogTab === 'presets' ? (
          <>
            <div className={css.categoryRow}>
              <button
                type="button"
                className={`${css.categoryBtn} ${selectedCategory === 'all' ? css.categoryBtnActive : ''}`}
                onClick={() => { setSelectedCategory('all') }}
              >
                {t('mcp.category.all')}
              </button>
              <button
                type="button"
                className={`${css.categoryBtn} ${selectedCategory === 'web' ? css.categoryBtnActive : ''}`}
                onClick={() => { setSelectedCategory('web') }}
              >
                🌐 {t('mcp.category.web')}
              </button>
              <button
                type="button"
                className={`${css.categoryBtn} ${selectedCategory === 'database' ? css.categoryBtnActive : ''}`}
                onClick={() => { setSelectedCategory('database') }}
              >
                🗄️ {t('mcp.category.database')}
              </button>
              <button
                type="button"
                className={`${css.categoryBtn} ${selectedCategory === 'dev' ? css.categoryBtnActive : ''}`}
                onClick={() => { setSelectedCategory('dev') }}
              >
                💻 {t('mcp.category.dev')}
              </button>
            </div>

            {viewMode === 'grid' ? (
              <div className={css.quickGrid}>
                {filteredPresets.map((preset) => {
                  const installed = servers.some(s => s.id === preset.id)
                  const iconClass = css[`presetIcon_${preset.id.replace(/-/g, '_')}`] ?? ''
                  const cardToken = presetTokens[preset.id] ?? quickToken
                  const cardPath = presetPaths[preset.id] ?? quickPath
                  const hasInputs = preset.tokenKey !== undefined || preset.extraTextLabelKey !== undefined
                  const isBusy = busyPresetId === preset.id
                  const isJustSaved = recentlySavedId === preset.id
                  const isActionDisabled = quickBusy
                    || (installed && !hasInputs && !isJustSaved)
                    || (!installed && preset.tokenKey !== undefined && cardToken.trim() === '')
                    || (!installed && preset.requiresExtraText === true && cardPath.trim() === '')

                  let actionText = t('mcp.quick.action')
                  if (isBusy) {
                    actionText = '⏳ ' + t('mcp.saving')
                  } else if (isJustSaved) {
                    actionText = '✓ ' + t('mcp.saved')
                  } else if (installed) {
                    actionText = hasInputs
                      ? t(preset.tokenKey !== undefined ? 'mcp.quick.updateAction' : 'mcp.quick.update')
                      : `✓ ${t('mcp.quick.installedTag')}`
                  }

                  return (
                    <div key={preset.id} className={`${css.onlineCard} ${installed ? css.onlineCardInstalled : ''}`}>
                      <div className={css.onlineCardHeader}>
                        <div className={`${css.onlineIcon} ${iconClass}`}>
                          <preset.icon size={22} />
                        </div>
                        <div className={css.onlineMeta}>
                          <div className={css.onlineTitleRow}>
                            <span className={css.onlineTitle}>{t(preset.titleKey)}</span>
                            <span className={css.badgeVerified}>✓ {t('mcp.registry.verified')}</span>
                            {installed ? (
                              <span className={`${css.badge} ${css.badgeInstalled}`}>
                                {t('mcp.quick.installedTag')}
                              </span>
                            ) : null}
                          </div>
                          <span className={css.onlineQualified}>{preset.serverName}</span>
                        </div>
                      </div>
                      <p className={css.onlineDesc}>{t(preset.hintKey)}</p>
                      {preset.tokenKey !== undefined || preset.extraTextLabelKey !== undefined ? (
                        <div className={css.quickFields}>
                          {preset.tokenKey !== undefined ? (
                            <input
                              className={css.input}
                              type="password"
                              value={cardToken}
                              placeholder={t(preset.tokenKey)}
                              aria-label={t(preset.tokenKey)}
                              onChange={(event) => {
                                const val = event.target.value
                                setPresetTokens(prev => ({ ...prev, [preset.id]: val }))
                                setQuickToken(val)
                              }}
                            />
                          ) : null}
                          {preset.extraTextLabelKey !== undefined ? (
                            <input
                              className={css.input}
                              value={cardPath}
                              placeholder={t(preset.extraTextLabelKey)}
                              aria-label={t(preset.extraTextLabelKey)}
                              onChange={(event) => {
                                const val = event.target.value
                                setPresetPaths(prev => ({ ...prev, [preset.id]: val }))
                                setQuickPath(val)
                              }}
                            />
                          ) : null}
                        </div>
                      ) : null}
                      <div className={css.onlineFooter}>
                        <div className={css.onlineStats}>
                          <span className={css.onlineUses}>
                            ⭐ {t(
                              preset.category === 'web'
                                ? 'mcp.category.web'
                                : preset.category === 'database'
                                  ? 'mcp.category.database'
                                  : 'mcp.category.dev',
                            )}
                          </span>
                        </div>
                        <div className={css.onlineActions}>
                          <Button
                            variant="outline"
                            size="sm"
                            title={t('mcp.registry.configureAction')}
                            onClick={() => { openEdit(quickEntry(preset, filePath !== '' ? dirnameOf(filePath) : '~', cardPath, cardToken)) }}
                          >
                            ⚙️
                          </Button>
                          <Button
                            variant={installed ? 'outline' : 'primary'}
                            size="sm"
                            disabled={isActionDisabled}
                            onClick={() => { void quickInstall(preset, cardToken, cardPath) }}
                          >
                            {actionText}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={css.tableView}>
                {filteredPresets.map((preset) => {
                  const installed = servers.some(s => s.id === preset.id)
                  const iconClass = css[`presetIcon_${preset.id.replace(/-/g, '_')}`] ?? ''
                  const cardToken = presetTokens[preset.id] ?? quickToken
                  const cardPath = presetPaths[preset.id] ?? quickPath
                  const hasInputs = preset.tokenKey !== undefined || preset.extraTextLabelKey !== undefined
                  const isBusy = busyPresetId === preset.id
                  const isJustSaved = recentlySavedId === preset.id
                  const isActionDisabled = quickBusy
                    || (installed && !hasInputs && !isJustSaved)
                    || (!installed && preset.tokenKey !== undefined && cardToken.trim() === '')
                    || (!installed && preset.requiresExtraText === true && cardPath.trim() === '')

                  let actionText = t('mcp.quick.action')
                  if (isBusy) {
                    actionText = '⏳ ' + t('mcp.saving')
                  } else if (isJustSaved) {
                    actionText = '✓ ' + t('mcp.saved')
                  } else if (installed) {
                    actionText = hasInputs
                      ? t(preset.tokenKey !== undefined ? 'mcp.quick.updateAction' : 'mcp.quick.update')
                      : `✓ ${t('mcp.quick.installedTag')}`
                  }

                  return (
                    <div key={preset.id} className={`${css.tableRow} ${installed ? css.tableRowInstalled : ''}`}>
                      <span className={`${css.tableCellIcon} ${iconClass}`}><preset.icon size={16} /></span>
                      <div className={css.tableCellPrimary}>
                        <span className={css.tableCellTitle}>{t(preset.titleKey)}</span>
                        <span className={css.tableCellSub}>{preset.serverName}</span>
                      </div>
                      <span className={css.tableCellDesc} title={t(preset.hintKey)}>{t(preset.hintKey)}</span>
                      {preset.tokenKey !== undefined ? (
                        <input
                          className={`${css.input} ${css.tableFieldInput}`}
                          type="password"
                          value={cardToken}
                          placeholder={t(preset.tokenKey)}
                          aria-label={t(preset.tokenKey)}
                          onChange={(event) => {
                            const val = event.target.value
                            setPresetTokens(prev => ({ ...prev, [preset.id]: val }))
                            setQuickToken(val)
                          }}
                        />
                      ) : null}
                      {preset.extraTextLabelKey !== undefined ? (
                        <input
                          className={`${css.input} ${css.tableFieldInput}`}
                          value={cardPath}
                          placeholder={t(preset.extraTextLabelKey)}
                          aria-label={t(preset.extraTextLabelKey)}
                          onChange={(event) => {
                            const val = event.target.value
                            setPresetPaths(prev => ({ ...prev, [preset.id]: val }))
                            setQuickPath(val)
                          }}
                        />
                      ) : null}
                      <div className={css.tableCellActions}>
                        <Button
                          variant={installed ? 'outline' : 'primary'}
                          size="sm"
                          disabled={isActionDisabled}
                          onClick={() => { void quickInstall(preset, cardToken, cardPath) }}
                        >
                          {actionText}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div>
            {/* Search Bar */}
            <div className={css.registrySearchRow}>
              <div className={css.registrySearchWrap}>
                <span style={{ opacity: 0.7 }}>🔍</span>
                <input
                  className={css.registrySearchInput}
                  value={onlineQuery}
                  placeholder={t('mcp.registry.searchPlaceholder')}
                  onChange={(event) => { setOnlineQuery(event.target.value) }}
                />
                {onlineQuery !== '' && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dsw-alias-label-muted)', fontSize: 14 }}
                    title={t('mcp.registry.clear')}
                    onClick={() => { setOnlineQuery('') }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {onlineTotal > 0 && (
                <span className={css.registryCountBadge}>
                  {t('mcp.registry.totalFound', { total: onlineTotal })}
                </span>
              )}
            </div>

            {/* Error or Loading or Grid */}
            {onlineError !== null ? (
              <div className={css.onlineStateBox}>
                <p style={{ color: 'var(--dsw-alias-state-error-primary)', margin: 0 }}>
                  {t('mcp.registry.error')}
                </p>
                <Button variant="outline" size="sm" onClick={() => { void fetchOnlineServers(onlineQuery, onlinePage) }}>
                  {t('mcp.registry.retry')}
                </Button>
              </div>
            ) : onlineLoading && onlineServers.length === 0 ? (
              <div className={css.onlineStateBox}>
                <div className={css.onlineLoadingSpinner} />
                <p style={{ color: 'var(--dsw-alias-label-secondary)', margin: 0 }}>{t('mcp.registry.loading')}</p>
              </div>
            ) : onlineServers.length === 0 ? (
              <div className={css.onlineStateBox}>
                <p style={{ color: 'var(--dsw-alias-label-secondary)', margin: 0 }}>{t('mcp.registry.empty')}</p>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className={css.onlineGrid}>
                    {onlineServers.map((s) => {
                      const id = `mcp-${s.qualifiedName.replace(/[^a-zA-Z0-9_-]/g, '-')}`
                      const isInstalled = servers.some(srv => srv.id === id || srv.serverName === s.qualifiedName.split('/').pop())
                      return (
                        <div key={s.id} className={`${css.onlineCard} ${isInstalled ? css.onlineCardInstalled : ''}`}>
                          <div className={css.onlineCardHeader}>
                            <div className={css.onlineIcon}>
                              {s.iconUrl ? (
                                <img
                                  src={s.iconUrl}
                                  alt={s.displayName || s.qualifiedName}
                                  className={css.onlineIconImg}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              ) : (
                                <GlobeIcon size={20} />
                              )}
                            </div>
                            <div className={css.onlineMeta}>
                              <div className={css.onlineTitleRow}>
                                <span className={css.onlineTitle}>{s.displayName || s.qualifiedName}</span>
                                {s.verified ? (
                                  <span className={css.badgeVerified}>✓ {t('mcp.registry.verified')}</span>
                                ) : null}
                                {isInstalled ? (
                                  <span className={`${css.badge} ${css.badgeInstalled}`}>
                                    {t('mcp.quick.installedTag')}
                                  </span>
                                ) : null}
                              </div>
                              <span className={css.onlineQualified}>{s.qualifiedName}</span>
                            </div>
                          </div>
                          <p className={css.onlineDesc}>{s.description || '-'}</p>
                          <div className={css.onlineFooter}>
                            <div className={css.onlineStats}>
                              <span className={css.onlineUses}>🔥 {t('mcp.registry.uses', { count: formatUses(s.useCount) })}</span>
                            </div>
                            <div className={css.onlineActions}>
                              <Button
                                variant="outline"
                                size="sm"
                                title={t('mcp.registry.configureAction')}
                                onClick={() => { openConfigureFromOnline(s) }}
                              >
                                ⚙️
                              </Button>
                              {(() => {
                                const isBusy = busyPresetId === s.id
                                const isJustSaved = recentlySavedId === s.id
                                let actionText = t('mcp.registry.installAction')
                                if (isBusy) {
                                  actionText = '⏳ ' + t('mcp.saving')
                                } else if (isJustSaved) {
                                  actionText = '✓ ' + t('mcp.saved')
                                } else if (isInstalled) {
                                  actionText = `✓ ${t('mcp.quick.installedTag')}`
                                }
                                return (
                                  <Button
                                    variant={isInstalled ? 'outline' : 'primary'}
                                    size="sm"
                                    disabled={quickBusy || (isInstalled && !isJustSaved)}
                                    onClick={() => { void quickInstallFromOnline(s) }}
                                  >
                                    {actionText}
                                  </Button>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={css.tableView}>
                    {onlineServers.map((s) => {
                      const id = `mcp-${s.qualifiedName.replace(/[^a-zA-Z0-9_-]/g, '-')}`
                      const isInstalled = servers.some(srv => srv.id === id || srv.serverName === s.qualifiedName.split('/').pop())
                      return (
                        <div key={s.id} className={`${css.tableRow} ${isInstalled ? css.tableRowInstalled : ''}`}>
                          <div className={css.tableCellIcon}>
                            {s.iconUrl ? (
                              <img
                                src={s.iconUrl}
                                alt={s.displayName || s.qualifiedName}
                                className={css.onlineIconImg}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <GlobeIcon size={16} />
                            )}
                          </div>
                          <div className={css.tableCellPrimary}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className={css.tableCellTitle}>{s.displayName || s.qualifiedName}</span>
                              {s.verified && <span className={css.badgeVerified} style={{ fontSize: 9, padding: '0 4px' }}>✓</span>}
                            </div>
                            <span className={css.tableCellSub}>{s.qualifiedName}</span>
                          </div>
                          <span className={css.tableCellDesc} title={s.description || ''}>{s.description || '-'}</span>
                          <div className={css.tableCellStats}>
                            <span className={css.onlineUses}>🔥 {formatUses(s.useCount)}</span>
                          </div>
                          <div className={css.tableCellActions}>
                            <Button
                              variant="outline"
                              size="sm"
                              title={t('mcp.registry.configureAction')}
                              onClick={() => { openConfigureFromOnline(s) }}
                            >
                              ⚙️
                            </Button>
                            {(() => {
                              const isBusy = busyPresetId === s.id
                              const isJustSaved = recentlySavedId === s.id
                              let actionText = t('mcp.registry.installAction')
                              if (isBusy) {
                                actionText = '⏳ ' + t('mcp.saving')
                              } else if (isJustSaved) {
                                actionText = '✓ ' + t('mcp.saved')
                              } else if (isInstalled) {
                                actionText = `✓ ${t('mcp.quick.installedTag')}`
                              }
                              return (
                                <Button
                                  variant={isInstalled ? 'outline' : 'primary'}
                                  size="sm"
                                  disabled={quickBusy || (isInstalled && !isJustSaved)}
                                  onClick={() => { void quickInstallFromOnline(s) }}
                                >
                                  {actionText}
                                </Button>
                              )
                            })()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {onlinePage < onlineTotalPages && (
                  <div className={css.loadMoreRow}>
                    <Button
                      variant="outline"
                      size="md"
                      disabled={onlineLoading}
                      onClick={() => { void fetchOnlineServers(onlineQuery, onlinePage + 1) }}
                    >
                      {onlineLoading ? t('mcp.testing') : t('mcp.registry.loadMore')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className={css.sectionGroup}>
        <div className={css.groupHeader}>
          <span className={css.groupTitle}>{t('mcp.configuredServers')}</span>
          {filePath !== '' ? <span className={css.fileLineBadge}>{t('mcp.fileLine', { path: filePath })}</span> : null}
        </div>

        {servers.length === 0 && draft === null ? <p className={css.empty}>{t('mcp.empty')}</p> : null}
        <div className={css.installedGrid}>
          {servers.map((server) => {
            const live = statuses.find(s => s.serverName === server.serverName)
            const isServerDisabled = server.disabled === true
            const effectiveStatus: McpServerStatus | undefined = isServerDisabled
              ? { phase: 'disabled', serverName: server.serverName, tools: [] }
              : live
            const effectivePhase = effectiveStatus?.phase ?? 'unknown'
            const serverTools = effectiveStatus?.tools ?? []
            const isExpanded = !!expandedTools[server.id]
            const test = testResults[server.serverName]
            const isConnected = effectiveStatus?.phase === 'connected'
            const info = resolveServerInfo(server, onlineServers)

            return (
              <div
                key={server.id}
                className={`${css.onlineCard} ${isConnected ? css.onlineCardInstalled : ''} ${isServerDisabled ? (css.onlineCardDisabled ?? '') : ''} ${isExpanded ? (css.cardExpanded ?? '') : ''}`}
              >
                <div className={css.onlineCardHeader}>
                  <div className={`${css.onlineIcon} ${info.className}`}>
                    {info.icon}
                  </div>
                  <div className={css.onlineMeta}>
                    <div className={css.onlineTitleRow}>
                      <span className={css.onlineTitle}>{info.badge || server.serverName}</span>
                      <span className={`${css.statusChip} ${css[`phase_${effectivePhase}`]}`}>
                        <span className={css.dot} aria-hidden="true" />
                        {statusLabel(effectiveStatus, t)}
                      </span>
                    </div>
                    <div className={css.onlineSubRow}>
                      <span className={css.onlineQualified}>{server.serverName}</span>
                      <span className={css.onlineBullet}>·</span>
                      <span className={css.onlineTransport}>{server.transport}</span>
                    </div>
                  </div>
                  <div className={css.headerToggleWrap}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!isServerDisabled}
                      className={`${css.toggleSwitchBtn} ${!isServerDisabled ? css.toggleSwitchActive : ''}`}
                      title={isServerDisabled ? t('mcp.toggleEnable') : t('mcp.toggleDisable')}
                      aria-label={`${info.badge || server.serverName}: ${isServerDisabled ? t('mcp.toggleEnable') : t('mcp.toggleDisable')}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        void toggleServerEnabled(server)
                      }}
                    >
                      <span className={css.toggleSwitchThumb} />
                    </button>
                  </div>
                </div>

                <div className={css.summaryRow}>
                  <span
                    className={css.summary}
                    title={server.transport === 'streamable-http' ? server.url : `${server.command ?? ''} ${server.args.join(' ')}`.trim()}
                  >
                    {server.transport === 'streamable-http' ? server.url : `${server.command ?? ''} ${server.args.join(' ')}`.trim()}
                  </span>
                  <button
                    type="button"
                    className={css.copyBtn}
                    title={t('mcp.copyToolName')}
                    onClick={() => {
                      const text = server.transport === 'streamable-http'
                        ? (server.url ?? '')
                        : `${server.command ?? ''} ${server.args.join(' ')}`.trim()
                      copyText(`cmd_${server.id}`, text)
                    }}
                  >
                    {copiedId === `cmd_${server.id}` ? '✓' : <CopyIcon size={13} />}
                  </button>
                </div>

                {test && !test.testing ? (
                  <div className={`${css.testBanner} ${test.success ? css.testSuccess : css.testFail}`}>
                    {test.success ? (
                      <span>✓ {t('mcp.testSuccess', { latency: test.latencyMs ?? 0, count: test.count ?? 0 })}</span>
                    ) : (
                      <span>⚠ {t('mcp.testFailed', { message: test.message ?? '' })}</span>
                    )}
                  </div>
                ) : null}

                <div className={css.onlineFooter}>
                  <button
                    type="button"
                    className={`${css.toolsBadgeBtn} ${isExpanded ? (css.toolsBadgeActive ?? '') : ''}`}
                    onClick={() => toggleTools(server.id)}
                    title={t('mcp.showTools')}
                  >
                    <span>⚡</span>
                    <span>{t('mcp.toolsCount', { count: serverTools.length })}</span>
                    <span className={`${css.toolsChevron} ${isExpanded ? css.chevronUp : ''}`}>
                      <ChevronDownIcon size={12} />
                    </span>
                  </button>
                  {draft === null ? (
                    <div className={css.onlineActions}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={test?.testing}
                        className={css.iconActionBtn}
                        title={t('mcp.testConnection')}
                        aria-label={t('mcp.testConnection')}
                        onClick={() => { void runTest(server) }}
                      >
                        {test?.testing ? '⏳' : '⚡'}
                        <span className={css.srOnly}>{t('mcp.testConnection')}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={css.iconActionBtn}
                        title={t('mcp.edit')}
                        aria-label={t('mcp.edit')}
                        onClick={() => { openEdit(server) }}
                      >
                        ⚙️
                        <span className={css.srOnly}>{t('mcp.edit')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`${css.iconActionBtn} ${css.deleteBtn}`}
                        title={t('mcp.remove')}
                        aria-label={t('mcp.remove')}
                        onClick={() => { void remove(server) }}
                      >
                        🗑️
                        <span className={css.srOnly}>{t('mcp.remove')}</span>
                      </Button>
                    </div>
                  ) : null}
                </div>

                {isExpanded ? (
                  <div className={css.toolsDrawer}>
                    {serverTools.length === 0 ? (
                      <p className={css.emptyTools}>
                        {live?.phase === 'connected' ? t('mcp.noTools') : statusLabel(live, t)}
                      </p>
                    ) : (
                      <div className={css.toolsGrid}>
                        {serverTools.map(tool => (
                          <div key={tool.name} className={css.toolCard}>
                            <div className={css.toolHeader}>
                              <span className={css.toolRawName}>{tool.rawName}</span>
                              <button
                                type="button"
                                className={css.toolCopyBtn}
                                title={t('mcp.copyToolName')}
                                onClick={() => copyText(tool.name, tool.name)}
                              >
                                <code className={css.toolPublicName}>{tool.name}</code>
                                <span className={css.toolCopyFeedback}>
                                  {copiedId === tool.name ? t('mcp.copied') : <CopyIcon size={12} />}
                                </span>
                              </button>
                            </div>
                            {tool.description ? (
                              <p className={css.toolDesc}>{tool.description}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <Modal
        open={draft !== null}
        onClose={closeForm}
        title={draft?.id === '' ? t('mcp.add') : `${t('mcp.edit')}: ${draft?.serverName ?? ''}`}
        closeLabel={t('mcp.cancel')}
        className={css.mcpModal as string}
        contentClassName={css.mcpModalContent as string}
        footer={(
          <div className={css.modalFooter}>
            <Button variant="ghost" size="md" onClick={closeForm}>{t('mcp.cancel')}</Button>
            <Button
              variant="primary"
              size="md"
              disabled={status.kind === 'saving'}
              onClick={() => { void saveCurrent() }}
            >
              {status.kind === 'saving' ? t('mcp.saving') : t('mcp.save')}
            </Button>
          </div>
        )}
      >
        {draft !== null ? (
          <div className={css.modalScrollArea}>
            <div className={css.modalTopRow}>
              <div className={css.segToggle}>
                <button
                  type="button"
                  aria-pressed={editorMode === 'form'}
                  className={`${css.segBtn} ${editorMode === 'form' ? css.segActive : ''}`}
                  onClick={() => { switchMode('form') }}
                >
                  {t('mcp.formMode')}
                </button>
                <button
                  type="button"
                  aria-pressed={editorMode === 'json'}
                  className={`${css.segBtn} ${editorMode === 'json' ? css.segActive : ''}`}
                  onClick={() => { switchMode('json') }}
                >
                  {t('mcp.jsonMode')}
                </button>
              </div>
            </div>

            {editorMode === 'form' ? (
              <div className={css.formBody}>
                <label className={css.secretRow}>
                  <input
                    type="checkbox"
                    checked={!draft.disabled}
                    aria-label={t('mcp.form.enabled')}
                    onChange={(event) => { setDraft({ ...draft, disabled: !event.target.checked }) }}
                  />
                  <span className={css.secretText}>
                    <span className={css.labelStrong}>{t('mcp.form.enabled')}</span>
                    <span className={css.fieldHint}>{t('mcp.form.enabledHint')}</span>
                  </span>
                </label>
                <label className={css.secretRow}>
                  <input
                    type="checkbox"
                    checked={exportSecrets}
                    aria-label={t('mcp.exportLabel')}
                    onChange={(event) => { setExportSecrets(event.target.checked) }}
                  />
                  <span className={css.secretText}>
                    <span className={css.labelStrong}>{t('mcp.exportLabel')}</span>
                    <span className={css.fieldHint}>{t('mcp.exportHint')}</span>
                  </span>
                </label>
                <div className={css.formGrid}>
                  <label className={css.field}>
                    <span className={css.label}>{t('mcp.serverName')}</span>
                    <input
                      className={css.input}
                      value={draft.serverName}
                      aria-label={t('mcp.serverName')}
                      onChange={(event) => { setDraft({ ...draft, serverName: event.target.value }) }}
                    />
                  </label>
                  <label className={css.field}>
                    <span className={css.label}>{t('mcp.idLabel')}</span>
                    <input
                      className={css.input}
                      value={draft.id}
                      placeholder={`mcp-${draft.serverName}`}
                      aria-label={t('mcp.idLabel')}
                      onChange={(event) => { setDraft({ ...draft, id: event.target.value }) }}
                    />
                  </label>
                  <label className={css.field}>
                    <span className={css.label}>{t('mcp.transport')}</span>
                    <select
                      className={css.input}
                      value={draft.transport}
                      aria-label={t('mcp.transport')}
                      onChange={(event) => {
                        setDraft({
                          ...draft,
                          transport: event.target.value === 'stdio' ? 'stdio' : 'streamable-http',
                        })
                      }}
                    >
                      <option value="streamable-http">{t('mcp.transportHttp')}</option>
                      <option value="stdio">{t('mcp.transportStdio')}</option>
                    </select>
                  </label>
                  <label className={css.field}>
                    <span className={css.label}>{t('mcp.timeoutMs')}</span>
                    <input
                      className={css.input}
                      type="number"
                      min={1}
                      value={draft.timeoutMs}
                      placeholder="60000"
                      aria-label={t('mcp.timeoutMs')}
                      onChange={(event) => { setDraft({ ...draft, timeoutMs: event.target.value }) }}
                    />
                  </label>
                  {draft.transport === 'streamable-http' ? (
                    <label className={css.field}>
                      <span className={css.label}>{t('mcp.url')}</span>
                      <input
                        className={css.input}
                        value={draft.url}
                        placeholder="https://mcp.example.com/mcp"
                        aria-label={t('mcp.url')}
                        onChange={(event) => { setDraft({ ...draft, url: event.target.value }) }}
                      />
                    </label>
                  ) : (
                    <>
                      <label className={css.field}>
                        <span className={css.label}>{t('mcp.command')}</span>
                        <input
                          className={css.input}
                          value={draft.command}
                          aria-label={t('mcp.command')}
                          onChange={(event) => { setDraft({ ...draft, command: event.target.value }) }}
                        />
                      </label>
                      <label className={css.field}>
                        <span className={css.label}>{t('mcp.args')}</span>
                        <input
                          className={css.input}
                          value={draft.args}
                          aria-label={t('mcp.args')}
                          onChange={(event) => { setDraft({ ...draft, args: event.target.value }) }}
                        />
                      </label>
                    </>
                  )}
                </div>
                <div className={css.group}>
                  <span className={css.labelStrong}>{t('mcp.headers')}</span>
                  <textarea
                    className={css.jsonArea}
                    value={draft.headersJson}
                    spellCheck={false}
                    placeholder={'{\n  "Authorization": "Bearer your-token"\n}'}
                    aria-label={t('mcp.headers')}
                    onChange={(event) => { setDraft({ ...draft, headersJson: event.target.value }) }}
                  />
                  <p className={css.fieldHint}>{t('mcp.headersHint')}</p>
                </div>
                {draft.transport === 'stdio' ? (
                  <div className={css.group}>
                    <span className={css.labelStrong}>{t('mcp.env')}</span>
                    <textarea
                      className={css.jsonArea}
                      value={draft.envJson}
                      spellCheck={false}
                      aria-label={t('mcp.env')}
                      onChange={(event) => { setDraft({ ...draft, envJson: event.target.value }) }}
                    />
                    <p className={css.fieldHint}>{t('mcp.envHint')}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={css.formBody}>
                <span className={css.labelStrong}>{t('mcp.jsonFull')}</span>
                <textarea
                  className={css.jsonArea}
                  value={jsonText}
                  spellCheck={false}
                  aria-label={t('mcp.jsonFull')}
                  onChange={(event) => { setJsonText(event.target.value) }}
                />
                <p className={css.fieldHint}>{t('mcp.jsonHint')}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {status.kind === 'saved' ? <p className={css.ok} role="status">{t('mcp.saved')}</p> : null}
      {secretNote !== '' ? <p className={css.note} role="status">{secretNote}</p> : null}
      {status.kind === 'error' ? <p className={css.error} role="alert">{status.message}</p> : null}
    </div>
  )
}
