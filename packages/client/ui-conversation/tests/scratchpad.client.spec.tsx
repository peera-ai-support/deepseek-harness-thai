// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { th as commonTh } from '@deepseek-ai/dsh-client-locale/src/locales/th.ts'
import { AssistantMarkdown, type AssistantMarkdownProps } from '../src/client/chat/AssistantMarkdown.tsx'
import { isAgentScratchpad, splitScratchpad } from '../src/client/chat/scratchpad.ts'
import { th } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const t = makeTranslate(th, commonTh)
const renderMessageImages: AssistantMarkdownProps['renderMessageImages'] = () => null

describe('scratchpad splitter', () => {
  it('detects agent scratchpad prefixes correctly', () => {
    expect(isAgentScratchpad("Let's see: In CanvasWorkspace.tsx")).toBe(true)
    expect(isAgentScratchpad("Let's inspect lines 400-500")).toBe(true)
    expect(isAgentScratchpad("Let's check handleReloadLiveMatchData")).toBe(true)
    expect(isAgentScratchpad('Thinking Process: first check the store')).toBe(true)
    expect(isAgentScratchpad('I need to check the files')).toBe(true)
    expect(isAgentScratchpad('Here is the explanation of React useEffect')).toBe(false)
    expect(isAgentScratchpad('จากการตรวจสอบโค้ดในระบบ')).toBe(false)
  })

  it('splits monologue from Thai answer when both exist in one block', () => {
    const raw = `Let's see: In CanvasWorkspace.tsx lines 4943-4983:
tsx
code inspection here...
Let's analyze what this status means
Typecheck passes cleanly with 0 errors!
Let's summarize the diagnosis and the fixes clearly in Thai.จากการตรวจสอบโค้ดใน CanvasWorkspace.tsx สำหรับแถบควบคุมด้านล่าง พบสาเหตุและได้ทำการปรับปรุงแก้ไขให้เรียบร้อยแล้วครับ:)`

    const { monologue, answer } = splitScratchpad(raw)
    expect(monologue).toContain("Let's see: In CanvasWorkspace.tsx")
    expect(monologue).toContain("Let's summarize the diagnosis and the fixes clearly in Thai.")
    expect(answer).toBe('จากการตรวจสอบโค้ดใน CanvasWorkspace.tsx สำหรับแถบควบคุมด้านล่าง พบสาเหตุและได้ทำการปรับปรุงแก้ไขให้เรียบร้อยแล้วครับ:)')
  })

  it('treats 100% monologue before tool calls as monologue with empty answer', () => {
    const raw = "Let's check ScheduleModal.tsx lines 400-500 to see where getSmartHashtags is used."
    const { monologue, answer } = splitScratchpad(raw)
    expect(monologue).toBe(raw)
    expect(answer).toBe('')
  })

  it('splits monologue from English summary headers', () => {
    const raw = 'Let\'s inspect the index.html file.\nLet\'s verify the script tags.\n\nHere is the summary of the fix:\nWe added the bundle.js script.'
    const { monologue, answer } = splitScratchpad(raw)
    expect(monologue).toContain("Let's inspect the index.html")
    expect(answer).toContain('Here is the summary of the fix:')
  })

  it('renders monologue into a collapsible analysis row and the answer into markdown', () => {
    const raw = `Let's inspect lines 100-200 in App.tsx
Let's check the bug.
Let's summarize in Thai.
ทำการแก้ไขบั๊กเรียบร้อยแล้วครับ`

    const view = render(
      <AssistantMarkdown
        t={t}
        blocks={[{ kind: 'text', text: raw }]}
        streaming={false}
        renderMessageImages={renderMessageImages}
      />,
    )

    // Title of the analysis row in Thai
    expect(view.getByText('การวิเคราะห์และขั้นตอน')).toBeTruthy()
    // Summary of the monologue line
    expect(view.getByText(/Let's inspect lines 100-200/)).toBeTruthy()
    // Clean answer rendered in markdown
    expect(view.getByText('ทำการแก้ไขบั๊กเรียบร้อยแล้วครับ')).toBeTruthy()

    // Clicking disclosure expands the monologue body
    fireEvent.click(view.getByText('การวิเคราะห์และขั้นตอน'))
    expect(view.getByText(/Let's check the bug/)).toBeTruthy()
  })
})
