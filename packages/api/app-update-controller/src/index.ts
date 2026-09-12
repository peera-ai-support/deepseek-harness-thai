/**
 * Host Remote owner for the in-app updater over a git checkout: the installed
 * version and checkout root, a read-only check against the newest release tag
 * on the remote's default branch, and an apply that detaches the working tree
 * at that tag and rebuilds it. Every stage is bounded by its own ceiling, and
 * the process calls take the scrubbed parent environment.
 *
 * @module @deepseek-ai/dsh-api-app-update-controller
 */

import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  findAppRoot,
  gitRunner,
  normalizeVersionTag,
  readAppVersion,
  resolveLatestReleaseTag,
  runPnpm,
  UPDATE_COMMAND_TIMEOUT_MS,
  UPDATE_READ_TIMEOUT_MS,
  type GitRunner,
} from './update.ts'
import type { AppUpdateApplyValue, AppUpdateCheckValue, AppUpdateInfoValue } from './types.ts'

export type * from './types.ts'

/** Host integrations replaceable by direct unit tests. */
export interface AppUpdateControllerInternals {
  /** Locate the checkout the updater acts on. */
  readonly appRoot?: () => string | undefined
  /** Read one checkout's root version. */
  readonly readVersion?: (appRoot: string) => string
  /** Bind a git runner to one checkout. */
  readonly git?: (appRoot: string, signal: AbortSignal, timeoutMs: number) => GitRunner
  /** Run one pnpm command in one checkout. */
  readonly pnpm?: (
    appRoot: string,
    args: readonly string[],
    signal: AbortSignal,
    timeoutMs: number,
  ) => Promise<{ stdout: string; stderr: string }>
  /** Per-command ceiling for checkout, install, and build. */
  readonly applyTimeoutMs?: number
  /** Per-command ceiling for fetch and release-tag resolution. */
  readonly readTimeoutMs?: number
}

/** Updater configuration. */
export interface Config {
  /** Per-command ceiling for checkout, install, and build, in milliseconds. */
  readonly applyTimeoutMs?: number
  /** Per-command ceiling for fetch and release-tag resolution, in milliseconds. */
  readonly readTimeoutMs?: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the `appUpdate` Remote namespace. */
    appUpdate: AppUpdateController
  }
}

/** Render whatever a stage threw for the refusal message. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** `git` missing from PATH is its own outcome: no later stage can succeed. */
function isMissingGit(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null | undefined)?.code
  return code === 'ENOENT' || code === 'ERR_ENOENT'
}

/**
 * The in-app updater's Host Remote namespace. `info` and `check` never write to
 * the working tree; `apply` rewrites it, so the client restarts the app after a
 * successful apply.
 */
export class AppUpdateController extends TypertRemoteService {
  static Config: Schema<Config> = Schema.object({
    applyTimeoutMs: Schema.number(),
    readTimeoutMs: Schema.number(),
  })

  private readonly locate: () => string | undefined
  private readonly readVersion: (appRoot: string) => string
  private readonly bindGit: (appRoot: string, signal: AbortSignal, timeoutMs: number) => GitRunner
  private readonly runPnpmCommand: NonNullable<AppUpdateControllerInternals['pnpm']>
  private readonly applyTimeoutMs: number
  private readonly readTimeoutMs: number

  /**
   * Register the `appUpdate` namespace; the update acts on the checkout this
   * installation lives in, resolved on each call so a moved installation is
   * reported rather than cached.
   * @param ctx - Host context.
   * @param config - deployment ceilings for the update stages.
   * @param internals - process and filesystem integrations, replaceable in tests.
   */
  constructor(ctx: Context, config: Config = {}, internals: AppUpdateControllerInternals = {}) {
    super(ctx, 'appUpdate')
    this.locate = internals.appRoot ?? (() => findAppRoot())
    this.readVersion = internals.readVersion ?? readAppVersion
    this.bindGit = internals.git ?? gitRunner
    this.runPnpmCommand = internals.pnpm ?? runPnpm
    this.applyTimeoutMs = internals.applyTimeoutMs ?? config.applyTimeoutMs ?? UPDATE_COMMAND_TIMEOUT_MS
    this.readTimeoutMs = internals.readTimeoutMs ?? config.readTimeoutMs ?? UPDATE_READ_TIMEOUT_MS
  }

  /**
   * Installed-checkout facts for the About section.
   * @returns the running version and the checkout root, or null when this
   * installation is not a checkout.
   */
  @Remote
  info(): AppUpdateInfoValue {
    const appRoot = this.locate()
    return appRoot === undefined
      ? { version: 'unknown', appRoot: null }
      : { version: this.readVersion(appRoot), appRoot }
  }

