import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Context } from '@deepseek-ai/cordis'
import type { ConversationViewNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  FishLogo,
  IconApiOutline14,
  IconBrowseOutline16,
  IconChevronDownOutline14,
  IconChevronUpOutline14,
  IconEditOutline16,
  IconSearchOutline16,
  IconSparkle16,
  IconThinkOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { formatRunDuration } from './message-chrome.ts'
import { splitScratchpad } from './scratchpad.ts'
import { NS } from '../locales.ts'
import css from './ThinkingDock.module.css'

function runningTurnStartTime(timeline: import('@deepseek-ai/dsh-client-runtime/client').ConversationTimelineSnapshot | undefined): number | null {
  if (!timeline?.turns) return null
  let latest: number | null = null
  for (const turn of timeline.turns.values()) {
    if (turn.status === 'open' && turn.start !== undefined) latest = turn.start.time
  }
  return latest
}

function WaterWaveIcon({ className, settling }: { className?: string | undefined; settling?: boolean | undefined }) {
  return (
    <svg
      viewBox="0 0 28 20"
      width="24"
      height="18"
      className={clsx(css.riverSvg, className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dshRiverMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="50%" stopColor="#4d8df7" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="dshRiverDeep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#2563eb" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="dshRiverCrest" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Layer 1: Deep water undercurrent */}
      <path
        d="M2 13 C6 10, 10 10, 14 13 C18 16, 22 16, 26 13 L26 18 C22 19, 18 19, 14 18 C10 17, 6 17, 2 18 Z"
        fill="url(#dshRiverDeep)"
        className={clsx(css.riverUndercurrent, settling && css.riverSettling)}
      />

      {/* Layer 2: Main flowing river current */}
      <path
        d="M2 11.5 C6 8, 10 8, 14 11.5 C18 15, 22 15, 26 11.5"
        fill="none"
        stroke="url(#dshRiverMain)"
        strokeWidth="2.8"
        strokeLinecap="round"
        className={clsx(css.riverMainCurrent, settling && css.riverSettling)}
      />

      {/* Layer 3: Surface foam crest & highlight */}
      <path
        d="M3 6.5 C7 4, 11 4, 15 6.5 C19 9, 22.5 9, 25.5 7"
        fill="none"
        stroke="url(#dshRiverCrest)"
        strokeWidth="2"
        strokeLinecap="round"
        className={clsx(css.riverSurfaceCrest, settling && css.riverSettling)}
      />

      {/* Layer 4: Shimmering water drops/bubbles */}
      <circle cx="9" cy="4.5" r="1" fill="#bae6fd" className={clsx(css.riverSparkle1, settling && css.riverSettling)} />
      <circle cx="20" cy="7.5" r="0.8" fill="#e0f2fe" className={clsx(css.riverSparkle2, settling && css.riverSettling)} />
    </svg>
  )
}

export function renderStepIcon(kind: 'thinking' | 'tool' | 'context', rawName?: string) {
  if (kind === 'thinking') {
    return <IconThinkOutline14 size={14} className={css.iconThinking} />
  }
  if (kind === 'context') {
    return <IconBrowseOutline16 size={14} className={css.iconContext} />
  }
  const name = (rawName || '').toLowerCase()
  if (name.includes('pwsh') || name.includes('bash') || name.includes('terminal') || name.includes('shell') || name.includes('cmd')) {
    return <IconApiOutline14 size={14} className={css.iconTerminal} />
  }
  if (name.includes('read') || name.includes('fetch') || name.includes('cat') || name.includes('open')) {
    return <IconBrowseOutline16 size={14} className={css.iconRead} />
  }
  if (name.includes('glob') || name.includes('search') || name.includes('grep') || name.includes('find')) {
    return <IconSearchOutline16 size={14} className={css.iconSearch} />
  }
  if (name.includes('write') || name.includes('edit') || name.includes('patch') || name.includes('replace')) {
    return <IconEditOutline16 size={14} className={css.iconEdit} />
  }
  return <IconSparkle16 size={14} className={css.iconSparkle} />
}

/** Defensive payload reads for replayed nodes: kinds are merge-extensible, so
 *  obsolete or hand-edited logs must not crash the dock — Tool fields the
 *  current projection does not produce are still read as unknown. */
interface DockToolCallData {
  readonly root?: {
    readonly name?: unknown
    readonly call?: { readonly name?: unknown; readonly argsRaw?: unknown } | undefined
    readonly callId?: unknown
    readonly argsRaw?: unknown
    readonly content?: unknown
    readonly result?: { readonly content?: unknown } | undefined
    readonly isError?: unknown
    readonly error?: unknown
    readonly title?: unknown
  } | undefined
}

export function parseChatNodeStep(node: ConversationViewNode): StepItem | null {
  if (!node) return null
  if (node.kind === 'tool-call') {
    const root = (node.data as DockToolCallData | undefined)?.root
    const rawName = (root?.call?.name as string) || (root?.name as string) || (root?.callId ? `tool_${String(root.callId)}` : 'tool')
    const argsRaw = (root?.call?.argsRaw as string) || (root?.argsRaw as string) || ''
    const title = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : 'Tool'

    let parsedArgs: Record<string, unknown> | null = null
    if (argsRaw) {
      try {
        parsedArgs = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw
      } catch {
        parsedArgs = { raw: argsRaw }
      }
    }

    let summary = (
      parsedArgs?.description ||
      parsedArgs?.command ||
      parsedArgs?.path ||
      parsedArgs?.file_path ||
      parsedArgs?.pattern ||
      parsedArgs?.query ||
      parsedArgs?.CommandLine ||
      parsedArgs?.TargetFile ||
      parsedArgs?.SearchPath ||
      parsedArgs?.Query ||
      parsedArgs?.Url ||
      ''
    ) as string

    if (!summary && parsedArgs) {
      for (const val of Object.values(parsedArgs)) {
        if (typeof val === 'string' && val.trim() && val.length < 200) {
          summary = val.trim()
          break
        }
      }
    }

    const isTerminal = /bash|pwsh|cmd|sh|terminal|shell/i.test(rawName)
    const command = (parsedArgs?.command as string) || (parsedArgs?.CommandLine as string) || (isTerminal ? String(argsRaw) : undefined)
    const filePath = (parsedArgs?.path || parsedArgs?.file_path || parsedArgs?.TargetFile) as string | undefined
    const pattern = (parsedArgs?.pattern || parsedArgs?.query || parsedArgs?.Query) as string | undefined

    let output = ''
    const rootContent = root?.content
    const resultContent = root?.result?.content
    if (typeof rootContent === 'string') {
      output = rootContent
    } else if (Array.isArray(rootContent)) {
      output = rootContent.map((c: unknown) => typeof c === 'string' ? c : (c as { text?: string } | undefined)?.text || JSON.stringify(c)).join('\n')
    } else if (resultContent) {
      output = typeof resultContent === 'string' ? resultContent : JSON.stringify(resultContent, null, 2)
    }

    let error = ''
    if (root?.isError) {
      const rootError = root.error
      error = typeof rootError === 'string'
        ? rootError
        : (rootError as { message?: string } | undefined)?.message || output || 'Error occurred during execution'
    }

    const itemSummary = summary || (root?.title as string) || rawName
    return {
      key: node.key,
      kind: 'tool',
      rawName,
      title,
      summary: itemSummary,
      command,
      args: parsedArgs,
      output,
      error,
      filePath,
      pattern,
      isTerminal,
    }
  }

  if (node.kind === 'context') {
    const data = node.data as {
      readonly source?: { readonly files?: unknown } | undefined
      readonly provenance?: { readonly label?: unknown } | undefined
      readonly content?: unknown
    } | undefined
    const title = 'การแทรก Context'
    const sourceFiles = data?.source?.files
    const files = Array.isArray(sourceFiles)
      ? sourceFiles.map((f: unknown) => String(f).split(/[\\/]/).pop()).join(', ')
      : ''
    const summary = files || (data?.provenance?.label as string) || ''
    const rawContent = data?.content
    const contextContent = Array.isArray(rawContent)
      ? rawContent.map((c: unknown) => typeof c === 'string' ? c : (c as { text?: string } | undefined)?.text || JSON.stringify(c)).join('\n\n')
      : (typeof rawContent === 'string' ? rawContent : '')

    return {
      key: node.key,
      kind: 'context',
      title,
      summary,
      contextContent,
    }
  }

  if (node.kind === 'assistant-step') {
    const data = node.data as { blocks?: readonly { kind?: unknown; text?: unknown }[] | undefined } | undefined
    const blocks = data?.blocks
    let reasoning = (blocks?.find(b => b.kind === 'reasoning')?.text as string) || ''
    if (!reasoning || !reasoning.trim()) {
      for (const b of blocks || []) {
        if (b.kind === 'text' && typeof b.text === 'string') {
          const { monologue } = splitScratchpad(b.text)
          if (monologue) {
            reasoning = monologue
            break
          }
        }
      }
    }
    if (!reasoning || !reasoning.trim()) return null
    const fullReasoning = reasoning.trim()
    const lines = fullReasoning.split('\n').filter(Boolean)
    const summary = lines[0] || 'Thinking...'
    const title = 'วิเคราะห์'

    return {
      key: node.key,
      kind: 'thinking',
      title,
      summary,
      reasoningText: fullReasoning,
    }
  }

  return null
}

export function StepDetailsCard({ item }: { item: StepItem }) {
  return (
    <>
      {item.kind === 'thinking' && (
        <div className={css.thinkingBody}>
          {item.reasoningText}
        </div>
      )}

      {item.kind === 'context' && (
        <div className={css.contextCard}>
          <pre className={css.preOutput}>{item.contextContent || '(ไม่มีรายละเอียด Context)'}</pre>
        </div>
      )}

      {item.kind === 'tool' && item.isTerminal && (
        <div className={css.terminalCard}>
          {item.command && (
            <div className={css.terminalPromptLine}>
              <span className={css.terminalPrompt}>&gt;_</span>
              <span className={css.terminalCmdText}>{item.command}</span>
            </div>
          )}
          {item.output && (
            <pre className={css.preOutput}>{item.output}</pre>
          )}
          {item.error && (
            <pre className={clsx(css.preOutput, css.preError)}>{item.error}</pre>
          )}
          {!item.output && !item.error && (
            <div className={css.emptyOutput}>กำลังประมวลผลคำสั่ง...</div>
          )}
        </div>
      )}

      {item.kind === 'tool' && item.filePath && (
        <div className={css.fileCard}>
          <div className={css.fileHeader}>
            <span className={css.fileLabel}>ไฟล์:</span>
            <span className={css.filePath}>{item.filePath}</span>
          </div>
          {item.output && (
            <pre className={css.preOutput}>{item.output}</pre>
          )}
          {item.error && (
            <pre className={clsx(css.preOutput, css.preError)}>{item.error}</pre>
          )}
          {!item.output && !item.error && (
            <div className={css.emptyOutput}>กำลังอ่านไฟล์...</div>
          )}
        </div>
      )}

      {item.kind === 'tool' && !item.isTerminal && !item.filePath && (
        <div className={css.genericCard}>
          {item.pattern && (
            <div className={css.paramRow}>
              <span className={css.paramLabel}>Pattern:</span>
              <code className={css.paramCode}>{item.pattern}</code>
            </div>
          )}
          {item.args && Object.keys(item.args).length > 0 && !item.pattern && !item.command && (
            <div className={css.paramSection}>
              <div className={css.sectionLabel}>INPUT:</div>
              <pre className={css.preJson}>{JSON.stringify(item.args, null, 2)}</pre>
            </div>
          )}
          {(item.output || item.error) && (
            <div className={css.paramSection}>
              <div className={css.sectionLabel}>OUTPUT:</div>
              <pre className={item.error ? clsx(css.preOutput, css.preError) : css.preOutput}>
                {item.error || item.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export function StepRow({
  item,
  isOpen,
  onToggle,
}: {
  readonly item: StepItem
  readonly isOpen: boolean
  readonly onToggle: () => void
}) {
  return (
    <div className={css.stepWrapper}>
      <button
        type="button"
        className={css.stepRowHeader}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className={css.stepLeading}>
          {renderStepIcon(item.kind, item.rawName)}
        </span>
        <span className={css.stepTitle}>{item.title}</span>
        {item.summary && (
          <>
            <span className={css.stepSep} aria-hidden="true">·</span>
            <span className={css.stepSummary} title={item.summary}>{item.summary}</span>
          </>
        )}
        <span className={css.stepChevron}>
          {isOpen ? <IconChevronUpOutline14 size={14} /> : <IconChevronDownOutline14 size={14} />}
        </span>
      </button>
      {isOpen && (
        <div className={css.stepExpandedCard}>
          <StepDetailsCard item={item} />
        </div>
      )}
    </div>
  )
}

export interface StepItem {
  key: string
  kind: 'thinking' | 'tool' | 'context'
  rawName?: string | undefined
  title: string
  summary: string
  command?: string | undefined
  args?: Record<string, unknown> | null | undefined
  output?: string | undefined
  error?: string | undefined
  filePath?: string | undefined
  pattern?: string | undefined
  contextContent?: string | undefined
  reasoningText?: string | undefined
  isTerminal?: boolean | undefined
}

export type ThinkingDockProps = PropsRuntime<'conversation.input.dock'> & {
  readonly useSession: ChatViewSlotProps['useSession']
} & PropsLocale<'conversation'>

/**
 * Live thinking status dock positioned above the composer input box.
 * Consolidates all tool calls, context injections, and reasoning into a clean
 * status dock, with fully expandable and collapsible step details.
 */
export function ThinkingDock({ useSession, t }: ThinkingDockProps) {
  const running = useSession(s => s.running)
  const order = useSession(s => s.chat?.order) ?? []
  const nodeStore = useSession(s => s.chat?.nodes)
  const timeline = useSession(s => s.chat?.timeline)

  const [expanded, setExpanded] = useState(false)
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({})
  const [mountedAt] = useState(() => Date.now())
  const [settling, setSettling] = useState(false)
  const [whaleLanding, setWhaleLanding] = useState(false)
  const prevRunningRef = useRef(running)

  useEffect(() => {
    if (prevRunningRef.current && !running) {
      setSettling(true)
      const timer = setTimeout(() => {
        setSettling(false)
        setWhaleLanding(true)
        const landingTimer = setTimeout(() => {
          setWhaleLanding(false)
        }, 900)
        return () => { clearTimeout(landingTimer) }
      }, 850)
      return () => { clearTimeout(timer) }
    }
    if (running) {
      setSettling(false)
      setWhaleLanding(false)
    }
    prevRunningRef.current = running
  }, [running])

  const startTime = useMemo(() => runningTurnStartTime(timeline), [timeline])
  const anchor = startTime ?? mountedAt
  const [elapsedMs, setElapsedMs] = useState(() => Math.max(0, Date.now() - anchor))

  useEffect(() => {
    if (!running) return
    const tick = (): void => {
      setElapsedMs(Math.max(0, Date.now() - anchor))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => { clearInterval(id) }
  }, [anchor, running])

  const toggleStep = (key: string) => {
    setOpenSteps(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const activityData = useMemo(() => {
    let activeLabel = ''
    let activeKind: 'thinking' | 'tool' | 'context' = 'thinking'
    let activeRawName: string | undefined
    const history: StepItem[] = []

    for (let i = order.length - 1; i >= 0; i--) {
      const key = order[i]
      if (key === undefined || nodeStore === undefined) continue
      const node = nodeStore.get(key)
      if (!node) continue
      if (node.kind === 'user' || node.kind === 'steering') {
        break
      }
      const item = parseChatNodeStep(node)
      if (item) {
        history.unshift(item)
        if (!activeLabel) {
          if (item.kind === 'tool') {
            activeLabel = item.summary ? `${item.title} · ${item.summary.split('\n')[0]?.trim()}` : item.title
            activeKind = 'tool'
            activeRawName = item.rawName
          } else if (item.kind === 'context') {
            activeLabel = item.summary ? `${item.title} · ${item.summary}` : item.title
            activeKind = 'context'
            activeRawName = undefined
          } else if (item.kind === 'thinking') {
            activeLabel = item.summary
            activeKind = 'thinking'
            activeRawName = undefined
          }
        }
      }
    }

    return {
      activeLabel: activeLabel || (running ? 'กำลังวิเคราะห์และดำเนินการ...' : `${history.length} ขั้นตอน`),
      activeKind,
      activeRawName,
      history,
    }
  }, [nodeStore, order, running])

  if (!running && activityData.history.length === 0) return null

  const elapsedLabel = formatRunDuration(elapsedMs, t)

  return (
    <div className={css.dockContainer} role="status" aria-live="polite">
      <div className={css.dockCard} data-state={running ? 'running' : 'settled'}>
        <div
          className={css.dockHeader}
          onClick={() => { setExpanded(exp => !exp) }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setExpanded(exp => !exp)
            }
          }}
          aria-expanded={expanded}
          aria-label={running ? `กำลังดำเนินการ: ${activityData.activeLabel}` : `ดำเนินการเสร็จสิ้น: ${activityData.history.length} ขั้นตอน`}
        >
          <div className={css.leftCluster}>
            {(running || settling) ? (
              <div className={css.waveBadge} aria-hidden>
                <WaterWaveIcon settling={settling} />
              </div>
            ) : (
              <div className={clsx(css.whaleBadge, whaleLanding && css.whaleBadgeLanding)} aria-hidden>
                <FishLogo
                  size={19}
                  className={clsx(css.floatingWhale, whaleLanding && css.landingWhale)}
                />
                {whaleLanding && (
                  <span className={css.dockSplashContainer}>
                    <span className={clsx(css.dockSplashRipple, css.dockRipple1)} />
                    <span className={clsx(css.dockSplashRipple, css.dockRipple2)} />
                    <span className={clsx(css.dockSplashDroplet, css.dockDroplet1)} />
                    <span className={clsx(css.dockSplashDroplet, css.dockDroplet2)} />
                    <span className={clsx(css.dockSplashDroplet, css.dockDroplet3)} />
                    <span className={clsx(css.dockSplashDroplet, css.dockDroplet4)} />
                  </span>
                )}
              </div>
            )}
            {(running || settling) ? (
              <span className={css.titleLabelWave}>
                <span className={css.waveSrOnly}>กำลังดำเนินการ ·</span>
                <span aria-hidden className={css.waveVisual}>
                  {['กำ', 'ลัง', 'ดำ', 'เนิน', 'การ', ' ·'].map((char, i) => (
                    <span
                      key={i}
                      className={clsx(css.waveChar, settling && css.waveCharSettling)}
                      style={{ animationDelay: `${i * 0.14}s` }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </span>
            ) : (
              <span className={css.titleLabelSettled}>ดำเนินการเสร็จสิ้น ·</span>
            )}
            <span className={css.activityTicker}>
              {running ? (
                <span className={css.activeStepInline}>
                  <span className={css.activeStepIcon} aria-hidden>
                    {renderStepIcon(activityData.activeKind, activityData.activeRawName)}
                  </span>
                  <span className={css.activeStepText}>{activityData.activeLabel}</span>
                </span>
              ) : (
                `${activityData.history.length} ขั้นตอน`
              )}
            </span>
          </div>
          <div className={css.rightCluster}>
            <span className={css.timerBadge}>{elapsedLabel}</span>
            <button
              type="button"
              className={css.expandButton}
              aria-label={expanded ? 'ยุบแถบแสดงขั้นตอน' : 'กางดูขั้นตอนที่ทำ'}
            >
              {expanded ? <IconChevronUpOutline14 /> : <IconChevronDownOutline14 />}
            </button>
          </div>
        </div>

        {expanded && activityData.history.length > 0 && (
          <div className={css.expandedBody}>
            {activityData.history.map(item => (
              <StepRow
                key={item.key}
                item={item}
                isOpen={openSteps[item.key] ?? false}
                onToggle={() => { toggleStep(item.key) }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * ThinkingDock plugin registration into 'conversation.input.dock' with order 5.
 */
export const thinkingDockEntry = {
  name: 'conversation-thinking-dock',
  inject: ['slots'],
  apply(ctx: Context): void {
    ctx.slots.inject('conversation.input.dock', () =>
      ctx.slots.register({ name: 'conversation.input.dock', id: 'thinking', order: 5, locale: NS }, ThinkingDock))
  },
}
