import { memo } from 'react'
import css from './PromptNavigator.module.css'

export interface PromptNavItem {
  readonly key: string
  readonly text: string
  readonly index: number
}

export interface PromptNavigatorProps {
  readonly items: readonly PromptNavItem[]
  readonly activeKey: string | null
  readonly onJump: (key: string) => void
  readonly label?: string
}

/**
 * Vertical prompt timeline navigation strip showing tick marks for each user message.
 * Hovering shows message preview; clicking smoothly scrolls to that message.
 *
 * @param props.items - list of user message navigator items.
 * @param props.activeKey - anchor key of currently viewed user message.
 * @param props.onJump - callback invoked with anchor key when user clicks a tick.
 * @param props.label - localized label prefix for message accessibility.
 * @returns the navigation strip component or null when fewer than 2 items exist.
 */
export const PromptNavigator = memo(function PromptNavigator({
  items,
  activeKey,
  onJump,
  label = 'User message',
}: PromptNavigatorProps) {
  if (items.length < 2) return null

  return (
    <nav className={css.navigatorRoot} aria-label="User message timeline navigation">
      {items.map((item) => {
        const isActive = item.key === activeKey
        const preview = item.text || `#${item.index}`
        return (
          <button
            key={item.key}
            type="button"
            className={css.tickItem}
            data-active={isActive ? 'true' : undefined}
            onClick={() => { onJump(item.key) }}
            aria-label={`${label} #${item.index}: ${preview.slice(0, 50)}`}
          >
            <span className={css.tickBar} />
            <div className={css.tooltip}>
              <span className={css.tooltipIndex}>#{item.index}</span>
              <span className={css.tooltipText}>{preview}</span>
            </div>
          </button>
        )
      })}
    </nav>
  )
})
