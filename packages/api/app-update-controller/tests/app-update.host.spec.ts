import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { remoteErrorOf, remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import AppUpdateController from '../src/index.ts'
import {
  findAppRoot,
  normalizeVersionTag,
  readAppVersion,
  resolveLatestReleaseTag,
  type GitRunner,
} from '../src/update.ts'

/** One recorded call stream plus the refusals a stage can be told to raise. */
interface FakeWorld {
  readonly gitCalls: string[][]
  readonly pnpmCalls: string[][]
  readonly git: GitRunner
}

/** A git runner answering the updater's two read commands and recording every call. */
function fakeGit(options: {
  readonly head?: string
  readonly tag?: string | null
  readonly failOn?: string
  readonly error?: unknown
} = {}): FakeWorld {
  const gitCalls: string[][] = []
  const pnpmCalls: string[][] = []
  const git: GitRunner = async (call) => {
    gitCalls.push([...call])
    const line = call.join(' ')
    if (options.failOn !== undefined && line.startsWith(options.failOn)) {
      throw options.error ?? new Error('stage failed')
    }
    if (line.startsWith('ls-remote')) return options.head ?? 'ref: refs/heads/thai\tHEAD'
    if (line.startsWith('describe')) {
      if (options.tag === null) throw new Error('no tag reachable')
      return options.tag ?? 'thai-0.1.5-rc.3'
    }
    return ''
  }
  return { gitCalls, pnpmCalls, git }
}

/** Read the Remote refusal one call produced. */
async function refusalOf(call: Promise<unknown>): Promise<{ code: string; message: string; details: unknown }> {
  try {
    await call
  } catch (error) {
    const refusal = remoteErrorOf(error)
    if (refusal === undefined) throw error
    return { code: refusal.code, message: refusal.message, details: refusal.details }
  }
  throw new Error('expected the call to refuse')
}

/** A checkout directory holding the two manifests the walk looks for. */
function checkout(version: string | undefined): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-app-update-'))
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')
  writeFileSync(join(root, 'package.json'), JSON.stringify(version === undefined ? {} : { version }))
  return root
}

describe('checkout facts the updater reads', () => {
  it('walks up to the first ancestor holding both manifests', () => {
    const root = checkout('0.1.5-rc.2')
    const nested = join(root, 'packages', 'api', 'app-update-controller')
    mkdirSync(nested, { recursive: true })
    expect(findAppRoot(nested)).toBe(root)
    expect(findAppRoot(tmpdir())).toBeUndefined()
  })

  it('reports the root version, and unknown when the manifest carries none', () => {
    expect(readAppVersion(checkout('0.1.5-rc.2'))).toBe('0.1.5-rc.2')
    expect(readAppVersion(checkout(undefined))).toBe('unknown')
    expect(readAppVersion(join(tmpdir(), 'dsh-absent-checkout'))).toBe('unknown')
  })

  it('strips the release prefixes the publish and upstream repositories use', () => {
    expect(normalizeVersionTag('thai-0.1.5-rc.3')).toBe('0.1.5-rc.3')
    expect(normalizeVersionTag('dsh-v0.1.5-rc.2')).toBe('0.1.5-rc.2')
    expect(normalizeVersionTag('v0.1.0')).toBe('0.1.0')
    expect(normalizeVersionTag('0.1.5')).toBe('0.1.5')
  })

  it('resolves the release from the remote-advertised default branch', async () => {
    const world = fakeGit({ head: 'ref: refs/heads/thai\tHEAD', tag: 'thai-0.1.5-rc.3' })
    expect(await resolveLatestReleaseTag(world.git)).toBe('thai-0.1.5-rc.3')
    expect(world.gitCalls[0]).toEqual(['ls-remote', '--symref', 'origin', 'HEAD'])
    expect(world.gitCalls[1]).toEqual(['describe', '--tags', '--abbrev=0', 'origin/thai'])
  })

  it('reports no tag when the remote advertises no branch or reachable tag', async () => {
    expect(await resolveLatestReleaseTag(fakeGit({ head: 'no ref here' }).git)).toBeNull()
    expect(await resolveLatestReleaseTag(fakeGit({ tag: null }).git)).toBeNull()
  })
})

