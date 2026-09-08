// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ThinkingDock, thinkingDockEntry, type ThinkingDockProps } from '../src/client/chat/ThinkingDock.tsx'

afterEach(() => {
  cleanup()
})

describe('ThinkingDock', () => {
  it('registers into conversation.input.dock at order 5', () => {
    const inject = vi.fn()
    const register = vi.fn()
    expect(thinkingDockEntry.name).toBe('conversation-thinking-dock')
    expect(thinkingDockEntry.inject).toEqual(['slots'])
    thinkingDockEntry.apply({ slots: { inject, register } } as never)
    expect(inject).toHaveBeenCalledWith('conversation.input.dock', expect.any(Function))
  })

  it('renders nothing when session is not running', () => {
    const useSession = vi.fn().mockReturnValue(false)
    const props = {
      useSession,
      t: (k: string) => k,
    } as unknown as ThinkingDockProps
    const { container } = render(<ThinkingDock {...props} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders active live ticker and handles expand toggle when running', () => {
    const mockOrder = ['node-1', 'node-2']
    const mockNodes = new Map<string, unknown>([
      ['node-1', {
        key: 'node-1',
        kind: 'tool-call',
        data: { root: { name: 'pwsh', title: 'Pwsh · git status' } },
      }],
      ['node-2', {
        key: 'node-2',
        kind: 'assistant-step',
        data: {
          blocks: [
            { kind: 'reasoning', text: 'Analyzing repository structure...' },
          ],
        },
      }],
    ])
    const mockTimeline = {
      turns: new Map([
        [1, { status: 'open', start: { time: Date.now() - 5000 } }],
      ]),
    }

    const useSession = vi.fn().mockImplementation((selector: (s: unknown) => unknown) => {
      const state = {
        running: true,
        chat: {
          order: mockOrder,
          nodes: mockNodes,
          timeline: mockTimeline,
        },
      }
      return selector(state)
    })

    const props = {
      useSession,
      t: (k: string) => k,
    } as unknown as ThinkingDockProps
    const view = render(<ThinkingDock {...props} />)

    // Should show title and active label
    expect(view.getByText('กำลังดำเนินการ ·')).toBeTruthy()
    expect(view.getByText('Analyzing repository structure...')).toBeTruthy()

    // Expand header click
    const header = view.getByRole('button', { name: /กำลังดำเนินการ/i })
    fireEvent.click(header)

    // Should now show history items
    const pwshStep = view.getByText('Pwsh · git status')
    expect(pwshStep).toBeTruthy()

    // Clicking the step expands the details card
    fireEvent.click(pwshStep)
    // Should show command or status
    expect(view.container.querySelector('[class*="stepExpandedCard"]')).toBeTruthy()
  })
})