  /**
   * Check the newest release tag without touching the working tree.
   * @param signal - the caller's abort signal; cancels the fetch.
   * @returns the running version, the newest release version (null when none is
   * reachable), and whether they differ.
   * @throws RemoteError `update/not-a-checkout`, `update/git-unavailable`, or
   * `update/fetch-failed`.
   */
  @Remote
  async check(signal: AbortSignal): Promise<AppUpdateCheckValue> {
    const appRoot = this.requireCheckout()
    const runGit = this.bindGit(appRoot, signal, this.readTimeoutMs)
    try {
      // Read-only on the working tree: refs and tags only, never a pull.
      await runGit(['fetch', 'origin', '--tags', '--quiet'])
    } catch (error) {
      throw isMissingGit(error)
        ? new RemoteError('update/git-unavailable', 'git was not found on the host PATH', {}, { cause: error })
        : new RemoteError('update/fetch-failed', `git fetch failed: ${messageOf(error)}`, {}, { cause: error })
    }
    const currentVersion = this.readVersion(appRoot)
    const latestVersion = await this.latestVersion(runGit)
    return {
      currentVersion,
      latestVersion,
      updateAvailable: latestVersion !== null && latestVersion !== currentVersion,
    }
  }

  /**
   * Apply the newest release in place: fetch, detach the working tree at the
   * release tag, install dependencies, then build.
   * @param signal - the caller's abort signal; cancels the running stage.
   * @returns the release version now present in the checkout.
   * @throws RemoteError `update/not-a-checkout`, `update/git-unavailable`,
   * `update/fetch-failed`, `update/no-release-tag`, `update/checkout-failed`,
   * `update/install-failed`, or `update/build-failed`.
   */
  @Remote
  async apply(signal: AbortSignal): Promise<AppUpdateApplyValue> {
    const appRoot = this.requireCheckout()
    const runGit = this.bindGit(appRoot, signal, this.applyTimeoutMs)
    try {
      await runGit(['fetch', 'origin', '--tags', '--quiet'])
    } catch (error) {
      throw isMissingGit(error)
        ? new RemoteError('update/git-unavailable', 'git was not found on the host PATH', {}, { cause: error })
        : new RemoteError('update/fetch-failed', `git fetch failed: ${messageOf(error)}`, {}, { cause: error })
    }
    // Resolved at apply time, so a release newer than the last check is what
    // actually gets applied.
    const tag = await this.latestTag(runGit)
    if (tag === null) {
      throw new RemoteError(
        'update/no-release-tag',
        'no release tag found to apply on the remote default branch',
        {},
      )
    }
    try {
      // Detached HEAD: the checkout becomes the tagged release's source.
      await runGit(['checkout', '--detach', tag])
    } catch (error) {
      throw new RemoteError(
        'update/checkout-failed',
        `git checkout ${tag} failed: ${messageOf(error)}`,
        { tag },
        { cause: error },
      )
    }
    try {
      await this.runPnpmCommand(appRoot, ['install'], signal, this.applyTimeoutMs)
    } catch (error) {
      throw new RemoteError(
        'update/install-failed',
        `pnpm install failed: ${messageOf(error)}`,
        { tag },
        { cause: error },
      )
    }
    try {
      await this.runPnpmCommand(appRoot, ['build'], signal, this.applyTimeoutMs)
    } catch (error) {
      throw new RemoteError(
        'update/build-failed',
        `pnpm build failed: ${messageOf(error)}`,
        { tag },
        { cause: error },
      )
    }
    return { appliedVersion: normalizeVersionTag(tag) }
  }

  /** The checkout root, or the refusal a non-checkout installation produces. */
  private requireCheckout(): string {
    const appRoot = this.locate()
    if (appRoot === undefined) {
      throw new RemoteError(
        'update/not-a-checkout',
        'no pnpm-workspace.yaml/package.json found walking up from this installation',
        {},
      )
    }
    return appRoot
  }

  /** The newest release tag, or null when resolution fails for any reason. */
  private async latestTag(runGit: GitRunner): Promise<string | null> {
    try {
      return await resolveLatestReleaseTag(runGit)
    } catch {
      return null
    }
  }

  /** The newest release version, or null when no tag is reachable. */
  private async latestVersion(runGit: GitRunner): Promise<string | null> {
    const tag = await this.latestTag(runGit)
    return tag === null ? null : normalizeVersionTag(tag)
  }
}

export default AppUpdateController
