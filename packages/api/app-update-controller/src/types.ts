/**
 * Browser-safe value and failure vocabulary of the in-app updater. The failure
 * codes are the stages a caller can tell apart: a checkout that cannot be
 * updated at all, a missing git, a fetch, the release-tag checkout, the
 * dependency install, and the build.
 *
 * @module @deepseek-ai/dsh-api-app-update-controller/types
 */

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The installation is not a pnpm-workspace checkout with a `.git`. */
    'update/not-a-checkout': { readonly path?: string }
    /** The host has no `git` on PATH, so no release can be read or applied. */
    'update/git-unavailable': Record<string, never>
    /** `git fetch` failed; the message carries git's own output. */
    'update/fetch-failed': Record<string, never>
    /** No release tag is reachable from the remote's default branch. */
    'update/no-release-tag': Record<string, never>
    /** The release tag could not be checked out. */
    'update/checkout-failed': { readonly tag: string }
    /** `pnpm install` failed after the checkout. */
    'update/install-failed': { readonly tag: string }
    /** `pnpm build` failed after the install. */
    'update/build-failed': { readonly tag: string }
  }
}

/** Installed-checkout facts the About section renders without checking for updates. */
export interface AppUpdateInfoValue {
  /** Version of the running checkout's root `package.json`, or 'unknown'. */
  readonly version: string
  /** Checkout root the updater acts on, or null when the install is not a checkout. */
  readonly appRoot: string | null
}

/** One update check: the running version against the newest release tag. */
export interface AppUpdateCheckValue {
  /** Version of the running checkout. */
  readonly currentVersion: string
  /** Newest release tag's version on the remote default branch, or null when none is reachable. */
  readonly latestVersion: string | null
  /** True when a release newer than the running version is available. */
  readonly updateAvailable: boolean
}

/** Confirmation that one release was checked out, installed, and built in place. */
export interface AppUpdateApplyValue {
  /** The release version now present in the checkout. */
  readonly appliedVersion: string
}
