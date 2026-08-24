/** The MCP servers settings section: list, add, edit, and remove mcp-client rows of the home patch file, with live connection status. */

import { useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import type { McpServerEntry, McpServerStatus, McpValue } from '@deepseek-ai/dsh-api-remotes/client'
import css from './McpSection.module.css'

/** Registrant-owned dependencies of {@link McpSection}. */
export interface McpSectionInjected {
  /** The connected host handle: the mcp RPC face. */
  connection: ConnectionHandle
}

/** Section owner share, localized copy, and the registrant's state face. */
export type McpSectionComponentProps =
  PropsRuntime<'settings.section'> & PropsLocale<'settings'> & InjectFace<McpSectionInjected>

/** One header/env row as the form edits it. The `env` shape maps to a `!!js process.env.*` read, never a literal secret. */
interface DraftPair {
  key: string
  kind: 'literal' | 'env'
  value: string
  env: string
  prefix: string
}

/** One server row as the form edits it. */
interface Draft {
  id: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  url: string
  command: string
  args: string
  cwd: string
  headers: DraftPair[]
  env: DraftPair[]
  extra: string[]
}

type UiStatus =
  | { kind: 'loading' }
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

/** How often live connection statuses refresh while the section is shown. */
const STATUS_POLL_MS = 5_000

function emptyPair(): DraftPair {
  return { key: '', kind: 'literal', value: '', env: '', prefix: '' }
}

function emptyDraft(): Draft {
  return {
    id: '', serverName: '', transport: 'streamable-http', url: '', command: '',
    args: '', cwd: '', headers: [emptyPair()], env: [], extra: [],
  }
}

/** Prefilled draft for the official GitHub remote MCP server. */
function githubPresetDraft(): Draft {
  return {
    id: 'mcp-github',
    serverName: 'github',
    transport: 'streamable-http',
    url: 'https://api.githubcopilot.com/mcp/',
    command: '',
    args: '',
    cwd: '',
    headers: [{ key: 'Authorization', kind: 'env', value: '', env: 'GITHUB_TOKEN', prefix: 'Bearer ' }],
    env: [],
    extra: [],
  }
}

function valueToPair(key: string, value: McpValue): DraftPair {
  return value.kind === 'env'
    ? { key, kind: 'env', value: '', env: value.env ?? '', prefix: value.prefix ?? '' }
    : { key, kind: 'literal', value: value.value ?? '', env: '', prefix: '' }
}

function pairToValue(pair: DraftPair): McpValue {
  return pair.kind === 'env'
    ? { kind: 'env', env: pair.env, ...pair.prefix === '' ? {} : { prefix: pair.prefix } }
    : { kind: 'literal', value: pair.value }
}

function toDraft(server: McpServerEntry): Draft {
  return {
    id: server.id,
    serverName: server.serverName,
    transport: server.transport,
    url: server.url ?? '',
    command: server.command ?? '',
    args: server.args.join(' '),
    cwd: server.cwd ?? '',
    headers: server.headers.map(p => valueToPair(p.name, p.value)),
    env: server.env.map(p => valueToPair(p.name, p.value)),
    extra: [...server.extra],
  }
}

function draftToEntry(draft: Draft): McpServerEntry {
  const id = draft.id.trim() !== '' ? draft.id.trim() : `mcp-${draft.serverName}`
  const cleaned = (pairs: DraftPair[]) => pairs.filter(p => p.key.trim() !== '')
  return {
    id,
    serverName: draft.serverName,
    transport: draft.transport,
    ...(draft.transport === 'streamable-http' ? { url: draft.url } : {}),
    headers: cleaned(draft.headers).map(p => ({ name: p.key.trim(), value: pairToValue(p) })),
    ...(draft.transport === 'stdio' ? { command: draft.command } : {}),
    args: draft.args.trim() === '' ? [] : draft.args.trim().split(/\s+/),
    ...(draft.cwd.trim() === '' ? {} : { cwd: draft.cwd }),
    env: cleaned(draft.env).map(p => ({ name: p.key.trim(), value: pairToValue(p) })),
    extra: draft.extra,
  }
}

/** Column labels above every header/env pair editor. */
function PairHeaders({ t }: { t: McpSectionComponentProps['t'] }) {
  return (
    <div className={css.pairHeaders}>
      <span>{t('mcp.colKey')}</span>
      <span>{t('mcp.colKind')}</span>
      <span>{t('mcp.colValue')}</span>
      <span>{t('mcp.colPrefix')}</span>
      <span />
    </div>
  )
}

/** A pair-edit row with change callbacks. */
function PairRow({ pair, label, onPatch, onRemove, t }: {
  pair: DraftPair
  label: string
  onPatch: (patch: Partial<DraftPair>) => void
  onRemove: () => void
  t: McpSectionComponentProps['t']
}) {
  return (
    <div className={css.pairRow}>
      <input
        className={css.input}
        value={pair.key}
        placeholder={t('mcp.placeholderKey')}
        aria-label={`${label} ${t('mcp.keyName')}`}
        onChange={(event) => { onPatch({ key: event.target.value }) }}
      />
      <select
        className={css.input}
        value={pair.kind}
        aria-label={`${label} ${t('mcp.valueKind')}`}
        onChange={(event) => { onPatch({ kind: event.target.value === 'env' ? 'env' : 'literal' }) }}
      >
        <option value="literal">{t('mcp.kindLiteral')}</option>
        <option value="env">{t('mcp.kindEnv')}</option>
      </select>
      {pair.kind === 'env' ? (
        <input
          className={css.input}
          value={pair.env}
          placeholder={t('mcp.placeholderEnv')}
          aria-label={`${label} ${t('mcp.envName')}`}
          onChange={(event) => { onPatch({ env: event.target.value }) }}
        />
      ) : (
        <input
          className={css.input}
          value={pair.value}
          placeholder={t('mcp.placeholderLiteral')}
          aria-label={`${label} ${t('mcp.value')}`}
          onChange={(event) => { onPatch({ value: event.target.value }) }}
        />
      )}
      {pair.kind === 'env' ? (
        <input
          className={css.input}
          value={pair.prefix}
          placeholder={t('mcp.envPrefix')}
          aria-label={`${label} ${t('mcp.envPrefix')}`}
          onChange={(event) => { onPatch({ prefix: event.target.value }) }}
        />
      ) : null}      <Button variant="ghost" size="sm" onClick={onRemove} className={css.removeButton}>
        {t('mcp.remove')}
      </Button>
    </div>
  )
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
 * statuses, plus a form that inserts/replaces rows of
 * `$DSH_HOME/cordis.patch.yml` via the mcp RPC. Headers/env secrets are
 * entered as env-var references, never as literals.
 * @param props - section owner share, localized copy, and the connection face.
 * @returns the section element tree.
 */
export function McpSection({ connection, t }: McpSectionComponentProps) {
  const [servers, setServers] = useState<McpServerEntry[]>([])
  const [statuses, setStatuses] = useState<McpServerStatus[]>([])
  const [filePath, setFilePath] = useState('')
  const [status, setStatus] = useState<UiStatus>({ kind: 'loading' })
  const [draft, setDraft] = useState<Draft | null>(null)
  /** True while the add-mode chooser (templates vs custom) is shown. */
  const [choosing, setChoosing] = useState(false)
  /** True when the draft came from a preset (shows the token note). */
  const [presetNote, setPresetNote] = useState(false)

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

  const save = async (next: Draft) => {
    setStatus({ kind: 'saving' })
    try {
      const response = await connection.api.mcp.upsertServer({ server: draftToEntry(next) })
      if (!response.result.ok) {
        setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: response.result.error.message }) })
        return
      }
      setServers(response.result.value.servers)
      setDraft(null)
      setStatus({ kind: 'saved' })
      void loadStatus()
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: t('mcp.saveFailed', { message: String(error) }) })
    }
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

  const patchPair = (listKey: 'headers' | 'env', index: number, patch: Partial<DraftPair>) => {
    setDraft(current => current === null ? null : {
      ...current,
      [listKey]: current[listKey].map((p, i) => i === index ? { ...p, ...patch } : p),
    })
  }

  const dropPair = (listKey: 'headers' | 'env', index: number) => {
    setDraft(current => current === null ? null : {
      ...current,
      [listKey]: current[listKey].filter((_, i) => i !== index),
    })
  }

  return (
    <div className={css.section}>
      <div className={css.toolbar}>
        <p className={css.hint}>{t('mcp.hint')}</p>
        {draft === null ? (
          <Button variant="primary" size="md" onClick={() => { setChoosing(true) }}>
            {t('mcp.add')}
          </Button>
        ) : null}
      </div>
      {filePath !== '' ? <p className={css.fileLine}>{t('mcp.fileLine', { path: filePath })}</p> : null}

      {choosing && draft === null ? (
        <div className={css.chooser}>
          <div className={css.chooserCard}>
            <p className={css.chooserTitle}>{t('mcp.preset.github')}</p>
            <p className={css.chooserHint}>{t('mcp.preset.githubHint')}</p>
            <Button
              variant="primary"
              size="sm"
              className={css.chooserAction}
              onClick={() => {
                setDraft(githubPresetDraft())
                setPresetNote(true)
                setChoosing(false)
              }}
            >
              {t('mcp.preset.githubAction')}
            </Button>
          </div>
          <div className={css.chooserCard}>
            <p className={css.chooserTitle}>{t('mcp.preset.custom')}</p>
            <p className={css.chooserHint}>{t('mcp.preset.customHint')}</p>
            <Button
              variant="outline"
              size="sm"
              className={css.chooserAction}
              onClick={() => {
                setDraft(emptyDraft())
                setPresetNote(false)
                setChoosing(false)
              }}
            >
              {t('mcp.preset.customAction')}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setChoosing(false) }}>{t('mcp.cancel')}</Button>
        </div>
      ) : null}

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
                    <Button variant="outline" size="sm" onClick={() => { setPresetNote(false); setDraft(toDraft(server)) }}>{t('mcp.edit')}</Button>
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
          {presetNote ? <p className={css.note}>{t('mcp.preset.githubTokenNote')}</p> : null}
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
            {draft.transport === 'streamable-http' ? (
              <label className={css.field}>
                <span className={css.label}>{t('mcp.url')}</span>
                <input
                  className={css.input}
                  value={draft.url}
                  aria-label={t('mcp.url')}
                  onChange={(event) => { setDraft({ ...draft, url: event.target.value }) }}
                />
              </label>
            ) : null}
          </div>

          {draft.transport === 'streamable-http' ? (
            <div className={css.group}>
              <div className={css.groupHeader}>
                <span className={css.label}>{t('mcp.headers')}</span>
                <Button variant="ghost" size="sm" onClick={() => { setDraft({ ...draft, headers: [...draft.headers, emptyPair()] }) }}>
                  {t('mcp.addRow')}
                </Button>
              </div>
              <PairHeaders t={t} />
              {draft.headers.map((pair, index) => (
                <PairRow
                  key={index}
                  pair={pair}
                  label={t('mcp.headers')}
                  t={t}
                  onPatch={(patch) => { patchPair('headers', index, patch) }}
                  onRemove={() => { dropPair('headers', index) }}
                />
              ))}
            </div>
          ) : (
            <div className={css.formGrid}>
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
              <label className={css.field}>
                <span className={css.label}>{t('mcp.cwd')}</span>
                <input
                  className={css.input}
                  value={draft.cwd}
                  aria-label={t('mcp.cwd')}
                  onChange={(event) => { setDraft({ ...draft, cwd: event.target.value }) }}
                />
              </label>
            </div>
          )}

          {draft.transport === 'stdio' ? (
            <div className={css.group}>
              <div className={css.groupHeader}>
                <span className={css.label}>{t('mcp.env')}</span>
                <Button variant="ghost" size="sm" onClick={() => { setDraft({ ...draft, env: [...draft.env, emptyPair()] }) }}>
                  {t('mcp.addRow')}
                </Button>
              </div>
              <PairHeaders t={t} />
              {draft.env.map((pair, index) => (
                <PairRow
                  key={index}
                  pair={pair}
                  label={t('mcp.env')}
                  t={t}
                  onPatch={(patch) => { patchPair('env', index, patch) }}
                  onRemove={() => { dropPair('env', index) }}
                />
              ))}
            </div>
          ) : null}

          <div className={css.formActions}>
            <Button variant="ghost" size="md" onClick={() => { setPresetNote(false); setDraft(null) }}>{t('mcp.cancel')}</Button>
            <Button
              variant="primary"
              size="md"
              disabled={status.kind === 'saving'}
              onClick={() => { void save(draft) }}
            >
              {status.kind === 'saving' ? t('mcp.saving') : t('mcp.save')}
            </Button>
          </div>
        </div>
      ) : null}

      {status.kind === 'saved' ? <p className={css.ok} role="status">{t('mcp.saved')}</p> : null}
      {status.kind === 'error' ? <p className={css.error} role="alert">{status.message}</p> : null}
    </div>
  )
}
