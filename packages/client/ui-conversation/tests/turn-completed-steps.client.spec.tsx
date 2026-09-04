// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { TurnCompletedSteps, type TurnCompletedStepsProps } from '../src/client/chat/TurnCompletedSteps.tsx'

afterEach(() => {
  cleanup()
})

describe('TurnCompletedSteps', () => {
  it('renders nothing when there are no steps in the turn', () => {
    const useSession = vi.fn().mockReturnValue([])
    const props: TurnCompletedStepsProps = {
      turnId: 1,
      useSession,
      t: (k: string) => k,
      runMs: 5000,
      forceShow: true,
    }
    const { container } = render(<TurnCompletedSteps {...props} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when it is the latest turn (since it is already shown in the main dock)', () => {
    const mockTurnKeys = ['step-1']
    const mockNodes = new Map<string, unknown>([
      ['step-1', {
        key: 'step-1',
        kind: 'tool-call',
        data: { root: { name: 'pwsh', title: 'Pwsh · git status' } },
      }],
    ])

    const useSession = vi.fn().mockImplementation((selector: (s: unknown) => unknown) => {
      const state = {
        running: false,
        chat: {
          order: ['step-1'],
          timeline: { turnOrder: [1] },
          locations: {
            getTurn: (id: number) => id === 1 ? mockTurnKeys : [],
          },
          nodes: mockNodes,
        },
      }
      return selector(state)
    })

    const props: TurnCompletedStepsProps = {
      turnId: 1,
      useSession,
      t: (k: string) => k,
      runMs: 5000,
    }

    const { container } = render(<TurnCompletedSteps {...props} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders completed capsule when a newer turn has started and toggles expanded steps', () => {
    const mockTurnKeys = ['step-1', 'step-2']
    const mockNodes = new Map<string, unknown>([
      ['step-1', {
        key: 'step-1',
        kind: 'assistant-step',
        data: {
          blocks: [
            { kind: 'reasoning', text: 'Step 1 analysis reasoning' },
          ],
        },
      }],
      ['step-2', {
        key: 'step-2',
        kind: 'tool-call',
        data: {
          root: {
            name: 'pwsh',
            title: 'Pwsh · git status',
            call: { name: 'pwsh', argsRaw: '{"command":"git status"}' },
            content: 'On branch master',
          },
        },
      }],
      ['user-node-2', {
        key: 'user-node-2',
        kind: 'user',
        data: {},
      }],
    ])

    const useSession = vi.fn().mockImplementation((selector: (s: unknown) => unknown) => {
      const state = {
        running: true,
        chat: {
          order: ['step-1', 'step-2', 'user-node-2'],
          timeline: { turnOrder: [1, 2] },
          locations: {
            getTurn: (id: number) => id === 1 ? mockTurnKeys : ['user-node-2'],
          },
          nodes: mockNodes,
        },
      }
      return selector(state)
    })

    const props: TurnCompletedStepsProps = {
      turnId: 1,
      useSession,
      t: (k: string, opt?: Record<string, unknown>) => {
        if (opt && 'duration' in opt) return String(opt.duration)
        return k
      },
      runMs: 8000,
    }

    const view = render(<TurnCompletedSteps {...props} />)

    // Verify title and step count
    expect(view.getByText('ดำเนินการเสร็จสิ้น ·')).toBeTruthy()
    expect(view.getByText('2 ขั้นตอน')).toBeTruthy()

    // Initially collapsed
    expect(view.queryByText('On branch master')).toBeNull()

    // Click header to expand
    const header = view.getByRole('button', { name: /ดำเนินการเสร็จสิ้น/i })
    fireEvent.click(header)

    // Both step rows visible
    expect(view.getByText('Pwsh')).toBeTruthy()
    expect(view.getByText('วิเคราะห์')).toBeTruthy()

    // Click on Pwsh step to open disclosure
    const pwshRow = view.getByText('Pwsh')
    fireEvent.click(pwshRow)

    // Terminal command & output visible
    expect(view.getAllByText('git status').length).toBeGreaterThanOrEqual(1)
    expect(view.getByText('On branch master')).toBeTruthy()
  })
})
