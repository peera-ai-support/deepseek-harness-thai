/** The MCP servers settings section: list, add, edit, and remove mcp-client rows of the home patch file, with live connection status. */

import { useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import type { McpHeaderOrEnv, McpServerEntry, McpServerStatus, McpValue } from '@deepseek-ai/dsh-api-remotes/client'
import css from './McpSection.module.css'

/** Registrant-owned dependencies of {@link McpSection}. */
export interface McpSectionInjected {
  /** The connected host handle: the mcp RPC face. */
  connection: ConnectionHandle
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

/** One ready-made (extension-like) server preset: fill only the token, everything else is predefined. */
interface QuickPreset {
  id: string
  serverName: string
  transport: 'streamable-http' | 'stdio'
  url: string
  command?: string
  args?: string[]
  headerName: string
  envName: string
  titleKey: 'mcp.quick.title.mcp-github'
  hintKey: 'mcp.quick.hint.mcp-github'
  tokenKey: 'mcp.quick.tokenLabel.mcp-github'
}

/** Predefined quick-install presets. Add a row here (plus its locale keys) to offer another server. */
const QUICK_PRESETS: readonly QuickPreset[] = [
  {
    id: 'mcp-github',
    serverName: 'github',
    transport: 'streamable-http',
    url: 'https://api.githubcopilot.com/mcp/',
    headerName: 'Authorization',
    envName: 'DSH_MCP_GITHUB_AUTHORIZATION',
    titleKey: 'mcp.quick.title.mcp-github',
    hintKey: 'mcp.quick.hint.mcp-github',
    tokenKey: 'mcp.quick.tokenLabel.mcp-github',
  },
]

/** The ready-made entry for one preset with the user's token held in the user environment. */
function quickEntry(preset: QuickPreset): McpServerEntry {
  return {
    id: preset.id,
    serverName: preset.serverName,
    transport: preset.transport,
    ...(preset.transport === 'streamable-http' ? { url: preset.url } : {}),
    headers: [{ name: preset.headerName, value: { kind: 'env', env: preset.envName } }],
    args: preset.args ?? [],
    env: [],
    extra: [],
    ...(preset.command !== undefined ? { command: preset.command } : {}),
  }
}

function emptyDraft(): Draft {
  return {
    id: '', serverName: '', transport: 'streamable-http', url: '', command: '',
    args: '', cwd: '', timeoutMs: '', headersJson: '', envJson: '', extra: [],
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
  const allowed = new Set(['id', 'serverName', 'transport', 'url', 'command', 'args', 'cwd', 'timeoutMs', 'headers', 'env'])
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
  }
}

/**
 * Render the MCP section: the managed server list with live connection
 * statuses, plus a Form/JSON editor that inserts/replaces rows of
 * `$DSH_HOME/cordis.patch.yml` via the mcp RPC. Secrets are entered as
 * `$env:VAR` references inside the JSON header values, never as literals.
 * @param props - section owner share, localized copy, and the connection face.
 * @returns the section element tree.
 */
export function McpSection({ connection, t }: McpSectionComponentProps) {
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

  const load = async () => {
    setStatus({ kind: 'loading' })
    try {
      const response = await connection.api.mcp.listServers({})
      if (!response.result.ok) {
        setStatus({ kind: 'error', message: t('mcp.loadFailed', { message: response.result.error.message }) })
        return
      }
      setServers(response.result.value.servers)
      setFilePath(response.result.value.filePath)
      setStatus({ kind: 'idle' })
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.loadFailed', { message: String(error) }) })
    }
  }

  const loadStatus = async () => {
    try {
      const response = await connection.api.mcp.status({})
      if (response.result.ok) setStatuses(response.result.value.statuses)
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
          const response = await connection.api.mcp.importSecret({ name, value: pair.value.value ?? '' })
          if (!response.result.ok) {
            throw new Error(t('mcp.saveFailed', { message: response.result.error.message }))
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
      const response = await connection.api.mcp.upsertServer({ server: entry })
      if (!response.result.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.result.error.message }) })
        return
      }
      setServers(response.result.value.servers)
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
      const response = await connection.api.mcp.removeServer({ id: server.id })
      if (!response.result.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.result.error.message }) })
        return
      }
      setServers(response.result.value.servers)
      setStatus({ kind: 'saved' })
      void loadStatus()
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: String(error) }) })
    }
  }

  /** Install or update a ready-made preset: store the token, then upsert the whole predefined row. */
  const quickInstall = async (preset: QuickPreset) => {
    const token = quickToken.trim()
    if (token === '') return
    setQuickBusy(true)
    try {
      const secret = await connection.api.mcp.importSecret({ name: preset.envName, value: `Bearer ${token}` })
      if (!secret.result.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: secret.result.error.message }) })
        return
      }
      const response = await connection.api.mcp.upsertServer({ server: quickEntry(preset) })
      if (!response.result.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.result.error.message }) })
        return
      }
      setServers(response.result.value.servers)
      setQuickToken('')
      setSecretNote(t('mcp.quickInstalled', { server: preset.serverName, env: preset.envName }))
      setStatus({ kind: 'saved' })
      void loadStatus()
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: String(error) }) })
    } finally {
      setQuickBusy(false)
    }
  }

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
      {filePath !== '' ? <p className={css.fileLine}>{t('mcp.fileLine', { path: filePath })}</p> : null}

      {QUICK_PRESETS.map((preset) => {
        const installed = servers.some(s => s.id === preset.id)
        return (
          <div key={preset.id} className={css.quick}>
            <div className={css.quickHeader}>
              <span className={css.quickTitle}>{t(preset.titleKey)}</span>
              <span className={css.badge}>{installed ? t('mcp.quick.installedTag') : t('mcp.quick.newTag')}</span>
            </div>
            <p className={css.quickHint}>{t(preset.hintKey)}</p>
            <div className={css.quickFields}>
              <input
                className={css.input}
                type="password"
                value={quickToken}
                placeholder={t(preset.tokenKey)}
                aria-label={t(preset.tokenKey)}
                onChange={(event) => { setQuickToken(event.target.value) }}
              />
              <Button
                variant="primary"
                size="md"
                disabled={quickBusy || quickToken.trim() === ''}
                onClick={() => { void quickInstall(preset) }}
              >
                {installed ? t('mcp.quick.updateAction') : t('mcp.quick.action')}
              </Button>
            </div>
          </div>
        )
      })}

      {servers.length === 0 && draft === null ? <p className={css.empty}>{t('mcp.empty')}</p> : null}
      <div className={css.list}>
        {servers.map((server) => {
          const live = statuses.find(s => s.serverName === server.serverName)
          return (
            <div key={server.id} className={css.card}>
              <div className={css.cardHeader}>
                <span className={css.serverName}>{server.serverName}</span>
                <span className={css.badge}>{server.transport}</span>
                <span className={`${css.statusChip} ${css[`phase_${live?.phase ?? 'unknown'}`]}`}>
                  <span className={css.dot} aria-hidden="true" />
                  {statusLabel(live, t)}
                </span>
                {draft === null ? (
                  <span className={css.cardActions}>
                    <Button variant="outline" size="sm" onClick={() => { openEdit(server) }}>{t('mcp.edit')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => { void remove(server) }}>{t('mcp.remove')}</Button>
                  </span>
                ) : null}
              </div>
              <div className={css.summary}>
                {server.transport === 'streamable-http' ? server.url : `${server.command ?? ''} ${server.args.join(' ')}`.trim()}
              </div>
            </div>
          )
        })}
      </div>

      {draft !== null ? (
        <div className={css.form}>
          <div className={css.formHeader}>
            <span className={css.formTitle}>{t('mcp.add')}</span>
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

          <div className={css.formActions}>
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
        </div>
      ) : null}

      {status.kind === 'saved' ? <p className={css.ok} role="status">{t('mcp.saved')}</p> : null}
      {secretNote !== '' ? <p className={css.note} role="status">{secretNote}</p> : null}
      {status.kind === 'error' ? <p className={css.error} role="alert">{status.message}</p> : null}
    </div>
  )
}
