/**
 * Pure helpers behind host.describe's version field and host.updateCheck's
 * tag comparison: checkout-root discovery and tag normalization. The git
 * process path itself (_execFile) stays untested here — it needs a real git
 * checkout and network, which the host harness deliberately avoids.
 */

import { describe, expect, it } from 'vitest'
import { findAppRoot, normalizeVersionTag } from '../src/api-proxy.ts'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

describe('findAppRoot', () => {
  it('walks up from a package dir to the pnpm-workspace.yaml holder', () => {
    const root = findAppRoot(fileURLToPath(new URL('.', import.meta.url)))
    expect(root).toEqual(expect.any(String))
    expect(readFileSync(`${root}/pnpm-workspace.yaml`, 'utf8')).toContain('packages:')
  })

  it('returns undefined when no ancestor holds the workspace marker', () => {
    expect(findAppRoot('C:\\')).toBeUndefined()
  })
})

describe('normalizeVersionTag', () => {
  it('strips the dsh-v prefix', () => {
    expect(normalizeVersionTag('dsh-v0.1.1-rc.2')).toBe('0.1.1-rc.2')
  })

  it('strips a bare v prefix', () => {
    expect(normalizeVersionTag('v1.2.3')).toBe('1.2.3')
  })

  it('leaves an already-normal version alone', () => {
    expect(normalizeVersionTag('0.1.0-rc.8')).toBe('0.1.0-rc.8')
  })
})
