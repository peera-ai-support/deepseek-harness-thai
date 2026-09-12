/**
 * The Host operations the About section performs, as callbacks built in the
 * plugin body. The section receives outcomes rather than a Remote namespace,
 * so the failure codes and wire names stay in the apply world.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'

/** Installed-checkout facts the section renders without checking for updates. */
export interface AppUpdateInfo {
  /** Version of the running checkout, or 'unknown'. */
  readonly version: string
  /** Checkout root the updater acts on, or null outside a checkout. */
  readonly appRoot: string | null
}

/** What one update check answered. */
export type AppUpdateCheckOutcome =
  | { readonly kind: 'checked'; readonly currentVersion: string; readonly latestVersion: string | null; readonly updateAvailable: boolean }
  | { readonly kind: 'not-a-checkout' }
  | { readonly kind: 'refused'; readonly message: string }

/** What one applied update answered. */
export type AppUpdateApplyOutcome =
  | { readonly kind: 'applied'; readonly appliedVersion: string }
  | { readonly kind: 'refused'; readonly message: string }

/** The Host operations the About section invokes. */
export interface AppUpdateOperations {
  /** Read the installed checkout's version and root. */
  info(): Promise<AppUpdateInfo>
  /** Check the newest release without touching the working tree. */
  check(): Promise<AppUpdateCheckOutcome>
  /** Apply the newest release in place. */
  apply(): Promise<AppUpdateApplyOutcome>
}

/**
 * Bind the section's Host operations to the `appUpdate` Remote namespace.
 * @param ctx - the page plugin's context, which declares `remote.appUpdate` in its own `inject`.
 * @returns the callbacks the section is injected with.
 */
export function createAppUpdateOperations(ctx: ClientContext): AppUpdateOperations {
  return {
    info: async () => {
      const response = await ctx.remote.appUpdate.info()
      return response.ok ? response.value : { version: 'unknown', appRoot: null }
    },
    check: async () => {
      const response = await ctx.remote.appUpdate.check()
      if (response.ok) return { kind: 'checked', ...response.value }
      const { code, message } = response.error
      return code === 'update/not-a-checkout' ? { kind: 'not-a-checkout' } : { kind: 'refused', message }
    },
    apply: async () => {
      const response = await ctx.remote.appUpdate.apply()
      return response.ok
        ? { kind: 'applied', appliedVersion: response.value.appliedVersion }
        : { kind: 'refused', message: response.error.message }
    },
  }
}