describe('the appUpdate Remote namespace', () => {
  /** Boot the controller with injected integrations and return its recorded world. */
  async function boot(
    options: {
      readonly appRoot?: string | undefined
      readonly version?: string
      readonly tag?: string | null
      readonly failGitOn?: string
      readonly gitError?: unknown
      readonly failPnpmOn?: string
    } = {},
  ): Promise<{ controller: AppUpdateController; world: FakeWorld }> {
    const world = fakeGit({
      ...options.tag === undefined ? {} : { tag: options.tag },
      ...options.failGitOn === undefined ? {} : { failOn: options.failGitOn },
      ...options.gitError === undefined ? {} : { error: options.gitError },
    })
    const controller = new AppUpdateController(new Context(), {}, {
      appRoot: () => options.appRoot,
      readVersion: () => options.version ?? '0.1.5-rc.2',
      git: () => world.git,
      pnpm: async (_root, args) => {
        world.pnpmCalls.push([...args])
        if (options.failPnpmOn !== undefined && args[0] === options.failPnpmOn) {
          throw new Error(`${options.failPnpmOn} failed`)
        }
        return { stdout: '', stderr: '' }
      },
    })
    return { controller, world }
  }

  /** Boot with a checkout root so the write stages can run. */
  async function bootInCheckout(
    options: Parameters<typeof boot>[0] = {},
  ): Promise<{ controller: AppUpdateController; world: FakeWorld }> {
    return boot({ appRoot: '/checkout', ...options })
  }

  it('publishes the namespace from the appUpdate service key', async () => {
    const { controller } = await boot({ appRoot: '/checkout' })
    expect(controller.typertRemote.serviceKey).toBe('appUpdate')
    expect(controller.typertRemote.namespace).toBe('appUpdate')
    expect(remoteMethods(controller).map(marker => marker.method)).toEqual(['info', 'check', 'apply'])
  })

  it('reports the running version and checkout root, or null outside a checkout', async () => {
    const { controller } = await boot({ appRoot: '/checkout', version: '0.1.5-rc.2' })
    expect(controller.info()).toEqual({ version: '0.1.5-rc.2', appRoot: '/checkout' })
    const outside = await boot({ appRoot: undefined })
    expect(outside.controller.info()).toEqual({ version: 'unknown', appRoot: null })
  })

  it('checks without writing to the working tree', async () => {
    const { controller, world } = await bootInCheckout({ tag: 'thai-0.1.5-rc.3', version: '0.1.5-rc.2' })
    await expect(controller.check(new AbortController().signal)).resolves.toEqual({
      currentVersion: '0.1.5-rc.2',
      latestVersion: '0.1.5-rc.3',
      updateAvailable: true,
    })
    expect(world.gitCalls.map(call => call[0])).toEqual(['fetch', 'ls-remote', 'describe'])
    expect(world.pnpmCalls).toEqual([])
  })

  it('reports no update when the newest release is the running version', async () => {
    const { controller } = await bootInCheckout({ tag: 'thai-0.1.5-rc.2', version: '0.1.5-rc.2' })
    await expect(controller.check(new AbortController().signal)).resolves.toEqual({
      currentVersion: '0.1.5-rc.2',
      latestVersion: '0.1.5-rc.2',
      updateAvailable: false,
    })
  })

  it('refuses a check without a checkout, a missing git, and a failed fetch', async () => {
    const outside = await boot({ appRoot: undefined })
    expect((await refusalOf(outside.controller.check(new AbortController().signal))).code)
      .toBe('update/not-a-checkout')
    const missingGit = await bootInCheckout({
      gitError: Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }),
      failGitOn: 'fetch',
    })
    expect((await refusalOf(missingGit.controller.check(new AbortController().signal))).code)
      .toBe('update/git-unavailable')
    const failed = await bootInCheckout({ failGitOn: 'fetch' })
    const refusal = await refusalOf(failed.controller.check(new AbortController().signal))
    expect(refusal.code).toBe('update/fetch-failed')
    expect(refusal.message).toContain('stage failed')
  })

  it('applies a release through fetch, detached checkout, install, and build', async () => {
    const { controller, world } = await bootInCheckout({ tag: 'thai-0.1.5-rc.3' })
    await expect(controller.apply(new AbortController().signal)).resolves.toEqual({ appliedVersion: '0.1.5-rc.3' })
    expect(world.gitCalls).toEqual([
      ['fetch', 'origin', '--tags', '--quiet'],
      ['ls-remote', '--symref', 'origin', 'HEAD'],
      ['describe', '--tags', '--abbrev=0', 'origin/thai'],
      ['checkout', '--detach', 'thai-0.1.5-rc.3'],
    ])
    expect(world.pnpmCalls).toEqual([['install'], ['build']])
  })

  it('refuses an apply with no reachable release tag', async () => {
    const { controller, world } = await bootInCheckout({ tag: null })
    expect((await refusalOf(controller.apply(new AbortController().signal))).code).toBe('update/no-release-tag')
    expect(world.pnpmCalls).toEqual([])
  })

  it('names the failed stage, and its tag, in each apply refusal', async () => {
    const checkoutFailure = await bootInCheckout({ tag: 'thai-0.1.5-rc.3', failGitOn: 'checkout' })
    const refused = await refusalOf(checkoutFailure.controller.apply(new AbortController().signal))
    expect(refused.code).toBe('update/checkout-failed')
    expect(refused.details).toEqual({ tag: 'thai-0.1.5-rc.3' })
    expect(checkoutFailure.world.pnpmCalls).toEqual([])

    const installFailure = await bootInCheckout({ tag: 'thai-0.1.5-rc.3', failPnpmOn: 'install' })
    const install = await refusalOf(installFailure.controller.apply(new AbortController().signal))
    expect(install.code).toBe('update/install-failed')
    expect(installFailure.world.pnpmCalls).toEqual([['install']])

    const buildFailure = await bootInCheckout({ tag: 'thai-0.1.5-rc.3', failPnpmOn: 'build' })
    const build = await refusalOf(buildFailure.controller.apply(new AbortController().signal))
    expect(build.code).toBe('update/build-failed')
    expect(buildFailure.world.pnpmCalls).toEqual([['install'], ['build']])
  })
})
