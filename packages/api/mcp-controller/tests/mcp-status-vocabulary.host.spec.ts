import { describe, expect, it } from 'vitest'
import type { McpServerStatus as PublishedStatus } from '@deepseek-ai/dsh-mcp-client'
import type { McpServerStatus as ServedStatus } from '../src/types.ts'

// The controller restates the live-status vocabulary instead of importing it:
// mcp-client is a host-only plugin whose sources the browser compile program
// may not list. The assignments below are the mirror check between the two
// declarations and stop compiling when either side drifts.
describe('mcp status vocabulary', () => {
  it('serves the status declaration mcp-client publishes', () => {
    const published: PublishedStatus = {
      serverName: 'github',
      phase: 'reconnecting',
      attempt: 2,
      delayMs: 1000,
      tools: [{ name: 'mcp__github__search', rawName: 'search', description: 'Search repositories' }],
    }
    const served: ServedStatus = published
    const backToPublished: PublishedStatus = served

    expect(backToPublished).toEqual(published)
    expect(Object.keys(served).sort()).toEqual(Object.keys(published).sort())
  })
})
