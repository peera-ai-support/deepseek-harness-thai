import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  FishLogo,
  IconChevronDownOutline14,
  IconChevronUpOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { formatRunDuration } from './message-chrome.ts'
import {
  parseChatNodeStep,
  StepRow,
  type StepItem,
} from './ThinkingDock.tsx'
import css from './TurnCompletedSteps.module.css'

export interface TurnCompletedStepsProps {
  readonly turnId: number
  readonly useSession: ChatViewSlotProps['useSession']
  readonly t: ChatViewSlotProps['t']
  readonly runMs?: number | undefined
  readonly forceShow?: boolean | undefined
}

/**
 * Permanent completed steps summary anchored directly to the assistant's turn response.
 * Only displays for historical turns (when a new command has been typed/sent), avoiding
 * duplicate display while the latest turn is already actively shown in the main dock.
 */
export const TurnCompletedSteps = memo(function TurnCompletedSteps({
  turnId,
  useSession,
  t,
  runMs,
  forceShow,
}: TurnCompletedStepsProps) {
  const turnKeys = useSession(s => s.chat?.locations?.getTurn(turnId)) ?? []
  const nodeStore = useSession(s => s.chat?.nodes)

  const isLatestTurn = useSession((s) => {
    // If a subsequent turn exists in timeline turnOrder, this turn is not the latest
    const turnOrder = s.chat?.timeline?.turnOrder ?? []
    const latestRecordedTurn = turnOrder.at(-1)
    if (latestRecordedTurn !== undefined && latestRecordedTurn > turnId) {
      return false
    }

    // Check chat.order: if there is any 'user' or 'steering' node after this turn,
    // it means the user has typed/sent a new command
    const order = s.chat?.order ?? []
    const currentTurnKeys = s.chat?.locations?.getTurn(turnId) ?? []
    const lastKeyOfTurn = currentTurnKeys.at(-1)

    if (lastKeyOfTurn !== undefined) {
      const idx = order.indexOf(lastKeyOfTurn)
      if (idx !== -1 && idx < order.length - 1) {
        for (let i = idx + 1; i < order.length; i++) {
          const key = order[i]
          if (key === undefined) continue
          const nextNode = s.chat?.nodes?.get(key)
          if (nextNode?.kind === 'user' || nextNode?.kind === 'steering') {
            return false
          }
          if (nextNode?.location && 'turn' in nextNode.location && nextNode.location.turn) {
            const tNum = typeof nextNode.location.turn === 'object' ? nextNode.location.turn.turn : nextNode.location.turn
            if (typeof tNum === 'number' && tNum > turnId) {
              return false
            }
          }
        }
      }
    }

    // If the session is currently running a new command
    if (s.running) {
      return false
    }

    return true
  })

  const [expanded, setExpanded] = useState(false)
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({})
  const headerRef = useRef<HTMLDivElement>(null)
  const prevTopRef = useRef<number | null>(null)

  const toggleExpand = () => {
    if (headerRef.current) {
      prevTopRef.current = headerRef.current.getBoundingClientRect().top
    }
    setExpanded(exp => !exp)
  }

  useLayoutEffect(() => {
    if (!headerRef.current) return
    const header = headerRef.current
    const scroller = header.closest<HTMLElement>('[data-conversation-scroll]')
    if (!scroller) return

    let raf1: number | undefined
    let raf2: number | undefined

    const adjust = () => {
      if (!headerRef.current || prevTopRef.current === null) return
      const headerRect = headerRef.current.getBoundingClientRect()
      const scrollerRect = scroller.getBoundingClientRect()
      const topMin = scrollerRect.top + 8

      // Target position: preserve exact position when clicked (guaranteed >= topMin)
      const targetTop = Math.max(topMin, prevTopRef.current)
      const delta = headerRect.top - targetTop

      if (Math.abs(delta) > 0.5) {
        scroller.scrollTop += delta
      }
    }

    if (expanded) {
      adjust()
      raf1 = requestAnimationFrame(() => {
        adjust()
        raf2 = requestAnimationFrame(() => {
          adjust()
          prevTopRef.current = null
        })
      })
    } else if (prevTopRef.current !== null) {
      adjust()
      prevTopRef.current = null
    }

    return () => {
      if (raf1 !== undefined) cancelAnimationFrame(raf1)
      if (raf2 !== undefined) cancelAnimationFrame(raf2)
    }
  }, [expanded])

  const steps = useMemo<readonly StepItem[]>(() => {
    if (!nodeStore || turnKeys.length === 0) return []
    const items: StepItem[] = []
    for (const key of turnKeys) {
      const node = nodeStore.get(key)
      if (!node) continue
      const item = parseChatNodeStep(node)
      if (item) {
        items.push(item)
      }
    }
    return items
  }, [nodeStore, turnKeys])

  // If this is the latest turn and hasn't been superseded by a new user command,
  // do not show it here because it is already displayed in the main dock below.
  if (!forceShow && isLatestTurn) {
    return null
  }

  if (steps.length === 0) return null

  const toggleStep = (key: string) => {
    setOpenSteps(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const durationLabel = runMs !== undefined ? formatRunDuration(runMs, t) : undefined

  return (
    <div className={css.container} role="region" aria-label="ขั้นตอนการดำเนินการ">
      <div
        ref={headerRef}
        className={css.header}
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleExpand()
          }
        }}
        aria-expanded={expanded}
      >
        <div className={css.leftCluster}>
          <span className={css.whaleBadge} aria-hidden="true">
            <FishLogo size={16} className={css.floatingWhale} />
          </span>
          <span className={css.titleLabel}>ดำเนินการเสร็จสิ้น ·</span>
          <span className={css.stepCount}>{steps.length} ขั้นตอน</span>
        </div>
        <div className={css.rightCluster}>
          {durationLabel && <span className={css.timerBadge}>{durationLabel}</span>}
          <button
            type="button"
            className={css.expandButton}
            aria-label={expanded ? 'ยุบแถบแสดงขั้นตอน' : 'กางดูขั้นตอนที่ทำ'}
          >
            {expanded ? <IconChevronUpOutline14 /> : <IconChevronDownOutline14 />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className={css.expandedBody}>
          {steps.map(item => (
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
  )
})
