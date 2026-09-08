// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { PromptNavigator, type PromptNavItem } from '../src/client/chat/PromptNavigator.tsx'

afterEach(() => {
  cleanup()
})

const mockItems: PromptNavItem[] = [
  { key: 'user-1', text: 'สำรวจโปรเจ็คนี้', index: 1 },
  { key: 'user-2', text: 'อยากแก้ไขหน่อย', index: 2 },
  { key: 'user-3', text: 'เปิดแอปไม่ขึ้น', index: 3 },
]

describe('PromptNavigator', () => {
  it('renders nothing when there are fewer than 2 items', () => {
    const onJump = vi.fn()
    const { container } = render(
      <PromptNavigator
        items={[{ key: 'user-1', text: 'Hello', index: 1 }]}
        activeKey="user-1"
        onJump={onJump}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a tick for each user message and highlights active item', () => {
    const onJump = vi.fn()
    const view = render(
      <PromptNavigator
        items={mockItems}
        activeKey="user-2"
        onJump={onJump}
      />,
    )

    const buttons = view.getAllByRole('button')
    expect(buttons).toHaveLength(3)

    // Second button is active
    expect(buttons[0]?.getAttribute('data-active')).toBeNull()
    expect(buttons[1]?.getAttribute('data-active')).toBe('true')
    expect(buttons[2]?.getAttribute('data-active')).toBeNull()

    // Preview tooltip text is present
    expect(view.getByText('สำรวจโปรเจ็คนี้')).toBeTruthy()
    expect(view.getByText('อยากแก้ไขหน่อย')).toBeTruthy()
    expect(view.getByText('เปิดแอปไม่ขึ้น')).toBeTruthy()
  })

  it('triggers onJump when a tick is clicked', () => {
    const onJump = vi.fn()
    const view = render(
      <PromptNavigator
        items={mockItems}
        activeKey="user-1"
        onJump={onJump}
      />,
    )

    const buttons = view.getAllByRole('button')
    fireEvent.click(buttons[2]!)
    expect(onJump).toHaveBeenCalledWith('user-3')
  })
})
